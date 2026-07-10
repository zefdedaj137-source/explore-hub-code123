/* Translate the new i18n keys into all DeepL-supported locales and merge them
 * into src/locales/<lang>.json (nested). English keys are (re)added from the
 * source list. Albanian (sq) is handled separately (DeepL has no Albanian).
 *
 * Usage:  node scripts/deepl-translate.cjs
 * Requires DEEPL_API_KEY in .env
 *
 * Preserves: leading/trailing non-letter runs (emoji, symbols, punctuation)
 * and {{interpolation}} tokens (never sent to DeepL).
 */
const fs = require("fs");
const path = require("path");

// ---- load .env (DEEPL_API_KEY) --------------------------------------------
const envPath = path.join(process.cwd(), ".env");
let DEEPL_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DEEPL_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) DEEPL_KEY = m[1].replace(/^["']|["']$/g, "");
  }
}
if (!DEEPL_KEY) {
  console.error("DEEPL_API_KEY not found in environment or .env");
  process.exit(1);
}
const DEEPL_HOST = DEEPL_KEY.trim().endsWith(":fx")
  ? "https://api-free.deepl.com"
  : "https://api.deepl.com";

// DeepL target codes for our locales
const TARGETS = {
  de: "DE",
  es: "ES",
  fr: "FR",
  it: "IT",
  nl: "NL",
  pl: "PL",
  pt: "PT-PT",
};

const LOCALES_DIR = path.join("src", "locales");
const NEW = JSON.parse(fs.readFileSync("scripts/i18n-newkeys.json", "utf8"));

// ---- helpers ---------------------------------------------------------------
// Split a string into { lead, core, trail } where lead/trail are runs of
// non-letter characters (emoji, symbols, spaces, punctuation) at the edges.
function split(str) {
  const lead = (str.match(/^[^\p{L}]*/u) || [""])[0];
  const rest = str.slice(lead.length);
  const trail = (rest.match(/[^\p{L}]*$/u) || [""])[0];
  const core = trail ? rest.slice(0, rest.length - trail.length) : rest;
  return { lead, core, trail };
}

// Protect {{tokens}} so DeepL never alters them.
function protect(text) {
  const tokens = [];
  const masked = text.replace(/\{\{.*?\}\}/g, (m) => {
    tokens.push(m);
    return `\u0001${tokens.length - 1}\u0002`;
  });
  return { masked, tokens };
}
function restore(text, tokens) {
  return text.replace(/\u0001(\d+)\u0002/g, (_, i) => tokens[Number(i)]);
}

// Skip translating things with no real words to translate.
function shouldSkip(core) {
  if (!core) return true;
  if (/^\d+$/.test(core)) return true; // pure numbers
  if (/@|https?:/i.test(core)) return true; // emails / urls
  return false;
}

async function deeplBatch(texts, targetLang) {
  const params = new URLSearchParams();
  params.append("source_lang", "EN");
  params.append("target_lang", targetLang);
  for (const t of texts) params.append("text", t);
  const res = await fetch(`${DEEPL_HOST}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) {
    throw new Error(`DeepL ${targetLang} HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.translations.map((t) => t.text);
}

function setNested(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = value;
}
function getNested(obj, keyPath) {
  return keyPath.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), obj);
}

(async () => {
  const entries = Object.entries(NEW);

  // 1) (Re)add English keys (only if missing).
  const enPath = path.join(LOCALES_DIR, "en.json");
  const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
  let enAdded = 0;
  for (const [key, val] of entries) {
    if (getNested(en, key) === undefined) {
      setNested(en, key, val);
      enAdded++;
    }
  }
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
  console.log(`en: added ${enAdded} missing keys`);

  // Pre-compute split parts for all English values.
  const parts = entries.map(([key, val]) => ({ key, val, ...split(val) }));

  // 2) Translate into each DeepL language.
  for (const [lang, target] of Object.entries(TARGETS)) {
    const p = path.join(LOCALES_DIR, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(p, "utf8"));

    // Which cores actually need DeepL (dedupe).
    const need = [];
    const idxOfCore = new Map();
    for (const it of parts) {
      if (shouldSkip(it.core)) continue;
      if (!idxOfCore.has(it.core)) {
        idxOfCore.set(it.core, need.length);
        need.push(it.core);
      }
    }

    // Mask tokens, translate in chunks of 40.
    const masked = need.map((c) => protect(c));
    const translatedCores = new Array(need.length);
    for (let i = 0; i < masked.length; i += 40) {
      const chunk = masked.slice(i, i + 40);
      const out = await deeplBatch(chunk.map((m) => m.masked), target);
      for (let j = 0; j < out.length; j++) {
        translatedCores[i + j] = restore(out[j], chunk[j].tokens);
      }
      process.stdout.write(`  ${lang}: ${Math.min(i + 40, masked.length)}/${masked.length}\r`);
    }

    // Reassemble and merge (only add/replace the new keys).
    let added = 0;
    for (const it of parts) {
      let value;
      if (shouldSkip(it.core)) {
        value = it.val; // keep English (numbers/emails/urls/emoji-only)
      } else {
        const core = translatedCores[idxOfCore.get(it.core)] ?? it.core;
        value = it.lead + core + it.trail;
      }
      setNested(data, it.key, value);
      added++;
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`\n${lang}: merged ${added} keys`);
  }

  console.log("Done. (Albanian handled separately.)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* Sync all locale files to en.json using DeepL (free tier) — NO cloud AI credits.
 *
 * en.json is the single source of truth. For every other locale this script
 * finds keys that are either MISSING or still EQUAL to the English text, and:
 *   - de/es/fr/it/nl/pl/pt  -> auto-translates them via DeepL and merges in
 *   - sq (Albanian)         -> writes the gaps to scripts/sq-todo.json for you
 *                              to translate by hand (DeepL has no Albanian),
 *                              and merges any answers from scripts/sq-todo.json
 *                              back into sq.json on the next run.
 *
 * Usage:
 *   node scripts/sync-locales.cjs           # translate + report
 *   node scripts/sync-locales.cjs --report  # only report gaps, no API calls
 *
 * Requires DEEPL_API_KEY in .env (free keys end with ":fx").
 *
 * Preserves emoji/symbols at the edges and {{interpolation}} tokens.
 */
const fs = require("fs");
const path = require("path");

const REPORT_ONLY = process.argv.includes("--report");
const LOCALES_DIR = path.join("src", "locales");

// DeepL target codes for our locales
const TARGETS = { de: "DE", es: "ES", fr: "FR", it: "IT", nl: "NL", pl: "PL", pt: "PT-PT" };
// Values that are legitimately identical to English (brand/loanwords) — never
// flagged as "untranslated". Extend this list as needed.
const ALLOW_SAME = new Set([
  "Premium", "Like", "Super Like", "Video", "Online", "Offline", "Chat",
  "Radar", "Likes", "Match", "Matches", "Story", "Filter", "Upgrade",
  "Boost", "Status", "Blog", "Support", "Admin", "GIF", "Optional",
  "km", "cm", "404", "Email", "Hindu", "Min", "(km)", "⭐ Premium",
  "{{score}}% {{label}}", "Art", "Jazz", "EDM", "Netflix", "Ramen", "Tacos",
]);

// ---- load DeepL key --------------------------------------------------------
let DEEPL_KEY = process.env.DEEPL_API_KEY;
const envPath = path.join(process.cwd(), ".env");
if (!DEEPL_KEY && fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DEEPL_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) DEEPL_KEY = m[1].replace(/^["']|["']$/g, "");
  }
}
if (!REPORT_ONLY && !DEEPL_KEY) {
  console.error("DEEPL_API_KEY not found. Use --report to only list gaps.");
  process.exit(1);
}
const DEEPL_HOST =
  DEEPL_KEY && DEEPL_KEY.trim().endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";

// ---- helpers ---------------------------------------------------------------
function flatten(obj, prefix, out) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const kp = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, kp, out);
    else out[kp] = v;
  }
  return out;
}
function getNested(obj, kp) {
  return kp.split(".").reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), obj);
}
function setNested(obj, kp, value) {
  const parts = kp.split(".");
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {};
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = value;
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}
// leading/trailing non-letter runs (emoji/symbols) kept out of translation
function split(str) {
  const lead = (str.match(/^[^\p{L}]*/u) || [""])[0];
  const rest = str.slice(lead.length);
  const trail = (rest.match(/[^\p{L}]*$/u) || [""])[0];
  const core = trail ? rest.slice(0, rest.length - trail.length) : rest;
  return { lead, core, trail };
}
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
function shouldSkip(core) {
  if (!core) return true;
  if (/^\d+$/.test(core)) return true;
  if (/@|https?:/i.test(core)) return true;
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
  if (!res.ok) throw new Error(`DeepL ${targetLang} HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()).translations.map((t) => t.text);
}

// find keys in a locale that are missing or still equal to English
function findGaps(enFlat, localeObj) {
  const gaps = [];
  for (const key of Object.keys(enFlat)) {
    const ev = enFlat[key];
    if (typeof ev !== "string") continue;
    const lv = getNested(localeObj, key);
    if (lv === undefined) gaps.push(key);
    else if (lv === ev && !ALLOW_SAME.has(ev)) gaps.push(key);
  }
  return gaps;
}

(async () => {
  const en = readJson(path.join(LOCALES_DIR, "en.json"));
  const enFlat = flatten(en, "", {});

  // ---- Albanian: manual, via scripts/sq-todo.json ----
  const sqPath = path.join(LOCALES_DIR, "sq.json");
  const sq = readJson(sqPath);
  const todoPath = path.join("scripts", "sq-todo.json");
  // merge any completed answers back in first
  if (fs.existsSync(todoPath)) {
    const todo = readJson(todoPath);
    let merged = 0;
    for (const [k, v] of Object.entries(todo)) {
      if (typeof v === "string" && v.trim() && v !== enFlat[k]) {
        setNested(sq, k, v);
        merged++;
      }
    }
    if (merged && !REPORT_ONLY) {
      writeJson(sqPath, sq);
      console.log(`sq: merged ${merged} manual translations from sq-todo.json`);
    }
  }
  const sqGaps = findGaps(enFlat, sq);
  if (sqGaps.length) {
    const todoOut = {};
    for (const k of sqGaps) todoOut[k] = enFlat[k]; // English placeholder to translate
    if (!REPORT_ONLY) writeJson(todoPath, todoOut);
    console.log(
      `sq: ${sqGaps.length} keys need Albanian -> ${REPORT_ONLY ? "(report only)" : "scripts/sq-todo.json (translate the values, rerun)"}`
    );
  } else {
    console.log("sq: fully translated ✓");
    if (fs.existsSync(todoPath) && !REPORT_ONLY) fs.rmSync(todoPath);
  }

  // ---- DeepL languages ----
  for (const [lang, target] of Object.entries(TARGETS)) {
    const p = path.join(LOCALES_DIR, `${lang}.json`);
    const data = readJson(p);
    const gaps = findGaps(enFlat, data);
    if (!gaps.length) {
      console.log(`${lang}: fully translated ✓`);
      continue;
    }
    if (REPORT_ONLY) {
      console.log(`${lang}: ${gaps.length} keys need translation`);
      continue;
    }

    // dedupe cores that actually need DeepL
    const items = gaps.map((key) => ({ key, val: enFlat[key], ...split(enFlat[key]) }));
    const need = [];
    const idxOfCore = new Map();
    for (const it of items) {
      if (shouldSkip(it.core)) continue;
      if (!idxOfCore.has(it.core)) {
        idxOfCore.set(it.core, need.length);
        need.push(it.core);
      }
    }
    const masked = need.map((c) => protect(c));
    const out = new Array(need.length);
    for (let i = 0; i < masked.length; i += 40) {
      const chunk = masked.slice(i, i + 40);
      const res = await deeplBatch(chunk.map((m) => m.masked), target);
      for (let j = 0; j < res.length; j++) out[i + j] = restore(res[j], chunk[j].tokens);
      process.stdout.write(`  ${lang}: ${Math.min(i + 40, masked.length)}/${masked.length}\r`);
    }
    for (const it of items) {
      const value = shouldSkip(it.core)
        ? it.val
        : it.lead + (out[idxOfCore.get(it.core)] ?? it.core) + it.trail;
      setNested(data, it.key, value);
    }
    writeJson(p, data);
    console.log(`\n${lang}: translated ${gaps.length} keys ✓`);
  }

  console.log("\nDone. English is the source; rerun this after adding new en.json keys.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

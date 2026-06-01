/**
 * auto-translate.cjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads src/locales/en.json and auto-translates any missing keys into every
 * language listed in LANGUAGES below.
 *
 * Setup:
 *   1. Get a FREE DeepL API key at https://www.deepl.com/pro#developer
 *      (Free tier = 500,000 characters/month — more than enough)
 *   2. Add  DEEPL_API_KEY=your_key  to your .env file
 *   3. Run:  npm run translate
 *
 * Notes:
 *   - Albanian (sq) is not supported by DeepL, so it uses MyMemory (free, no key).
 *   - Already-translated keys are NEVER overwritten — safe to re-run any time.
 *   - Add more languages to LANGUAGES array to include them automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ── Loanwords (must never be translated) ─────────────────────────────────────
// EXACT-MATCH: if the entire source value equals one of these, skip translation.
const LOANWORDS = new Set([
  // Chat
  "Chat", "chat", "Chats",
  // Match / dating connection
  "Match", "match", "Matches", "matches",
  "New Match", "New Matches", "new match", "new matches",
  // Like / Superlike
  "Like", "like", "Likes", "likes",
  "Superlike", "superlike", "Super Like", "super like",
  "Superlikes", "superlikes",
  // Other dating-app loanwords
  "Swipe", "swipe", "Swipes", "swipes",
  "Story", "story", "Stories",
  "Boost", "boost",
  "Feed", "feed",
  "Radar", "radar",
  "Bio", "bio",
  "Online", "online",
  "App", "app",
  "Profile", "profile",
  "Premium",
  "Filter",
]);

// INLINE: these words inside LONGER strings must survive translation unchanged.
// Sorted longest-first so partial matches don't break longer ones.
// DeepL will receive <x>Word</x> and preserve it via tag_handling=xml.
const INLINE_LOANWORDS = [
  "Superlike",
  "Super Like",
  "Superlikes",
  "Super Likes",
  "superlike",
  "superlikes",
  "Boost",
  "boost",
];

/** Replace inline loanwords with <x> tags before sending to DeepL */
function protectLoanwords(text) {
  let out = text;
  // Escape XML special chars first so DeepL doesn't choke
  // (these are not translated anyway, just preserved)
  INLINE_LOANWORDS.forEach((word) => {
    if (out.includes(word)) {
      // Use word-boundary-safe replacement to avoid partial matches
      out = out.split(word).join(`<x>${word}</x>`);
    }
  });
  return out;
}

/** Strip <x> tags after DeepL returns the translation */
function restoreLoanwords(text) {
  return text.replace(/<x>(.*?)<\/x>/g, "$1");
}

// ── Config ────────────────────────────────────────────────────────────────────

// Load .env manually (no dotenv dependency needed)
const envFile = path.join(__dirname, "../.env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8")
    .replace(/^\uFEFF/, "")       // strip BOM
    .replace(/\r\n/g, "\n")       // CRLF → LF
    .replace(/\r/g, "\n")         // lone CR → LF
    .split("\n")
    .forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("#")) return;
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = val;
    });
}

const DEEPL_KEY  = process.env.DEEPL_API_KEY || "";
const LOCALES    = path.join(__dirname, "../src/locales");
const SOURCE     = path.join(LOCALES, "en.json");

/**
 * Add or remove languages here.
 * deepl: DeepL target-language code, or null if DeepL doesn't support it.
 * DeepL codes: https://developers.deepl.com/docs/getting-started/supported-languages
 */
const LANGUAGES = [
  { code: "sq", deepl: null,    label: "Albanian"    }, // → MyMemory fallback
  { code: "de", deepl: "DE",    label: "German"      },
  { code: "fr", deepl: "FR",    label: "French"      },
  { code: "it", deepl: "IT",    label: "Italian"     },
  { code: "es", deepl: "ES",    label: "Spanish"     },
  { code: "pt", deepl: "PT-BR", label: "Portuguese"  },
  { code: "nl", deepl: "NL",    label: "Dutch"       },
  { code: "pl", deepl: "PL",    label: "Polish"      },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flatten nested JSON: { a: { b: "x" } } → { "a.b": "x" } */
function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

/** Write a value into a nested object by dot-path key */
function setNested(obj, dotKey, value) {
  const parts = dotKey.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** HTTPS helper (returns parsed JSON) */
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Bad JSON response: ${data.slice(0, 200)}`)); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Translation engines ───────────────────────────────────────────────────────

/** DeepL free API — up to 50 texts per request, batches automatically */
async function translateDeepL(texts, targetCode) {
  if (!DEEPL_KEY) {
    throw new Error(
      "DEEPL_API_KEY is not set.\n" +
      "  1. Get a free key at https://www.deepl.com/pro#developer\n" +
      "  2. Add  DEEPL_API_KEY=your_key  to your .env file"
    );
  }

  const BATCH = 50;
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const params = new URLSearchParams();
    params.append("target_lang", targetCode);
    params.append("preserve_formatting", "1");
    params.append("tag_handling", "xml");
    params.append("ignore_tags", "x");
    batch.forEach((t) => params.append("text", t));

    const body = params.toString();
    const res = await httpRequest(
      {
        hostname: "api-free.deepl.com",
        path: "/v2/translate",
        method: "POST",
        headers: {
          "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      body
    );

    if (res.message) throw new Error(`DeepL: ${res.message}`);
    results.push(...res.translations.map((t) => t.text));

    if (i + BATCH < texts.length) await sleep(300);
    process.stdout.write(`  ${Math.min(i + BATCH, texts.length)}/${texts.length} translated...\r`);
  }

  return results;
}

/** MyMemory free API — no key needed, supports Albanian */
async function translateMyMemory(text, targetCode) {
  const encoded = encodeURIComponent(text);
  const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${targetCode}`;

  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.responseData?.translatedText ?? text);
          } catch {
            resolve(text);
          }
        });
      })
      .on("error", () => resolve(text));
  });
}

/** Route to the right engine depending on language config */
async function translateBatch(texts, lang) {
  // Pre-process: mark exact loanwords so they pass through unchanged
  const isLoanword = texts.map((t) => LOANWORDS.has(t.trim()));

  // Protect inline loanwords inside longer strings with <x> XML tags (DeepL-native)
  const textsToSend = texts.map((t, i) =>
    isLoanword[i] ? t : protectLoanwords(t)
  );

  let rawResults;
  if (lang.deepl && DEEPL_KEY) {
    // Only send non-loanword texts to DeepL
    const indicesToTranslate = texts.map((_, i) => i).filter((i) => !isLoanword[i]);
    const textsForDeepL = indicesToTranslate.map((i) => textsToSend[i]);

    let deeplResults = textsForDeepL.length > 0
      ? await translateDeepL(textsForDeepL, lang.deepl)
      : [];

    rawResults = texts.map((t, i) => {
      if (isLoanword[i]) return t;
      const idx = indicesToTranslate.indexOf(i);
      const translated = deeplResults[idx] ?? textsToSend[i];
      // Strip any remaining <x> tags (DeepL preserves them, we strip after)
      return restoreLoanwords(translated);
    });
  } else {
    if (lang.deepl && !DEEPL_KEY) {
      console.warn(`  ⚠ No DEEPL_API_KEY — falling back to MyMemory for ${lang.label}`);
    }
    rawResults = [];
    for (let i = 0; i < texts.length; i++) {
      if (isLoanword[i]) {
        rawResults.push(texts[i]);
      } else {
        // MyMemory doesn't support XML tags — strip them and accept plain text
        const plainText = texts[i]; // don't protect for MyMemory
        const translated = await translateMyMemory(plainText, lang.code);
        rawResults.push(translated);
        if (i % 30 === 29) await sleep(1000);
        if (i % 100 === 99)
          process.stdout.write(`  ${i + 1}/${texts.length} translated...\r`);
      }
    }
  }

  return rawResults;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌍  Auto-translate — en.json → target languages\n");

  const source     = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const sourceFlat = flatten(source);
  const allKeys    = Object.keys(sourceFlat);
  const allValues  = allKeys.map((k) => sourceFlat[k]);

  console.log(`Source: ${allKeys.length} keys in en.json\n`);

  for (const lang of LANGUAGES) {
    console.log(`▶  ${lang.label} (${lang.code})`);

    const targetFile = path.join(LOCALES, `${lang.code}.json`);
    const existing   = fs.existsSync(targetFile)
      ? JSON.parse(fs.readFileSync(targetFile, "utf8"))
      : {};
    const existFlat = flatten(existing);

    // Find keys missing or still identical to English (not yet translated)
    const missing = allKeys
      .map((k, i) => ({ k, i }))
      .filter(({ k }) => !existFlat[k] || existFlat[k] === sourceFlat[k]);

    if (missing.length === 0) {
      console.log("  ✓ Already complete — nothing to do\n");
      continue;
    }

    console.log(`  ${missing.length} keys need translation`);

    const textsToTranslate = missing.map(({ i }) => allValues[i]);
    let translated;

    try {
      translated = await translateBatch(textsToTranslate, lang);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
      continue;
    }

    // Merge translated keys into existing object (deep)
    const merged = JSON.parse(JSON.stringify(existing));
    for (let i = 0; i < missing.length; i++) {
      setNested(merged, missing[i].k, translated[i]);
    }

    fs.writeFileSync(targetFile, JSON.stringify(merged, null, 2) + "\n", "utf8");
    console.log(`  ✓ Saved ${lang.code}.json  (+${missing.length} keys)\n`);
  }

  console.log("✅  All done!");
}

main().catch((err) => {
  console.error("\n❌ ", err.message || err);
  process.exit(1);
});

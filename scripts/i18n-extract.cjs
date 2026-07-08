/* eslint-disable */
// AST-based i18n extractor + codemod.
// - Finds user-visible hardcoded strings (JSX text, title/placeholder/aria-label/alt/label attrs, toast.* calls)
// - Maps each to an existing en.json key when the exact text already exists; otherwise mints a new key
// - Rewrites source files (only those that already use useTranslation, so `t` is in scope)
// Usage:
//   node scripts/i18n-extract.cjs           # DRY RUN: writes scripts/i18n-report.json, no file changes
//   node scripts/i18n-extract.cjs --apply   # apply edits + write new keys into en.json
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverseMod = require("@babel/traverse");
const traverse = traverseMod.default || traverseMod;

const APPLY = process.argv.includes("--apply");
const SRC = "src";
const EN_PATH = path.join(SRC, "locales", "en.json");

const ATTR_NAMES = new Set(["title", "placeholder", "aria-label", "alt", "label"]);
const TOAST_METHODS = new Set(["success", "error", "info", "warning", "loading", "message"]);
// Brand/proper nouns and non-translatable tokens to skip.
const SKIP = new Set([
  "Shqiponja", "Instagram", "Facebook", "Twitter", "Twitter / X", "TikTok",
  "GIF", "GIFs", "EDM", "Netflix", "Spotify", "YouTube", "WhatsApp", "Apple",
  "Google", "iOS", "Android", "Promise", "OK", "km", "AM", "PM",
]);

// Only these files (already use useTranslation) are safe to auto-edit.
// We detect this per-file at runtime.

function flatten(obj, prefix, out) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const np = prefix ? prefix + "." + k : k;
    if (typeof v === "string") {
      const key = v.toLowerCase();
      if (!(key in out)) out[key] = np;
    } else if (v && typeof v === "object") flatten(v, np, out);
  }
}

const en = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
const valueToKey = {};
flatten(en, "", valueToKey);

function walkFiles(dir, acc) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      if (f === "ui" || f === "test" || f === "__tests__") continue;
      walkFiles(fp, acc);
    } else if (f.endsWith(".tsx") && !f.includes(".spec.") && !f.includes(".test.")) {
      acc.push(fp);
    }
  }
  return acc;
}

function hasLetters(s) {
  return /[A-Za-z]/.test(s);
}
function isMeaningful(s) {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!hasLetters(t)) return false;
  if (SKIP.has(t)) return false;
  // skip single all-caps tokens (likely acronyms/vars)
  if (/^[A-Z0-9]{1,4}$/.test(t)) return false;
  // skip if it looks like code (has =>, {}, ;, or backticks) -- JSXText shouldn't, but be safe
  if (/[{};`]/.test(t)) return false;
  return true;
}

// camelCase key from text
function slug(text) {
  const words = text
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "and")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 6);
  if (words.length === 0) return "text";
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

const report = {};
const newKeys = {}; // key -> english text
const perFileEdits = {};

for (const file of walkFiles(SRC, [])) {
  const code = fs.readFileSync(file, "utf8");
  const usesT = /useTranslation\s*\(/.test(code);
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      ranges: true,
    });
  } catch (e) {
    report[file] = [{ error: String(e.message) }];
    continue;
  }

  const rel = file.replace(/\\/g, "/");
  const nsBase = path.basename(file, ".tsx");
  const ns = nsBase.charAt(0).toLowerCase() + nsBase.slice(1);
  const edits = [];
  const entries = [];

  traverse(ast, {
    JSXText(p) {
      const raw = p.node.value;
      const trimmed = raw.trim();
      if (!isMeaningful(trimmed)) return;
      const leading = raw.length - raw.trimStart().length;
      const trailing = raw.length - raw.trimEnd().length;
      const start = p.node.start + leading;
      const end = p.node.end - trailing;
      record(trimmed, "jsx", start, end, true);
    },
    JSXAttribute(p) {
      const name = p.node.name && p.node.name.name;
      if (!ATTR_NAMES.has(name)) return;
      const v = p.node.value;
      if (!v || v.type !== "StringLiteral") return;
      if (!isMeaningful(v.value)) return;
      record(v.value, name, v.start, v.end, false);
    },
    CallExpression(p) {
      const callee = p.node.callee;
      if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        callee.object.name === "toast" &&
        callee.property.type === "Identifier" &&
        TOAST_METHODS.has(callee.property.name)
      ) {
        const arg = p.node.arguments[0];
        if (arg && arg.type === "StringLiteral" && isMeaningful(arg.value)) {
          record(arg.value, "toast", arg.start, arg.end, false);
        }
      }
    },
  });

  function record(text, kind, start, end, isJsx) {
    const clean = text.replace(/\s+/g, " ").trim();
    let key = valueToKey[clean.toLowerCase()];
    let isNew = false;
    if (!key) {
      key = ns + "." + slug(clean);
      // ensure uniqueness / stable
      newKeys[key] = clean;
      valueToKey[clean.toLowerCase()] = key;
      isNew = true;
    }
    const replacement = isJsx ? `{t("${key}")}` : `{t("${key}")}`;
    // for non-jsx (attribute/toast): attribute needs {t(...)}, toast needs t(...)
    const rep = kind === "toast" ? `t("${key}")` : replacement;
    edits.push({ start, end, rep, key, text: clean, kind, isNew });
    entries.push({ line: null, kind, text: clean, key, isNew });
  }

  if (edits.length) {
    report[rel] = { usesT, count: edits.length, entries };
    if (usesT) perFileEdits[file] = { code, edits };
    else report[rel].skippedNoT = true;
  }
}

if (!APPLY) {
  fs.writeFileSync("scripts/i18n-report.json", JSON.stringify(report, null, 1));
  const files = Object.keys(report).length;
  let total = 0, editable = 0, noT = 0, newCount = Object.keys(newKeys).length;
  for (const r of Object.values(report)) {
    if (r.count) { total += r.count; if (r.skippedNoT) noT += r.count; else editable += r.count; }
  }
  console.log(`DRY RUN — files:${files} strings:${total} editable:${editable} skippedNoT:${noT} newKeys:${newCount}`);
  console.log("New keys needing translation:");
  Object.entries(newKeys).slice(0, 500).forEach(([k, v]) => console.log("  " + k + " = " + JSON.stringify(v)));
  const noTfiles = Object.entries(report).filter(([, r]) => r.skippedNoT).map(([f]) => f);
  if (noTfiles.length) console.log("Files without useTranslation (skipped):\n  " + noTfiles.join("\n  "));
  process.exit(0);
}

// APPLY
let editedFiles = 0, appliedEdits = 0;
for (const [file, { code, edits }] of Object.entries(perFileEdits)) {
  // apply desc by start, guard against overlaps
  const sorted = edits.slice().sort((a, b) => b.start - a.start);
  let out = code;
  let lastStart = Infinity;
  for (const e of sorted) {
    if (e.end > lastStart) continue; // overlap guard
    out = out.slice(0, e.start) + e.rep + out.slice(e.end);
    lastStart = e.start;
    appliedEdits++;
  }
  fs.writeFileSync(file, out);
  editedFiles++;
}

// merge new keys into en.json (namespaced)
function setKey(obj, dotted, val) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) cur[leaf] = val;
}
for (const [k, v] of Object.entries(newKeys)) setKey(en, k, v);
fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + "\n");
fs.writeFileSync("scripts/i18n-newkeys.json", JSON.stringify(newKeys, null, 2));
console.log(`APPLIED — files:${editedFiles} edits:${appliedEdits} newKeys:${Object.keys(newKeys).length}`);
console.log("New keys written to en.json; list saved to scripts/i18n-newkeys.json");

/* Comprehensive hardcoded user-facing string scanner.
 * Reports JSX text, common attributes (title/placeholder/aria-label/alt/label),
 * and toast.*() messages that are NOT wrapped in t(). */
const fs = require("fs");
const path = require("path");

const srcDir = "src";
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory() && f !== "ui" && f !== "test") walk(fp);
    else if (f.endsWith(".tsx") && !f.includes(".spec") && !f.includes(".test")) files.push(fp);
  }
}
walk(srcDir);

// Heuristic: a string is "user-facing" if it has a letter, a space or >3 chars,
// and is not obviously code (no {, <, =, /, or all-lowercase-identifier).
function looksHuman(s) {
  const t = s.trim();
  if (t.length < 3) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^[a-z0-9_.-]+$/.test(t)) return false; // identifier / css / key
  if (/^https?:|^\/|^#|^\.|^@/.test(t)) return false;
  if (/^[A-Z_]+$/.test(t)) return false; // CONST
  if (/[{}<>]/.test(t)) return false;
  return /[A-Za-z]{2,}/.test(t) && / |[.!?,'a-z][A-Z]|[A-Z][a-z]/.test(t);
}

const results = {};
let total = 0;
for (const fp of files) {
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split("\n");
  const matches = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    // 1) JSX text nodes: >Some Text<
    for (const m of line.matchAll(/>\s*([A-Za-z][^<>{}]*?[A-Za-z.!?'")])\s*</g)) {
      const txt = m[1].trim();
      if (looksHuman(txt) && !line.includes("t(")) matches.push({ line: i + 1, text: txt, kind: "jsx" });
    }
    // 2) attributes that render to users
    for (const m of line.matchAll(/\b(title|placeholder|aria-label|alt|label)\s*=\s*"([^"]{3,})"/g)) {
      const txt = m[2].trim();
      if (looksHuman(txt)) matches.push({ line: i + 1, text: txt, kind: m[1] });
    }
    // 3) toast messages
    for (const m of line.matchAll(/toast\.(success|error|info|warning|loading)?\s*\(\s*"([^"]{3,})"/g)) {
      const txt = m[2].trim();
      if (looksHuman(txt)) matches.push({ line: i + 1, text: txt, kind: "toast" });
    }
  });
  if (matches.length) {
    results[fp.replace(/\\/g, "/")] = matches;
    total += matches.length;
  }
}

const summary = Object.entries(results)
  .map(([f, m]) => [f, m.length])
  .sort((a, b) => b[1] - a[1]);
console.log("TOTAL:", total, "across", summary.length, "files\n");
summary.forEach(([f, n]) => console.log(String(n).padStart(4), f));
if (process.argv[2] === "--json") fs.writeFileSync("hardcoded-v2.json", JSON.stringify(results, null, 2));

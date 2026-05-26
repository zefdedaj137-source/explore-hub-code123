/**
 * Scan all source files for remaining hardcoded strings:
 * - JSX text nodes
 * - placeholder="..." attributes
 * - aria-label="..." attributes
 * - toast("...") calls with plain strings
 */
const fs = require('fs');
const path = require('path');

const SRC_DIRS = ['src/pages', 'src/components'];
const SKIP_DIRS = ['ui', 'test'];
const SKIP_FILES = ['ErrorBoundary.tsx', 'Footer.tsx'];
const BRAND = ['Shqiponja'];
const ALREADY_TRANSLATED = /t\(["`']/;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) {
      if (!SKIP_DIRS.some(s => f.includes(s))) walk(fp, files);
    } else if (f.endsWith('.tsx') && !SKIP_FILES.includes(f)) {
      files.push(fp);
    }
  }
  return files;
}

const results = {};

for (const dir of SRC_DIRS) {
  for (const fp of walk(dir)) {
    const content = fs.readFileSync(fp, 'utf8');
    const lines = content.split('\n');
    const hits = [];

    lines.forEach((line, i) => {
      if (ALREADY_TRANSLATED.test(line)) return; // skip lines with t("
      if (line.trim().startsWith('//')) return;
      const lineNum = i + 1;

      // JSX text nodes: >TEXT< 
      const textMatches = [...line.matchAll(/>([A-Z][a-zA-Z ',!?.:()\/\-]{3,80})</g)];
      for (const m of textMatches) {
        const txt = m[1].trim();
        if (!BRAND.includes(txt) && !txt.includes('{') && !txt.startsWith('//')) {
          hits.push({ line: lineNum, type: 'jsx', text: txt });
        }
      }

      // placeholder="TEXT"
      const placeholders = [...line.matchAll(/placeholder="([A-Za-z][^"]{3,80})"/g)];
      for (const m of placeholders) {
        hits.push({ line: lineNum, type: 'placeholder', text: m[1] });
      }

      // aria-label="TEXT"
      const ariaLabels = [...line.matchAll(/aria-label="([A-Za-z][^"]{2,80})"/g)];
      for (const m of ariaLabels) {
        hits.push({ line: lineNum, type: 'aria', text: m[1] });
      }

      // toast direct strings: toast.X("TEXT") or toast("TEXT")
      const toastMatches = [...line.matchAll(/toast(?:\.[a-z]+)?\(["'`]([A-Za-z][^"'`]{3,120})["'`]\)/g)];
      for (const m of toastMatches) {
        hits.push({ line: lineNum, type: 'toast', text: m[1] });
      }
    });

    if (hits.length > 0) {
      results[path.basename(fp)] = hits;
    }
  }
}

console.log(JSON.stringify(results, null, 2));

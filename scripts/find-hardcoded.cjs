const fs = require('fs');
const path = require('path');

const srcDir = 'src';
const files = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory() && f !== 'ui' && f !== 'test') walk(fp);
    else if (f.endsWith('.tsx') && !f.includes('.spec') && !f.includes('.test')) files.push(fp);
  }
}
walk(srcDir);

const pattern = />([A-Z][a-zA-Z ',!?.:()/-]{4,80})</g;
const results = {};
for (const fp of files) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split('\n');
  const matches = [];
  lines.forEach((line, i) => {
    if (line.includes('t("') || line.includes("t('")) return;
    const m = [...line.matchAll(pattern)];
    m.forEach(match => {
      const txt = match[1].trim();
      if (txt.length > 4 && !txt.startsWith('//') && !txt.includes('{')) {
        matches.push({ line: i+1, text: txt });
      }
    });
  });
  if (matches.length > 0) results[path.basename(fp)] = matches;
}
console.log(JSON.stringify(results, null, 2));

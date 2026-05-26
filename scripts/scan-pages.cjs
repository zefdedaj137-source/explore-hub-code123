const fs = require('fs'), path = require('path');
const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
const results = {};
for (const f of files) {
  const c = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const matches = [];
  const lines = c.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import')) continue;
    if (line.includes('t("') || line.includes("t('")) continue;
    // Look for English text in JSX elements
    const m = line.match(/>\s*([A-Z][a-z][a-zA-Z ,&!?'\-:]{3,50})\s*</);
    if (m && !m[1].includes('{') && !m[1].match(/^(Shqiponja|Premium|svg|Canvas)/)) {
      matches.push(m[1].trim());
    }
  }
  const unique = [...new Set(matches)];
  if (unique.length > 0) results[f] = unique.slice(0, 8);
}
Object.entries(results).forEach(([f, ms]) => {
  console.log(f + ':');
  ms.forEach(m => console.log('  - ' + m));
});

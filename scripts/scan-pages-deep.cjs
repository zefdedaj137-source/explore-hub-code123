const fs = require('fs'), path = require('path');
const pagesDir = 'src/pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
const results = {};

for (const f of files) {
  const c = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const matches = [];
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import')) continue;
    if (trimmed.startsWith('/*') || trimmed.startsWith('{/*')) continue;

    // 1. Toast messages
    const toastM = line.match(/toast\.(success|error|info|warning)\("([^"]{5,60})"/);
    if (toastM && !toastM[2].includes('t(')) matches.push('[toast] ' + toastM[2]);

    // 2. Placeholders
    const phM = line.match(/placeholder="([^"t{][^"]{3,50})"/);
    if (phM && !phM[1].startsWith('t(')) matches.push('[placeholder] ' + phM[1]);

    // 3. JSX text content between tags (no t() call, English-looking)
    const jsxM = line.match(/>\s*([A-Z][a-z][a-zA-Z ,&!?'\-:]{4,60})\s*</);
    if (jsxM && !jsxM[1].includes('{') && !line.includes('t("') && !line.includes("t('")) {
      const str = jsxM[1].trim();
      if (!str.match(/^(Shqiponja|Premium|svg|Canvas|className|null|undefined)/)) {
        matches.push('[jsx] ' + str);
      }
    }

    // 4. title= and aria-label= (English, not using t())
    const titleM = line.match(/(?:title|aria-label)="([A-Z][a-z][^"]{3,50})"/);
    if (titleM && !line.includes('t("') && !line.includes("{t(")) matches.push('[attr] ' + titleM[1]);

    // 5. String assignments that look like UI labels (description, label keys)
    const strM = line.match(/(?:description|label|title|message):\s*"([A-Z][^"]{5,60})"/);
    if (strM && !strM[1].includes('t(')) matches.push('[prop] ' + strM[1]);
  }
  const unique = [...new Set(matches)];
  if (unique.length > 0) results[f] = unique.slice(0, 12);
}
Object.entries(results).forEach(([f, ms]) => {
  console.log('\n' + f + ':');
  ms.forEach(m => console.log('  - ' + m));
});

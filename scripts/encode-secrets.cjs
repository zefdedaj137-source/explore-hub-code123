// encode-secrets.cjs
// Run: node scripts/encode-secrets.cjs
// Encodes files needed for GitHub Actions secrets

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Usage: node scripts/encode-secrets.cjs <file>

Examples:
  node scripts/encode-secrets.cjs ~/Downloads/AuthKey_XXXXXXXXXX.p8
  node scripts/encode-secrets.cjs ~/Downloads/build_certificate.p12
  node scripts/encode-secrets.cjs ~/Downloads/shqiponja_appstore.mobileprovision
`);
  process.exit(0);
}

const filePath = args[0].replace(/^~/, process.env.USERPROFILE || process.env.HOME);
const resolved = path.resolve(filePath);

if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const base64 = fs.readFileSync(resolved).toString("base64");
console.log("\n=== BASE64 OUTPUT (copy everything between the lines) ===\n");
console.log(base64);
console.log("\n=== END ===\n");
console.log(`File: ${path.basename(resolved)}`);
console.log(`Size: ${fs.statSync(resolved).size} bytes`);

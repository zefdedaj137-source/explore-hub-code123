// generate-ios-cert.cjs
// Generates a private key + CSR to upload to Apple Developer
// Run: node scripts/generate-ios-cert.cjs

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OPENSSL = "C:\\Program Files\\Git\\usr\\bin\\openssl.exe";
const OUT_DIR = path.join(process.env.USERPROFILE, "Downloads", "shqiponja-certs");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const keyPath = path.join(OUT_DIR, "ios_distribution.key");
const csrPath = path.join(OUT_DIR, "ios_distribution.csr");

console.log("Generating private key...");
execSync(`"${OPENSSL}" genrsa -out "${keyPath}" 2048`);

console.log("Generating Certificate Signing Request (CSR)...");
execSync(
  `"${OPENSSL}" req -new -key "${keyPath}" -out "${csrPath}" ` +
  `-subj "/C=AL/ST=Albania/L=Tirana/O=Shqiponja/CN=Shqiponjat Distribution"`
);

console.log(`
✅ Done! Files saved to: ${OUT_DIR}

NEXT STEPS:
1. Go to https://developer.apple.com/account/resources/certificates/add
2. Select "iOS Distribution (App Store and Ad Hoc)"
3. Click Continue
4. Upload the CSR file: ${csrPath}
5. Download the resulting .cer file to: ${OUT_DIR}
6. Then run: node scripts/generate-ios-cert.cjs --combine
`);

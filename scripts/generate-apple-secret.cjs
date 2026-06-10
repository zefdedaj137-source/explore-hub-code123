/**
 * Generate the Apple Sign In client secret JWT required by Supabase.
 *
 * Fill in the four constants below, then run:
 *   node scripts/generate-apple-secret.cjs
 *
 * Paste the printed JWT into the Supabase Dashboard:
 *   Authentication → Providers → Apple → Secret Key
 *
 * The JWT is valid for 180 days. Regenerate and update Supabase before it expires.
 */

const crypto = require("crypto");

// ── Fill these in ──────────────────────────────────────────────────────────────
const TEAM_ID   = "MF75P7SSGZ";      // 10-char Team ID (top-right of developer.apple.com)
const KEY_ID    = "43PPMP4M6H";      // 10-char Key ID from the key you downloaded
const CLIENT_ID = "com.shqiponja.web"; // Services ID (the OAuth client identifier)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgAx76SFtNf2tePJ2K
aZjH+RcNk/TLM6/WVihz/rZKZNCgCgYIKoZIzj0DAQehRANCAAQGFnRQuGqOLMr+
qUJK3ENHcP/QBEAXsHgqrnXRPKRkK/yJVPJaEkNhteSI9qPmCBSOfPKO8RjwFspK
rBt+8m9+
-----END PRIVATE KEY-----`;
// ──────────────────────────────────────────────────────────────────────────────

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // 180 days

const header  = { alg: "ES256", kid: KEY_ID };
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: "https://appleid.apple.com",
  sub: CLIENT_ID,
};

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const signingInput = `${base64url(header)}.${base64url(payload)}`;

const sign = crypto.createSign("SHA256");
sign.update(signingInput);
sign.end();

const sigBuf = sign.sign({ key: PRIVATE_KEY, dsaEncoding: "ieee-p1363" });
const sigB64 = sigBuf.toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

const jwt = `${signingInput}.${sigB64}`;

console.log("\n=== Apple Client Secret JWT ===\n");
console.log(jwt);
console.log("\n=== Copy the above into Supabase: Authentication → Providers → Apple → Secret Key ===");
console.log(`\nExpires: ${new Date(exp * 1000).toISOString()} (180 days from now)`);

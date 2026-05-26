// translate-remaining-pages.cjs
// Translates remaining English strings in Discover.tsx, EditProfile.tsx, Auth.tsx,
// WhoLikedYou.tsx, MatchInsights.tsx, Settings.tsx into Albanian via t() calls.
// Also adds missing locale keys to sq.json and en.json.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SQ = path.join(ROOT, "src/locales/sq.json");
const EN = path.join(ROOT, "src/locales/en.json");

// ─── 1. Update locale files ──────────────────────────────────────────────────

function addKeys(filePath, newKeys) {
  let raw = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const obj = JSON.parse(raw);

  for (const [dotPath, value] of Object.entries(newKeys)) {
    const parts = dotPath.split(".");
    let cursor = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cursor[parts[i]]) cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    if (cursor[leaf] === undefined) {
      cursor[leaf] = value;
      console.log(`  + added ${dotPath}`);
    } else {
      console.log(`  ~ exists ${dotPath}`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

console.log("\n[SQ] Adding missing keys...");
addKeys(SQ, {
  // discover
  "discover.comeBackLater": "Kthehu më vonë për të parë njerëz të tjerë",
  "discover.perRose": "Për trëndafil",
  "discover.sendMsgFirst": "Dërgo mesazh pa u çiftuar së pari!",
  "discover.freshToday": "Të reja sot",
  "discover.noPicks": "Nuk ka zgjedhje sot",
  "discover.keepEditing": "Vazhdo redaktimin",
  "discover.discard": "Hidhe poshtë",
  "discover.roses": "Trëndafilat",
  "discover.noBoosterDesc": "Nuk ka Stimulues Aktivë në zonën tënde",
  // common
  "common.online": "Online",
  // whoLikedYou
  "whoLikedYou.theyLikedYou": "Të ka pëlqyer!",
  "whoLikedYou.upgradeToSee": "Përmirëso llogarinë për të parë profilin e tyre të plotë",
  // wallet
  "wallet.title": "Portofoli",
  // matchInsights
  "matchInsights.noSharedInterests": "Nuk ka interesa të përbashkëta akoma",
  // auth
  "auth.resetLinkDesc": "Shkruani emailin tuaj dhe ne do t'ju dërgojmë një link rivendosjeje",
  // settings — remaining
  "settings.cancelPremiumConfirmDesc":
    "A jeni i sigurt që dëshironi të anuloni anëtarësimin tuaj premium? Do të humbni aksesin:",
  "settings.deactivateAccount": "Çaktivizo llogarinë",
  "settings.deactivateDesc":
    "Profili juaj do të fshihet menjëherë. Pas periudhës së zgjedhur, llogaria juaj dhe të gjitha të dhënat do të fshihen përgjithmonë nëse nuk identifikoheni sërish.",
  "settings.deactivateFor": "Çaktivizo për {{days}} ditë",
  "settings.updating": "Duke përditësuar...",
  "settings.updatePassword": "Përditëso fjalëkalimin",
});

console.log("\n[EN] Adding missing keys...");
addKeys(EN, {
  "discover.comeBackLater": "Come back later to see more people",
  "discover.perRose": "Per rose",
  "discover.sendMsgFirst": "Send a message without matching first!",
  "discover.freshToday": "Fresh today",
  "discover.noPicks": "No picks available today",
  "discover.keepEditing": "Keep editing",
  "discover.discard": "Discard",
  "discover.roses": "Roses",
  "discover.noBoosterDesc": "No users are currently using boost in your area",
  "common.online": "Online",
  "whoLikedYou.theyLikedYou": "They liked you!",
  "whoLikedYou.upgradeToSee": "Upgrade to see their full profile",
  "wallet.title": "Wallet",
  "matchInsights.noSharedInterests": "No shared interests yet",
  "auth.resetLinkDesc": "Enter your email and we'll send you a reset link",
  "settings.cancelPremiumConfirmDesc":
    "Are you sure you want to cancel your premium membership? You'll lose access to:",
  "settings.deactivateAccount": "Deactivate Account",
  "settings.deactivateDesc":
    "Your profile will be hidden immediately. After the chosen period, your account and all data will be permanently deleted unless you log back in.",
  "settings.deactivateFor": "Deactivate for {{days}} days",
  "settings.updating": "Updating...",
  "settings.updatePassword": "Update Password",
});

// ─── 2. Patch source files ────────────────────────────────────────────────────

function patchFile(filePath, replacements) {
  const relPath = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  let patched = 0;
  let missed = 0;

  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replace(from, to);
      patched++;
      console.log(`  ✓ [${relPath}] patched: ${from.trim().slice(0, 60)}`);
    } else {
      missed++;
      console.log(`  - [${relPath}] missed : ${from.trim().slice(0, 60)}`);
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`  => ${patched} patched, ${missed} missed in ${relPath}`);
}

// ─── Discover.tsx ─────────────────────────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/Discover.tsx"), [
  // "Come back later to see more people"
  [
    `Come back later to see more people`,
    `{t("discover.comeBackLater")}`,
  ],
  // "No users are currently using boost in your area"
  [
    `No users are currently using boost in your area`,
    `{t("discover.noBoosterDesc")}`,
  ],
  // "Per rose"
  [
    `    Per rose
                  </span>`,
    `    {t("discover.perRose")}
                  </span>`,
  ],
  // Cancel button in roses dialog
  [
    `>
                Cancel
              </Button>`,
    `>
                {t("common.cancel")}
              </Button>`,
  ],
  // "Send a message without matching first!"
  [
    `Send a message without matching first!`,
    `{t("discover.sendMsgFirst")}`,
  ],
  // "Fresh today"
  [
    `Fresh today`,
    `{t("discover.freshToday")}`,
  ],
  // "No picks available today"
  [
    `No picks available today`,
    `{t("discover.noPicks")}`,
  ],
  // "Keep editing"
  [
    `>
              Keep editing
            </AlertDialogCancel>`,
    `>
              {t("discover.keepEditing")}
            </AlertDialogCancel>`,
  ],
  // "Discard"
  [
    `            >
              Discard`,
    `            >
              {t("discover.discard")}`,
  ],
]);

// ─── EditProfile.tsx ──────────────────────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/EditProfile.tsx"), [
  [
    `Yes, not living with me`,
    `{t("editProfile.yesNotLivingWithMe")}`,
  ],
  [
    `Spotify detected`,
    `{t("editProfile.spotifyDetected")}`,
  ],
]);

// Check if editProfile keys already exist; if not add them
const sqObj = JSON.parse(fs.readFileSync(SQ, "utf8").replace(/\r\n/g, "\n"));
if (!sqObj.editProfile) sqObj.editProfile = {};
const enObj = JSON.parse(fs.readFileSync(EN, "utf8").replace(/\r\n/g, "\n"));
if (!enObj.editProfile) enObj.editProfile = {};

if (!sqObj.editProfile.yesNotLivingWithMe) {
  sqObj.editProfile.yesNotLivingWithMe = "Po, nuk jeton me mua";
  console.log("  + added editProfile.yesNotLivingWithMe (sq)");
}
if (!sqObj.editProfile.spotifyDetected) {
  sqObj.editProfile.spotifyDetected = "Spotify u zbulua";
  console.log("  + added editProfile.spotifyDetected (sq)");
}
if (!enObj.editProfile.yesNotLivingWithMe) {
  enObj.editProfile.yesNotLivingWithMe = "Yes, not living with me";
  console.log("  + added editProfile.yesNotLivingWithMe (en)");
}
if (!enObj.editProfile.spotifyDetected) {
  enObj.editProfile.spotifyDetected = "Spotify detected";
  console.log("  + added editProfile.spotifyDetected (en)");
}
fs.writeFileSync(SQ, JSON.stringify(sqObj, null, 2) + "\n", "utf8");
fs.writeFileSync(EN, JSON.stringify(enObj, null, 2) + "\n", "utf8");

// ─── Auth.tsx ─────────────────────────────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/Auth.tsx"), [
  [
    `Enter your email and we'll send you a reset link`,
    `{t("auth.resetLinkDesc")}`,
  ],
]);

// ─── WhoLikedYou.tsx ──────────────────────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/WhoLikedYou.tsx"), [
  [
    `They liked you!`,
    `{t("whoLikedYou.theyLikedYou")}`,
  ],
  [
    `Upgrade to see their full profile`,
    `{t("whoLikedYou.upgradeToSee")}`,
  ],
]);

// ─── MatchInsights.tsx ────────────────────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/MatchInsights.tsx"), [
  [
    `No shared interests yet`,
    `{t("matchInsights.noSharedInterests")}`,
  ],
]);

// ─── Settings.tsx — remaining strings ────────────────────────────────────────
patchFile(path.join(ROOT, "src/pages/Settings.tsx"), [
  // "Are you sure you want to cancel your premium membership? You'll lose\n                            access to:"
  [
    `Are you sure you want to cancel your premium membership? You'll lose
                            access to:`,
    `{t("settings.cancelPremiumConfirmDesc")}`,
  ],
  // "Deactivate Account" dialog title
  [
    `Deactivate Account
            </DialogTitle>`,
    `{t("settings.deactivateAccount")}
            </DialogTitle>`,
  ],
  // Deactivate description
  [
    `Your profile will be hidden immediately. After the chosen period, your account and all
              data will be permanently deleted unless you log back in.`,
    `{t("settings.deactivateDesc")}`,
  ],
  // "Deactivate for {deactivateDays} days"
  [
    `Deactivate for {deactivateDays} days`,
    `{t("settings.deactivateFor", { days: deactivateDays })}`,
  ],
  // "Updating..." / "Update Password"
  [
    `{passwordLoading ? "Updating..." : "Update Password"}`,
    `{passwordLoading ? t("settings.updating") : t("settings.updatePassword")}`,
  ],
  // Cancel button in change password dialog
  [
    `variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>`,
    `variant="outline" onClick={() => setShowPasswordDialog(false)}>
                {t("common.cancel")}
              </Button>`,
  ],
]);

console.log("\nDone.");

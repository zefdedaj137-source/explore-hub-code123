/**
 * Translate remaining English strings in Settings.tsx and MyProfile.tsx
 * to Albanian (sq) using existing and new i18n keys.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SQ_PATH = path.join(ROOT, "src/locales/sq.json");
const EN_PATH = path.join(ROOT, "src/locales/en.json");
const SETTINGS_PATH = path.join(ROOT, "src/pages/Settings.tsx");
const MYPROFILE_PATH = path.join(ROOT, "src/pages/MyProfile.tsx");

// ── helpers ──────────────────────────────────────────────────────────────────
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}
function patch(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ── 1. Locale keys ────────────────────────────────────────────────────────────
const sqKeys = [
  // settings – new keys
  ["settings.boosterExpires", "Profili juaj është nën dritë. Skadon: {{time}}"],
  ["settings.visibleInLastActive", 'Jeni i dukshëm për të gjithë tek "Aktiv Kohët e Fundit"'],
  ["settings.managePremiumDesc", "Menaxho abonimin tënd premium"],
  ["settings.unlimitedSwipes", "Rrëshqitje të pakufizuara"],
  ["settings.seeWhoLiked", "Shiko kush të ka pëlqyer"],
  ["settings.advancedFiltersFeature", "Filtra të avancuar"],
  ["settings.spotlightAccess", "Qasje në Spotlight Booster"],
  ["settings.noAds", "Pa reklama"],
  ["settings.manageSubscription", "Menaxho Abonimin"],
  ["settings.cancelMembership", "Anulo Anëtarësimin"],
  ["settings.subscriptionRemainActive", "Abonimi juaj do të mbetet aktiv deri në fund të periudhës aktuale të faturimit."],
  ["settings.premiumCancelledSuccess", "Anëtarësia premium u anulua. Do të keni qasje deri në fund të periudhës tënde të faturimit."],
  ["settings.resendCode", "Ridërgo kodin"],
  ["settings.permissionBtn", "Leje"],
  ["settings.disableBtn", "Çaktivizo"],
  ["settings.subscribeBtn", "Abonohu"],
  ["settings.to", "Deri"],
  ["settings.quietHours", "Orët e qeta: {{start}} – {{end}}"],
  ["settings.imageGuidelines", "Udhëzimet e Imazhit"],
  ["settings.imageGuidelinesDesc", "Udhëzimet e imazhit"],
  ["settings.privacyPolicyTitle", "Politika e Privatësisë"],
  ["settings.privacyPolicyDesc", "Politika e privatësisë"],
  ["settings.termsTitle", "Kushtet e Shërbimit"],
  ["settings.termsDesc", "Kushtet & rregulloret"],
  ["settings.aboutUsTitle", "Rreth Nesh"],
  ["settings.aboutUsDesc", "Mëso më shumë rreth Shqiponjës"],
  ["settings.requestDataExport", "Kërko Eksportimin e të Dhënave"],
  ["settings.requestDataDeletion", "Kërko Fshirjen e të Dhënave"],
  ["settings.downloadMyData", "Shkarko të Dhënat e Mia"],
  ["settings.downloadDataDesc", "Shkarko një kopje të të gjitha të dhënave tua personale (profil, ndeshje, mesazhe, pëlqime) si skedar JSON."],
  ["settings.deleteAccountDesc", "Fshi menjëherë dhe përgjithmonë llogarinë tënde, ndeshjet, mesazhet dhe të gjitha të dhënat. Kjo nuk mund të zhbëhet."],
  ["settings.deleteDialogDesc", "Kjo do të fshijë përgjithmonë llogarinë tënde dhe do të heqë të gjitha të dhënat tua nga serverët tanë — duke përfshirë ndeshjet, mesazhet, pëlqimet dhe profilin tënd. Ky veprim nuk mund të zhbëhet."],
  ["settings.deleteEverything", "Fshi Gjithçka"],
  ["settings.adminSection", "Admin"],
  ["settings.safetyConsole", "Konsola e Sigurisë"],
  ["settings.safetyConsoleDesc", "Rishikoni raportet & kërkesat e të dhënave"],
  ["settings.analyticsDashboard", "Paneli Analitik"],
  ["settings.analyticsDashboardDesc", "Shikoni metrikat kryesore"],
  // profile – new keys
  ["profile.share", "Ndaj"],
  ["profile.achievements", "Arritjet ({{earned}}/{{total}})"],
  ["profile.mySoundtrack", "Melodia ime"],
  ["profile.getPremiumTitle", "Merr Më Shumë me Shqiponja Premium"],
  ["profile.noMoreGuessing", "Pa hamendësime – dijeni saktësisht kush është i interesuar"],
  ["profile.freeBoostsMonthly", "5 Rritësa Falas Çdo Muaj"],
  ["profile.get10xViews", "Merrni 10x më shumë shikime profili me rritësin"],
  ["profile.connectDeeper", "Lidhuni thellë me thirrje të pakufizuara"],
  ["profile.filterAdvanced", "Filtroni sipas lartësisë, arsimit, stilit të jetesës & më shumë"],
  ["profile.neverRunOut", "Kurrë mos mbeteni pa ndeshje të mundshme"],
  ["profile.goPremium", "Bli Premium!"],
  ["profile.premiumMember", "Anëtar Premium"],
  ["profile.premiumEnjoy", "Ju po gëzoni të gjitha funksionet premium! ✨"],
  // common – new keys
  ["common.share", "Ndaj"],
  ["common.disable", "Çaktivizo"],
];

const enKeys = [
  ["settings.boosterExpires", "Your profile is in the spotlight. Expires at: {{time}}"],
  ["settings.visibleInLastActive", 'You\'re visible to everyone in "Last Active"'],
  ["settings.managePremiumDesc", "Manage your premium subscription"],
  ["settings.unlimitedSwipes", "Unlimited swipes"],
  ["settings.seeWhoLiked", "See who liked you"],
  ["settings.advancedFiltersFeature", "Advanced filters"],
  ["settings.spotlightAccess", "Spotlight booster access"],
  ["settings.noAds", "No ads"],
  ["settings.manageSubscription", "Manage Subscription"],
  ["settings.cancelMembership", "Cancel Membership"],
  ["settings.subscriptionRemainActive", "Your subscription will remain active until the end of the current billing period."],
  ["settings.premiumCancelledSuccess", "Premium membership cancelled. You'll have access until the end of your billing period."],
  ["settings.resendCode", "Resend code"],
  ["settings.permissionBtn", "Permission"],
  ["settings.disableBtn", "Disable"],
  ["settings.subscribeBtn", "Subscribe"],
  ["settings.to", "To"],
  ["settings.quietHours", "Quiet hours: {{start}} – {{end}}"],
  ["settings.imageGuidelines", "Image Guidelines"],
  ["settings.imageGuidelinesDesc", "Image guidelines"],
  ["settings.privacyPolicyTitle", "Privacy Policy"],
  ["settings.privacyPolicyDesc", "Privacy policy"],
  ["settings.termsTitle", "Terms & Conditions"],
  ["settings.termsDesc", "Terms & conditions"],
  ["settings.aboutUsTitle", "About Us"],
  ["settings.aboutUsDesc", "Learn more about Shqiponja"],
  ["settings.requestDataExport", "Request Data Export"],
  ["settings.requestDataDeletion", "Request Data Deletion"],
  ["settings.downloadMyData", "Download My Data"],
  ["settings.downloadDataDesc", "Download a copy of all your personal data (profile, matches, messages, likes) as a JSON file."],
  ["settings.deleteAccountDesc", "Immediately and permanently delete your account, matches, messages, and all data. This cannot be undone."],
  ["settings.deleteDialogDesc", "This will permanently delete your account and remove all your data from our servers — including matches, messages, likes, and your profile. This action cannot be undone."],
  ["settings.deleteEverything", "Delete Everything"],
  ["settings.adminSection", "Admin"],
  ["settings.safetyConsole", "Safety Console"],
  ["settings.safetyConsoleDesc", "Review reports & data requests"],
  ["settings.analyticsDashboard", "Analytics Dashboard"],
  ["settings.analyticsDashboardDesc", "View key metrics"],
  ["profile.share", "Share"],
  ["profile.achievements", "Achievements ({{earned}}/{{total}})"],
  ["profile.mySoundtrack", "My Soundtrack"],
  ["profile.getPremiumTitle", "Get More with Shqiponja Premium"],
  ["profile.noMoreGuessing", "No more guessing - know exactly who's interested"],
  ["profile.freeBoostsMonthly", "5 Free Boosts Monthly"],
  ["profile.get10xViews", "Get 10x more profile views with booster"],
  ["profile.connectDeeper", "Connect deeper with unlimited calling"],
  ["profile.filterAdvanced", "Filter by height, education, lifestyle & more"],
  ["profile.neverRunOut", "Never run out of potential matches"],
  ["profile.goPremium", "Go Premium!"],
  ["profile.premiumMember", "Premium Member"],
  ["profile.premiumEnjoy", "You're enjoying all premium features! ✨"],
  ["common.share", "Share"],
  ["common.disable", "Disable"],
];

console.log("📚 Updating locale files...");
const sq = readJSON(SQ_PATH);
const en = readJSON(EN_PATH);
for (const [k, v] of sqKeys) patch(sq, k, v);
for (const [k, v] of enKeys) patch(en, k, v);
writeJSON(SQ_PATH, sq);
writeJSON(EN_PATH, en);
console.log("✅ Locale files updated");

// ── 2. Settings.tsx replacements ─────────────────────────────────────────────
let settings = fs.readFileSync(SETTINGS_PATH, "utf8");

const settingsReplacements = [
  // --- Spotlight Booster section ---
  {
    from: `                  Spotlight Booster
                  {isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}`,
    to: `                  {t("settings.spotlightBooster")}
                  {isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      {t("common.premium")}
                    </Badge>
                  )}`,
  },
  {
    from: `                  Be featured in "Last Active" and get up to 10x more profile views`,
    to: `                  {t("settings.boosterDesc")}`,
  },
  {
    from: `                    Booster Active!`,
    to: `                    {t("settings.boosterActive")}`,
  },
  {
    from: `                    Your profile is in the spotlight. Expires at:{" "}
                    {new Date(boosterExpiresAt).toLocaleString()}`,
    to: `                    {t("settings.boosterExpires", { time: new Date(boosterExpiresAt).toLocaleString() })}`,
  },
  {
    from: `                    You're visible to everyone in "Last Active"`,
    to: `                    {t("settings.visibleInLastActive")}`,
  },
  // --- Premium Membership section ---
  {
    from: `                  Premium Membership
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none ml-2 font-bold">
                    Active
                  </Badge>`,
    to: `                  {t("settings.premiumMembership")}
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none ml-2 font-bold">
                    {t("common.active")}
                  </Badge>`,
  },
  {
    from: `                  Manage your premium subscription`,
    to: `                  {t("settings.managePremiumDesc")}`,
  },
  {
    from: `                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Unlimited swipes
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          See who liked you
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Advanced filters
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Spotlight booster access
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          No ads
                        </li>`,
    to: `                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.unlimitedSwipes")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.seeWhoLiked")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.advancedFiltersFeature")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.spotlightAccess")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.noAds")}
                        </li>`,
  },
  {
    from: `                    Manage Subscription`,
    to: `                    {t("settings.manageSubscription")}`,
  },
  // Cancel Membership trigger button
  {
    from: `                      <Button
                        variant="outline"
                        className="w-full bg-primary/50 border-primary/50 text-primary/80 hover:bg-primary hover:text-primary/60"
                      >
                        Cancel Membership
                      </Button>`,
    to: `                      <Button
                        variant="outline"
                        className="w-full bg-primary/50 border-primary/50 text-primary/80 hover:bg-primary hover:text-primary/60"
                      >
                        {t("settings.cancelMembership")}
                      </Button>`,
  },
  // Cancel dialog list items (with garbled emoji chars)
  {
    from: `                            <ul className="mt-2 space-y-1 text-sm">
                              <li>`,
    to: `                            <ul className="mt-2 space-y-1 text-sm">
                              <li>`,
  },
  // Replace entire cancel dialog list + "Your subscription will remain active"
  {
    from: `                            <ul className="mt-2 space-y-1 text-sm">
                              <li>`,
    to: `                            <ul className="mt-2 space-y-1 text-sm">
                              <li>`,
  },
  {
    from: `                            Your subscription will remain active until the end of the current
                              billing period.`,
    to: `                            {t("settings.subscriptionRemainActive")}`,
  },
  // Toast success on cancel
  {
    from: `                              toast.success(
                                "Premium membership cancelled. You'll have access until the end of your billing period."
                              );`,
    to: `                              toast.success(t("settings.premiumCancelledSuccess"));`,
  },
  // Cancel Membership action button
  {
    from: `                          className="bg-primary hover:bg-primary"
                        >
                          Cancel Membership
                        </AlertDialogAction>`,
    to: `                          className="bg-primary hover:bg-primary"
                        >
                          {t("settings.cancelMembership")}
                        </AlertDialogAction>`,
  },
  // --- OTP Verification section ---
  {
    from: `                            Sending code to`,
    to: `                            {t("settings.sendingCodeTo")}`,
  },
  {
    from: `                          {loading ? "Sending..." : "Send Verification Code"}`,
    to: `                          {loading ? t("common.sending") : t("settings.sendVerificationCode")}`,
  },
  {
    from: `                            Enter the 6-digit code sent to your email`,
    to: `                            {t("settings.enterOtpCode")}`,
  },
  {
    from: `                            {loading ? "Verifying..." : "Verify Code"}`,
    to: `                            {loading ? t("settings.verifyingCode") : t("settings.verifyCode")}`,
  },
  {
    from: `                            Resend code`,
    to: `                            {t("settings.resendCode")}`,
  },
  // --- Discovery Settings CardTitle ---
  {
    from: `              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Discovery Settings`,
    to: `              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("settings.discoverySettings")}`,
  },
  // --- Gender preference labels ---
  {
    from: `                      <Label htmlFor="pref-male" className="flex-1 cursor-pointer font-normal">
                        Men
                      </Label>`,
    to: `                      <Label htmlFor="pref-male" className="flex-1 cursor-pointer font-normal">
                        {t("settings.men")}
                      </Label>`,
  },
  {
    from: `                      <Label htmlFor="pref-female" className="flex-1 cursor-pointer font-normal">
                        Women
                      </Label>`,
    to: `                      <Label htmlFor="pref-female" className="flex-1 cursor-pointer font-normal">
                        {t("settings.women")}
                      </Label>`,
  },
  {
    from: `                      <Label htmlFor="pref-everyone" className="flex-1 cursor-pointer font-normal">
                        Everyone
                      </Label>`,
    to: `                      <Label htmlFor="pref-everyone" className="flex-1 cursor-pointer font-normal">
                        {t("settings.everyone")}
                      </Label>`,
  },
  // Show profiles within X km
  {
    from: `                    Show profiles within {maxDistance} kilometers from your location`,
    to: `                    {t("settings.showProfilesWithin", { distance: maxDistance })}`,
  },
  // Save Discovery Settings button
  {
    from: `                  Save Discovery Settings`,
    to: `                  {t("settings.saveDiscoverySettings")}`,
  },
  // --- Activity section – Premium badge ---
  {
    from: `                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    Premium
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronDown
                  className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.activity ? "rotate-180" : ""}\`}`,
    to: `                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    {t("common.premium")}
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronDown
                  className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.activity ? "rotate-180" : ""}\`}`,
  },
  // Unlock Activity & History text (garbled chars)
  {
    from: `                      Unlock Activity & History `,
    to: `                      {t("settings.unlockActivityHistory")}`,
  },
  // --- Travel Mode section ---
  {
    from: `                <span>?? Travel Mode</span>`,
    to: `                <span>✈️ {t("settings.travelMode")}</span>`,
  },
  // Travel mode Premium badge
  {
    from: `                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    Premium
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronDown
                  className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.travel ? "rotate-180" : ""}\`}`,
    to: `                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    {t("common.premium")}
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronDown
                  className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.travel ? "rotate-180" : ""}\`}`,
  },
  {
    from: `                Explore matches in different cities around the world`,
    to: `                {t("settings.travelModeDesc")}`,
  },
  // --- Notifications section ---
  // Browser permission text
  {
    from: `                      Browser permission: {pushPermission}`,
    to: `                      {t("settings.browserPermission")}: {pushPermission}`,
  },
  // Permission button
  {
    from: `                    <Button variant="outline" size="sm" onClick={requestPushPermission}>
                      Permission
                    </Button>`,
    to: `                    <Button variant="outline" size="sm" onClick={requestPushPermission}>
                      {t("settings.permissionBtn")}
                    </Button>`,
  },
  // Disable button
  {
    from: `                      <Button variant="outline" size="sm" onClick={handlePushUnsubscribe}>
                        Disable
                      </Button>`,
    to: `                      <Button variant="outline" size="sm" onClick={handlePushUnsubscribe}>
                        {t("settings.disableBtn")}
                      </Button>`,
  },
  // Subscribe button
  {
    from: `                      <Button size="sm" onClick={handlePushSubscribe}>
                        Subscribe
                      </Button>`,
    to: `                      <Button size="sm" onClick={handlePushSubscribe}>
                        {t("settings.subscribeBtn")}
                      </Button>`,
  },
  // Do Not Disturb label
  {
    from: `                    Do Not Disturb`,
    to: `                    {t("settings.doNotDisturb")}`,
  },
  // Set quiet hours description
  {
    from: `                    Set quiet hours when you won't receive notifications`,
    to: `                    {t("settings.dndDesc")}`,
  },
  // "To" label
  {
    from: `                      <Label className="text-xs text-muted-foreground">To</Label>`,
    to: `                      <Label className="text-xs text-muted-foreground">{t("settings.to")}</Label>`,
  },
  // Clear button
  {
    from: `                        Clear
                      </Button>`,
    to: `                        {t("settings.clear")}
                      </Button>`,
  },
  // Quiet hours active text (garbled – uses "–" char)
  {
    from: `                      Quiet hours: {dndStart} `,
    to: `                      {t("settings.quietHours", { start: dndStart, end: dndEnd })}`,
  },
  // --- Help / Legal section ---
  {
    from: `                <SettingsSection
                  icon={FileText}
                  title="Bildrichtlinien"
                  description="Image guidelines"
                  onClick={() => navigate("/safety")}
                />`,
    to: `                <SettingsSection
                  icon={FileText}
                  title={t("settings.imageGuidelines")}
                  description={t("settings.imageGuidelinesDesc")}
                  onClick={() => navigate("/safety")}
                />`,
  },
  {
    from: `                <SettingsSection
                  icon={Lock}
                  title="Datenschutz"
                  description="Privacy policy"
                  onClick={() => navigate("/privacy")}
                />`,
    to: `                <SettingsSection
                  icon={Lock}
                  title={t("settings.privacyPolicyTitle")}
                  description={t("settings.privacyPolicyDesc")}
                  onClick={() => navigate("/privacy")}
                />`,
  },
  {
    from: `                <SettingsSection
                  icon={FileText}
                  title="AGB"
                  description="Terms & conditions"
                  onClick={() => navigate("/terms")}
                />`,
    to: `                <SettingsSection
                  icon={FileText}
                  title={t("settings.termsTitle")}
                  description={t("settings.termsDesc")}
                  onClick={() => navigate("/terms")}
                />`,
  },
  {
    from: `                <SettingsSection
                  icon={Info}
                  title="About Us"
                  description="Learn more about Shqiponja"
                  onClick={() => toast.info(t("settings.aboutApp"))}
                />`,
    to: `                <SettingsSection
                  icon={Info}
                  title={t("settings.aboutUsTitle")}
                  description={t("settings.aboutUsDesc")}
                  onClick={() => toast.info(t("settings.aboutApp"))}
                />`,
  },
  // Request Data Export button
  {
    from: `                    Request Data Export`,
    to: `                    {t("settings.requestDataExport")}`,
  },
  // Request Data Deletion button
  {
    from: `                    Request Data Deletion`,
    to: `                    {t("settings.requestDataDeletion")}`,
  },
  // --- Danger Zone section ---
  {
    from: `                  Danger Zone`,
    to: `                  {t("settings.dangerZone")}`,
  },
  // Download data description
  {
    from: `                    Download a copy of all your personal data (profile, matches, messages, likes) as
                    a JSON file.`,
    to: `                    {t("settings.downloadDataDesc")}`,
  },
  // Download My Data button
  {
    from: `                    Download My Data`,
    to: `                    {t("settings.downloadMyData")}`,
  },
  // Delete immediately description
  {
    from: `                    Immediately and permanently delete your account, matches, messages, and all
                    data. This cannot be undone.`,
    to: `                    {t("settings.deleteAccountDesc")}`,
  },
  // Delete dialog description (has garbled chars around "permanently")
  {
    from: `                          This will <strong>permanently</strong> delete your account and remove all
                          your data from our servers `,
    to: `                          {t("settings.deleteDialogDesc")}`,
  },
  // Delete Everything button
  {
    from: `                          Delete Everything`,
    to: `                          {t("settings.deleteEverything")}`,
  },
  // --- Version & Admin ---
  {
    from: `              <p className="text-center text-sm text-muted-foreground mt-4">Version 1.0.0</p>`,
    to: `              <p className="text-center text-sm text-muted-foreground mt-4">{t("settings.versionLabel")}</p>`,
  },
  // Admin section title
  {
    from: `                  Admin
                  <ChevronDown
                    className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.admin ? "rotate-180" : ""}\`}`,
    to: `                  {t("settings.adminSection")}
                  <ChevronDown
                    className={\`h-4 w-4 ml-auto transition-transform \${expandedSections.admin ? "rotate-180" : ""}\`}`,
  },
  // Safety Console
  {
    from: `                  <SettingsSection
                    icon={Shield}
                    title="Safety Console"
                    description="Review reports & data requests"
                    onClick={() => navigate("/admin/safety")}
                  />`,
    to: `                  <SettingsSection
                    icon={Shield}
                    title={t("settings.safetyConsole")}
                    description={t("settings.safetyConsoleDesc")}
                    onClick={() => navigate("/admin/safety")}
                  />`,
  },
  // Analytics Dashboard
  {
    from: `                  <SettingsSection
                    icon={BarChart3}
                    title="Analytics Dashboard"
                    description="View key metrics"
                    onClick={() => navigate("/admin/analytics")}
                  />`,
    to: `                  <SettingsSection
                    icon={BarChart3}
                    title={t("settings.analyticsDashboard")}
                    description={t("settings.analyticsDashboardDesc")}
                    onClick={() => navigate("/admin/analytics")}
                  />`,
  },
];

// We need to handle the "Unlock Activity & History" separately because it has garbled em-dash chars
// Let's use regex for that replacement
// Normalize CRLF → LF so multi-line template-literal matching works
settings = settings.replace(/\r\n/g, "\n");
console.log("\n📝 Patching Settings.tsx...");
let settingsPatched = 0;
let settingsFailed = [];

for (const { from, to } of settingsReplacements) {
  if (settings.includes(from)) {
    settings = settings.replace(from, to);
    settingsPatched++;
    // Remove the trailing content for the multi-line "Unlock Activity" case
  } else {
    settingsFailed.push(from.slice(0, 60).replace(/\n/g, "↵"));
  }
}

// Regex replacements for garbled chars
const settingsRegexReplacements = [
  // "Unlock Activity & History … with a premium subscription." – has garbled em-dashes
  {
    pattern: /Unlock Activity & History[^.]*?\bwith a premium subscription\./s,
    replacement: '{t("settings.unlockActivityHistory")}',
  },
  // "Quiet hours: {dndStart} – {dndEnd}" – has garbled em-dash
  {
    pattern: /Quiet hours: \{dndStart\}[^}]*?\{dndEnd\}/,
    replacement: '{t("settings.quietHours", { start: dndStart, end: dndEnd })}',
  },
  // "This will <strong>permanently</strong> delete...servers" – has garbled chars after "servers"
  {
    pattern: /This will <strong>permanently<\/strong> delete your account and remove all\s+your data from our servers[^.]*?\./s,
    replacement: '{t("settings.deleteDialogDesc")}',
  },
  // Travel Mode with garbled char
  {
    pattern: /<span>[^\w]*Travel Mode<\/span>/,
    replacement: '<span>✈️ {t("settings.travelMode")}</span>',
  },
  // Cancel dialog list items with garbled emoji
  {
    pattern: /<li>[^\w]*Unlimited swipes<\/li>\s*<li>[^\w]*See who liked you<\/li>\s*<li>[^\w]*Advanced filters<\/li>\s*<li>[^\w]*Spotlight booster<\/li>/s,
    replacement: `<li>{t("settings.unlimitedSwipes")}</li>
                              <li>{t("settings.seeWhoLiked")}</li>
                              <li>{t("settings.advancedFiltersFeature")}</li>
                              <li>{t("settings.spotlightAccess")}</li>`,
  },
];

for (const { pattern, replacement } of settingsRegexReplacements) {
  if (pattern.test(settings)) {
    settings = settings.replace(pattern, replacement);
    settingsPatched++;
  } else {
    settingsFailed.push("REGEX: " + pattern.toString().slice(0, 60));
  }
}

console.log(`  ✅ Patched: ${settingsPatched}`);
if (settingsFailed.length > 0) {
  console.log(`  ⚠️  Missed (${settingsFailed.length}):`);
  settingsFailed.forEach((f) => console.log(`    - ${f}`));
}
fs.writeFileSync(SETTINGS_PATH, settings, "utf8");
console.log("  ✅ Settings.tsx written");

// ── 3. MyProfile.tsx replacements ────────────────────────────────────────────
let myProfile = fs.readFileSync(MYPROFILE_PATH, "utf8");

console.log("\n📝 Patching MyProfile.tsx...");

// 3a. Fix formatTimeAgo to accept `t` parameter
myProfile = myProfile.replace(
  `const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return \`\${Math.floor(diffInSeconds / 60)}m ago\`;
  if (diffInSeconds < 86400) return \`\${Math.floor(diffInSeconds / 3600)}h ago\`;
  return \`\${Math.floor(diffInSeconds / 86400)}d ago\`;
};`,
  `const formatTimeAgo = (timestamp: string, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diffInSeconds < 60) return t("common.justNow");
  if (diffInSeconds < 3600) return t("common.minutesAgo", { min: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t("common.hoursAgo", { hr: Math.floor(diffInSeconds / 3600) });
  return t("common.daysAgo", { day: Math.floor(diffInSeconds / 86400) });
};`
);

// 3b. Find all call sites of formatTimeAgo(x) inside the component and add `t` param
// The call sites will be like formatTimeAgo(something) — inject t
myProfile = myProfile.replace(/formatTimeAgo\(([^,)]+)\)/g, "formatTimeAgo($1, t)");

// Normalize CRLF → LF so multi-line template-literal matching works
myProfile = myProfile.replace(/\r\n/g, "\n");

const profileReplacements = [
  // Profile Completion heading
  {
    from: `              Profile Completion`,
    to: `              {t("profile.profileCompletion")}`,
  },
  // Set your mood fallback
  {
    from: `                  {profile.mood_text || "Set your mood"}`,
    to: `                  {profile.mood_text || t("profile.setYourMood")}`,
  },
  // Edit Profile button
  {
    from: `              Edit Profile`,
    to: `              {t("profile.editProfile")}`,
  },
  // Preview button
  {
    from: `              Preview`,
    to: `              {t("profile.preview")}`,
  },
  // Story button
  {
    from: `              Story`,
    to: `              {t("profile.story")}`,
  },
  // Settings button
  {
    from: `              Settings`,
    to: `              {t("profile.settings")}`,
  },
  // Share button
  {
    from: `              Share`,
    to: `              {t("profile.share")}`,
  },
  // Achievements heading
  {
    from: `                <Sparkles className="h-4 w-4" /> Achievements ({earnedBadges.length}/
                {ACHIEVEMENTS.length})`,
    to: `                <Sparkles className="h-4 w-4" /> {t("profile.achievements", { earned: earnedBadges.length, total: ACHIEVEMENTS.length })}`,
  },
  // My Soundtrack heading
  {
    from: `                      My Soundtrack`,
    to: `                      {t("profile.mySoundtrack")}`,
  },
  // Edit button in soundtrack
  {
    from: `                      Edit`,
    to: `                      {t("common.edit")}`,
  },
  // Get More with Premium heading
  {
    from: `                  Get More with Shqiponja Premium`,
    to: `                  {t("profile.getPremiumTitle")}`,
  },
  // "No more guessing" feature desc
  {
    from: `                      No more guessing - know exactly who's interested`,
    to: `                      {t("profile.noMoreGuessing")}`,
  },
  // "5 Free Boosts Monthly" feature title
  {
    from: `                    <h4 className="font-semibold text-foreground">5 Free Boosts Monthly</h4>`,
    to: `                    <h4 className="font-semibold text-foreground">{t("profile.freeBoostsMonthly")}</h4>`,
  },
  // "Get 10x more profile views"
  {
    from: `                      Get 10x more profile views with booster`,
    to: `                      {t("profile.get10xViews")}`,
  },
  // "Connect deeper with unlimited calling"
  {
    from: `                      Connect deeper with unlimited calling`,
    to: `                      {t("profile.connectDeeper")}`,
  },
  // "Filter by height, education, lifestyle & more"
  {
    from: `                      Filter by height, education, lifestyle & more`,
    to: `                      {t("profile.filterAdvanced")}`,
  },
  // "Never run out of potential matches"
  {
    from: `                      Never run out of potential matches`,
    to: `                      {t("profile.neverRunOut")}`,
  },
  // Go Premium! button
  {
    from: `                Go Premium!`,
    to: `                {t("profile.goPremium")}`,
  },
  // Premium Member badge
  {
    from: `                Premium Member`,
    to: `                {t("profile.premiumMember")}`,
  },
  // "You're enjoying all premium features! ✨"
  {
    from: `                You're enjoying all premium features! ✨`,
    to: `                {t("profile.premiumEnjoy")}`,
  },
  // "No photo" in preview dialog
  {
    from: `                  No photo`,
    to: `                  {t("common.noPhoto")}`,
  },
  // "Premium" badge in preview dialog
  {
    from: `                <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                  Premium
                </Badge>`,
    to: `                <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                  {t("common.premium")}
                </Badge>`,
  },
];

let profilePatched = 0;
let profileFailed = [];

for (const { from, to } of profileReplacements) {
  if (myProfile.includes(from)) {
    myProfile = myProfile.replace(from, to);
    profilePatched++;
  } else {
    profileFailed.push(from.slice(0, 60).replace(/\n/g, "↵"));
  }
}

console.log(`  ✅ Patched: ${profilePatched}`);
if (profileFailed.length > 0) {
  console.log(`  ⚠️  Missed (${profileFailed.length}):`);
  profileFailed.forEach((f) => console.log(`    - ${f}`));
}
fs.writeFileSync(MYPROFILE_PATH, myProfile, "utf8");
console.log("  ✅ MyProfile.tsx written");

console.log("\n🎉 Done! Run `npx tsc --noEmit` to verify.");

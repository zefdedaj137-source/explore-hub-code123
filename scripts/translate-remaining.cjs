/**
 * Translate all remaining hardcoded strings:
 * - placeholder="..." attributes
 * - aria-label="..." attributes
 * - toast() calls with template literals
 * - remaining JSX text
 */
const fs = require('fs');

// ─── 1. NEW KEYS ─────────────────────────────────────────────────────────────

const newEn = {
  common: {
    emailPlaceholder: "you@example.com",
    phonePlaceholder: "Enter phone number",
    previousStory: "Previous story",
    nextStory: "Next story",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    uploadPhoto: "Upload photo",
    takePhoto: "Take photo",
    removeImage: "Remove image",
    dismiss: "Dismiss",
    like: "Like",
    reportUser: "Report user",
    goBack: "Go back",
    uploadProfilePicture: "Upload profile picture",
    uploadVideo: "Upload video file",
    back: "Back",
    freeBadge: "FREE",
    from: "From",
    openFilters: "Open filters",
  },
  auth: {
    signupFailed: "Sign up failed: {{error}}",
    emailPlaceholder: "you@example.com",
    phonePlaceholder: "Enter phone number",
  },
  chat: {
    locationHint: "e.g., Coffee shop downtown",
    notesHint: "e.g., Can't wait to see you!",
    uploadPhoto: "Upload photo",
    takePhoto: "Take photo",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    previousStory: "Previous story",
    nextStory: "Next story",
  },
  chatHeader: {
    backToMatches: "Back to matches",
    searchMessages: "Search messages",
    chatMenu: "Chat menu",
  },
  chatInput: {
    removeImage: "Remove image",
    planADate: "Plan a date",
    sendPhoto: "Send photo",
    takePhoto: "Take photo",
    sendGIF: "Send GIF",
  },
  discover: {
    failedToLike: "Failed to like profile: {{error}}",
    checkoutFailed: "Checkout failed: {{msg}}",
    failedToPass: "Failed to pass profile: {{error}}",
    messageSent: "Message sent to {{name}}! 💬",
    boostAria: "Boost",
    premiumAria: "Premium",
    notificationsAria: "Notifications",
    menuAria: "Menu",
    openFiltersAria: "Open filters",
    interestsHint: "e.g. travel, music, fitness",
    boostActivated: "Boost activated for {{hours}} hours!",
  },
  editProfile: {
    failedToLoad: "Failed to load profile: {{error}}",
    locationDetected: "Location detected: {{city}}, {{country}}",
    selectSexPlaceholder: "Select sex",
    cityHint: "e.g., Pristina, Tirana",
    countryHint: "e.g., Kosovo, Albania",
    educationHint: "e.g., Bachelor's in Computer Science",
    jobHint: "e.g., Software Engineer",
    currentCityHint: "e.g., Pristina",
    currentCountryHint: "e.g., Kosovo",
    yourAnswerPlaceholder: "Your answer...",
    choosePromptPlaceholder: "Choose a prompt...",
    lookingForPlaceholder: "What are you looking for?",
    interestsPlaceholder: "Add interests...",
    languagesPlaceholder: "Add languages...",
    heightHint: "e.g., 175",
    smokingPlaceholder: "Select smoking status",
    petsPlaceholder: "Do you have pets?",
    zodiacPlaceholder: "Select zodiac sign",
    religionPlaceholder: "Select religion",
    kidsPlaceholder: "Do you have kids?",
    wantKidsPlaceholder: "Do you want kids?",
    musicUrlHint: "https://youtube.com/watch?v=... or https://open.spotify.com/track/...",
    songTitlePlaceholder: "Song title",
    artistPlaceholder: "Artist",
    removeSoundtrack: "Remove soundtrack",
  },
  matches: {
    failedToLoadMessages: "Failed to load instant messages: {{error}}",
    unmatched: "Unmatched with {{name}}",
    failedToSend: "Failed to send: {{error}}",
    failedToSendReply: "Failed to send reply: {{error}}",
    previousStory: "Previous story",
    nextStory: "Next story",
  },
  profile: {
    goBack: "Go back",
    uploadPicture: "Upload profile picture",
    previousStory: "Previous story",
    nextStory: "Next story",
  },
  profileSetup: {
    genderPlaceholder: "Select gender",
    searchingForPlaceholder: "Select who you want to search",
    zodiacPlaceholder: "Select zodiac sign",
    religionPlaceholder: "Select religion",
    bioPlaceholder: "Tell us about yourself...",
    interestsHint: "Travel, Cooking, Music, Valle, Reading...",
    uploadFailed: "Upload failed: {{error}}",
    uploadPhoto: "Upload profile photo",
    uploadSelfie: "Upload verification selfie",
    cityHint: "e.g., Pristina, Tirana",
    countryHint: "e.g., Kosovo, Albania",
  },
  profileSoundtrack: {
    removeSoundtrack: "Remove soundtrack",
    musicUrlHint: "https://youtube.com/watch?v=... or https://open.spotify.com/track/...",
  },
  settings: {
    verificationSent: "Verification code sent to {{email}}",
    from: "From",
  },
  dancing: {
    rated: "Rated {{rating}}/10! ⭐",
    danceTo: "Dance to: {{song}}! 💃",
    videoUploaded: "Dance video uploaded with song: {{song}}! 🎉",
    uploadVideo: "Upload dancing video file",
  },
  wallet: {
    coinsAdded: "Added {{coins}} coins to your wallet.",
  },
  boostBundles: {
    activated: "Boost activated for {{hours}} hours!",
  },
  dailyRewards: {
    claimed: "Daily reward claimed! +{{coins}} coins",
  },
  dateSpots: {
    randomPick: "Random pick: {{name}} {{emoji}}",
  },
  adminAnalytics: {
    pushTitle: "Push title",
    pushBody: "Push body",
    targetUserId: "Target user id",
    targetUrl: "Target URL",
    sendAt: "Send at",
  },
  videoIntro: {
    urlPlaceholder: "https://...",
  },
  eventsMap: {
    eventPin: "Event pin",
  },
  profileCard: {
    reportUser: "Report user",
  },
  pushPrompt: {
    dismiss: "Dismiss",
  },
  secondLook: {
    dismiss: "Dismiss",
    like: "Like",
  },
  radar: {
    back: "Back",
  },
};

const newSq = {
  common: {
    emailPlaceholder: "ju@shembull.com",
    phonePlaceholder: "Shkruani numrin e telefonit",
    previousStory: "Historia e mëparshme",
    nextStory: "Historia tjetër",
    previousPhoto: "Foto e mëparshme",
    nextPhoto: "Foto tjetër",
    uploadPhoto: "Ngarko foto",
    takePhoto: "Bëj foto",
    removeImage: "Hiq foton",
    dismiss: "Mbyll",
    like: "Pelqej",
    reportUser: "Raporto përdoruesin",
    goBack: "Kthehu",
    uploadProfilePicture: "Ngarko foto profili",
    uploadVideo: "Ngarko skedarin video",
    back: "Kthehu",
    freeBadge: "FALAS",
    from: "Nga",
    openFilters: "Hap filtrat",
  },
  auth: {
    signupFailed: "Regjistrimi dështoi: {{error}}",
    emailPlaceholder: "ju@shembull.com",
    phonePlaceholder: "Shkruani numrin e telefonit",
  },
  chat: {
    locationHint: "p.sh., Kafene në qendër",
    notesHint: "p.sh., Mezi pres të të shoh!",
    uploadPhoto: "Ngarko foto",
    takePhoto: "Bëj foto",
    previousPhoto: "Foto e mëparshme",
    nextPhoto: "Foto tjetër",
    previousStory: "Historia e mëparshme",
    nextStory: "Historia tjetër",
  },
  chatHeader: {
    backToMatches: "Kthehu te ndeshjet",
    searchMessages: "Kërko mesazhe",
    chatMenu: "Menuja e bisedës",
  },
  chatInput: {
    removeImage: "Hiq foton",
    planADate: "Planifikoni një takim",
    sendPhoto: "Dërgoni foto",
    takePhoto: "Bëni foto",
    sendGIF: "Dërgoni GIF",
  },
  discover: {
    failedToLike: "Dështoi pelqimi i profilit: {{error}}",
    checkoutFailed: "Pagesa dështoi: {{msg}}",
    failedToPass: "Dështoi kalimi i profilit: {{error}}",
    messageSent: "Mesazh u dërgua tek {{name}}! 💬",
    boostAria: "Stimuluesi",
    premiumAria: "Premium",
    notificationsAria: "Njoftimet",
    menuAria: "Menuja",
    openFiltersAria: "Hap filtrat",
    interestsHint: "p.sh. udhëtim, muzikë, fitness",
    boostActivated: "Stimuluesi u aktivizua për {{hours}} orë!",
  },
  editProfile: {
    failedToLoad: "Dështoi ngarkimi i profilit: {{error}}",
    locationDetected: "Vendndodhja u zbulua: {{city}}, {{country}}",
    selectSexPlaceholder: "Zgjidhni gjininë",
    cityHint: "p.sh., Prishtinë, Tiranë",
    countryHint: "p.sh., Kosovë, Shqipëri",
    educationHint: "p.sh., Bachelor në Shkenca Kompjuterike",
    jobHint: "p.sh., Inxhinier Softueri",
    currentCityHint: "p.sh., Prishtinë",
    currentCountryHint: "p.sh., Kosovë",
    yourAnswerPlaceholder: "Përgjigja juaj...",
    choosePromptPlaceholder: "Zgjidhni një pyetje...",
    lookingForPlaceholder: "Çfarë jeni duke kërkuar?",
    interestsPlaceholder: "Shtoni interesa...",
    languagesPlaceholder: "Shtoni gjuhë...",
    heightHint: "p.sh., 175",
    smokingPlaceholder: "Zgjidhni statusin e duhanit",
    petsPlaceholder: "A keni kafshë shtëpiake?",
    zodiacPlaceholder: "Zgjidhni shenjën e horoskopit",
    religionPlaceholder: "Zgjidhni fenë",
    kidsPlaceholder: "A keni fëmijë?",
    wantKidsPlaceholder: "A dëshironi fëmijë?",
    musicUrlHint: "https://youtube.com/watch?v=... ose https://open.spotify.com/track/...",
    songTitlePlaceholder: "Titulli i këngës",
    artistPlaceholder: "Artisti",
    removeSoundtrack: "Hiq soundtrackun",
  },
  matches: {
    failedToLoadMessages: "Dështoi ngarkimi i mesazheve: {{error}}",
    unmatched: "U çngjys me {{name}}",
    failedToSend: "Dërgimi dështoi: {{error}}",
    failedToSendReply: "Dërgimi i përgjigjes dështoi: {{error}}",
    previousStory: "Historia e mëparshme",
    nextStory: "Historia tjetër",
  },
  profile: {
    goBack: "Kthehu",
    uploadPicture: "Ngarko foto profili",
    previousStory: "Historia e mëparshme",
    nextStory: "Historia tjetër",
  },
  profileSetup: {
    genderPlaceholder: "Zgjidhni gjininë",
    searchingForPlaceholder: "Zgjidhni kë dëshironi të kërkoni",
    zodiacPlaceholder: "Zgjidhni shenjën e horoskopit",
    religionPlaceholder: "Zgjidhni fenë",
    bioPlaceholder: "Na tregoni për veten...",
    interestsHint: "Udhëtim, Gatim, Muzikë, Valle, Lexim...",
    uploadFailed: "Ngarkimi dështoi: {{error}}",
    uploadPhoto: "Ngarko foto profili",
    uploadSelfie: "Ngarko selfie verifikimi",
    cityHint: "p.sh., Prishtinë, Tiranë",
    countryHint: "p.sh., Kosovë, Shqipëri",
  },
  profileSoundtrack: {
    removeSoundtrack: "Hiq soundtrackun",
    musicUrlHint: "https://youtube.com/watch?v=... ose https://open.spotify.com/track/...",
  },
  settings: {
    verificationSent: "Kodi i verifikimit u dërgua tek {{email}}",
    from: "Nga",
  },
  dancing: {
    rated: "Vlerësuat {{rating}}/10! ⭐",
    danceTo: "Vallëzoni me: {{song}}! 💃",
    videoUploaded: "Video dansit u ngarkua me këngën: {{song}}! 🎉",
    uploadVideo: "Ngarko skedarin video të dansit",
  },
  wallet: {
    coinsAdded: "Shtuat {{coins}} monedha në portofolin tuaj.",
  },
  boostBundles: {
    activated: "Stimuluesi u aktivizua për {{hours}} orë!",
  },
  dailyRewards: {
    claimed: "Shpërblimi ditor u mor! +{{coins}} monedha",
  },
  dateSpots: {
    randomPick: "Zgjedhje rastësore: {{name}} {{emoji}}",
  },
  adminAnalytics: {
    pushTitle: "Titulli i njoftimit",
    pushBody: "Teksti i njoftimit",
    targetUserId: "ID e përdoruesit target",
    targetUrl: "URL target",
    sendAt: "Dërgo në",
  },
  videoIntro: {
    urlPlaceholder: "https://...",
  },
  eventsMap: {
    eventPin: "Pini i ngjarjes",
  },
  profileCard: {
    reportUser: "Raporto përdoruesin",
  },
  pushPrompt: {
    dismiss: "Mbyll",
  },
  secondLook: {
    dismiss: "Mbyll",
    like: "Pelqej",
  },
  radar: {
    back: "Kthehu",
  },
};

// ─── 2. MERGE LOCALE FILES ────────────────────────────────────────────────────

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (!target[key]) target[key] = source[key];
    }
  }
  return target;
}

const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const sq = JSON.parse(fs.readFileSync('src/locales/sq.json', 'utf8'));
deepMerge(en, newEn);
deepMerge(sq, newSq);
fs.writeFileSync('src/locales/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('src/locales/sq.json', JSON.stringify(sq, null, 2));
console.log('✅ Locale files updated');

// ─── 3. APPLY REPLACEMENTS ────────────────────────────────────────────────────

function patch(filePath, replacements) {
  let c = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (c.includes(from)) { c = c.split(from).join(to); changed = true; }
  }
  if (changed) { fs.writeFileSync(filePath, c); console.log('✅', filePath.split(/[\\/]/).pop()); }
  else console.log('⚠️  no match:', filePath.split(/[\\/]/).pop());
}

// ── Auth.tsx ─────────────────────────────────────────────────────────────────
patch('src/pages/Auth.tsx', [
  ['`Sign up failed: ${errorMessage}`', 't("auth.signupFailed", { error: errorMessage })'],
  ['placeholder="you@example.com"', 'placeholder={t("auth.emailPlaceholder")}'],
  ['placeholder="Enter phone number"', 'placeholder={t("auth.phonePlaceholder")}'],
]);

// ── Chat.tsx ──────────────────────────────────────────────────────────────────
patch('src/pages/Chat.tsx', [
  ['placeholder="e.g., Coffee shop downtown"', 'placeholder={t("chat.locationHint")}'],
  ['placeholder="e.g., Can\'t wait to see you!"', 'placeholder={t("chat.notesHint")}'],
  ['aria-label="Upload photo"', 'aria-label={t("chat.uploadPhoto")}'],
  ['aria-label="Take photo"', 'aria-label={t("chat.takePhoto")}'],
  ['aria-label="Previous photo"', 'aria-label={t("chat.previousPhoto")}'],
  ['aria-label="Next photo"', 'aria-label={t("chat.nextPhoto")}'],
  ['aria-label="Previous story"', 'aria-label={t("chat.previousStory")}'],
  ['aria-label="Next story"', 'aria-label={t("chat.nextStory")}'],
]);

// ── ChatHeader.tsx ────────────────────────────────────────────────────────────
patch('src/components/chat/ChatHeader.tsx', [
  ['aria-label="Back to matches"', 'aria-label={t("chatHeader.backToMatches")}'],
  ['aria-label="Search messages"', 'aria-label={t("chatHeader.searchMessages")}'],
  ['aria-label="Chat menu"', 'aria-label={t("chatHeader.chatMenu")}'],
]);

// ── ChatInput.tsx ─────────────────────────────────────────────────────────────
patch('src/components/chat/ChatInput.tsx', [
  ['aria-label="Remove image"', 'aria-label={t("chatInput.removeImage")}'],
  ['aria-label="Plan a date"', 'aria-label={t("chatInput.planADate")}'],
  ['aria-label="Send photo"', 'aria-label={t("chatInput.sendPhoto")}'],
  ['aria-label="Take photo"', 'aria-label={t("chatInput.takePhoto")}'],
  ['aria-label="Send GIF"', 'aria-label={t("chatInput.sendGIF")}'],
]);

// ── Discover.tsx ──────────────────────────────────────────────────────────────
patch('src/pages/Discover.tsx', [
  ['`Failed to like profile: ${errorMessage}`', 't("discover.failedToLike", { error: errorMessage })'],
  ['`Checkout failed: ${msg}`', 't("discover.checkoutFailed", { msg })'],
  ['`Failed to pass profile: ${errorMessage}`', 't("discover.failedToPass", { error: errorMessage })'],
  ['`Message sent to ${instantMessageTargetProfile.full_name}! 💬`', 't("discover.messageSent", { name: instantMessageTargetProfile.full_name })'],
  ['aria-label="Boost"', 'aria-label={t("discover.boostAria")}'],
  ['aria-label="Premium"', 'aria-label={t("discover.premiumAria")}'],
  ['aria-label="Notifications"', 'aria-label={t("discover.notificationsAria")}'],
  ['aria-label="Menu"', 'aria-label={t("discover.menuAria")}'],
  ['aria-label="Open filters"', 'aria-label={t("discover.openFiltersAria")}'],
  ['placeholder="Everyone"', 'placeholder={t("discover.everyonePlaceholder")}'],
  ['placeholder="e.g. travel, music, fitness"', 'placeholder={t("discover.interestsHint")}'],
  ['>FREE<', '>{t("common.freeBadge")}<'],
  ['aria-label="Previous story"', 'aria-label={t("discover.previousStory")}'],
  ['aria-label="Next story"', 'aria-label={t("discover.nextStory")}'],
]);
// add these keys to discover in sq too
{
  const sq2 = JSON.parse(fs.readFileSync('src/locales/sq.json', 'utf8'));
  if (!sq2.discover) sq2.discover = {};
  if (!sq2.discover.previousStory) sq2.discover.previousStory = 'Historia e mëparshme';
  if (!sq2.discover.nextStory) sq2.discover.nextStory = 'Historia tjetër';
  const en2 = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
  if (!en2.discover) en2.discover = {};
  if (!en2.discover.previousStory) en2.discover.previousStory = 'Previous story';
  if (!en2.discover.nextStory) en2.discover.nextStory = 'Next story';
  fs.writeFileSync('src/locales/sq.json', JSON.stringify(sq2, null, 2));
  fs.writeFileSync('src/locales/en.json', JSON.stringify(en2, null, 2));
}

// ── EditProfile.tsx ───────────────────────────────────────────────────────────
patch('src/pages/EditProfile.tsx', [
  ['`Failed to load profile: ${errorMessage}`', 't("editProfile.failedToLoad", { error: errorMessage })'],
  ['`Location detected: ${city}, ${country}`', 't("editProfile.locationDetected", { city, country })'],
  ['placeholder="Select sex"', 'placeholder={t("editProfile.selectSexPlaceholder")}'],
  ['placeholder="e.g., Pristina, Tirana"', 'placeholder={t("editProfile.cityHint")}'],
  ['placeholder="e.g., Kosovo, Albania"', 'placeholder={t("editProfile.countryHint")}'],
  ['placeholder="e.g., Bachelor\'s in Computer Science"', 'placeholder={t("editProfile.educationHint")}'],
  ['placeholder="e.g., Software Engineer"', 'placeholder={t("editProfile.jobHint")}'],
  ['placeholder="e.g., Pristina"', 'placeholder={t("editProfile.currentCityHint")}'],
  ['placeholder="e.g., Kosovo"', 'placeholder={t("editProfile.currentCountryHint")}'],
  ['placeholder="Your answer..."', 'placeholder={t("editProfile.yourAnswerPlaceholder")}'],
  ['placeholder="Choose a prompt..."', 'placeholder={t("editProfile.choosePromptPlaceholder")}'],
  ['placeholder="What are you looking for?"', 'placeholder={t("editProfile.lookingForPlaceholder")}'],
  ['placeholder="Add interests..."', 'placeholder={t("editProfile.interestsPlaceholder")}'],
  ['placeholder="Add languages..."', 'placeholder={t("editProfile.languagesPlaceholder")}'],
  ['placeholder="e.g., 175"', 'placeholder={t("editProfile.heightHint")}'],
  ['placeholder="Select smoking status"', 'placeholder={t("editProfile.smokingPlaceholder")}'],
  ['placeholder="Do you have pets?"', 'placeholder={t("editProfile.petsPlaceholder")}'],
  ['placeholder="Select zodiac sign"', 'placeholder={t("editProfile.zodiacPlaceholder")}'],
  ['placeholder="Select religion"', 'placeholder={t("editProfile.religionPlaceholder")}'],
  ['placeholder="Do you have kids?"', 'placeholder={t("editProfile.kidsPlaceholder")}'],
  ['placeholder="Do you want kids?"', 'placeholder={t("editProfile.wantKidsPlaceholder")}'],
  ['placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/track/..."', 'placeholder={t("editProfile.musicUrlHint")}'],
  ['placeholder="Song title"', 'placeholder={t("editProfile.songTitlePlaceholder")}'],
  ['placeholder="Artist"', 'placeholder={t("editProfile.artistPlaceholder")}'],
  ['aria-label="Remove soundtrack"', 'aria-label={t("editProfile.removeSoundtrack")}'],
]);

// ── Matches.tsx ───────────────────────────────────────────────────────────────
patch('src/pages/Matches.tsx', [
  ['`Failed to load instant messages: ${error.message}`', 't("matches.failedToLoadMessages", { error: error.message })'],
  ['`Unmatched with ${match.profile.full_name}`', 't("matches.unmatched", { name: match.profile.full_name })'],
  ['`Failed to send: ${error.message}`', 't("matches.failedToSend", { error: error.message })'],
  ['`Failed to send reply: ${error.message}`', 't("matches.failedToSendReply", { error: error.message })'],
  ['aria-label="Previous story"', 'aria-label={t("matches.previousStory")}'],
  ['aria-label="Next story"', 'aria-label={t("matches.nextStory")}'],
]);

// ── MyProfile.tsx ─────────────────────────────────────────────────────────────
patch('src/pages/MyProfile.tsx', [
  ['aria-label="Go back"', 'aria-label={t("profile.goBack")}'],
  ['aria-label="Upload profile picture"', 'aria-label={t("profile.uploadPicture")}'],
  ['aria-label="Previous story"', 'aria-label={t("profile.previousStory")}'],
  ['aria-label="Next story"', 'aria-label={t("profile.nextStory")}'],
]);

// ── ProfileSetup.tsx ──────────────────────────────────────────────────────────
patch('src/pages/ProfileSetup.tsx', [
  ['`Upload failed: ${errorMessage}`', 't("profileSetup.uploadFailed", { error: errorMessage })'],
  ['aria-label="Upload profile photo"', 'aria-label={t("profileSetup.uploadPhoto")}'],
  ['aria-label="Upload verification selfie"', 'aria-label={t("profileSetup.uploadSelfie")}'],
  ['placeholder="Select gender"', 'placeholder={t("profileSetup.genderPlaceholder")}'],
  ['placeholder="Select who you want to search"', 'placeholder={t("profileSetup.searchingForPlaceholder")}'],
  ['placeholder="e.g., Pristina, Tirana"', 'placeholder={t("profileSetup.cityHint")}'],
  ['placeholder="e.g., Kosovo, Albania"', 'placeholder={t("profileSetup.countryHint")}'],
  ['placeholder="Select zodiac sign"', 'placeholder={t("profileSetup.zodiacPlaceholder")}'],
  ['placeholder="Select religion"', 'placeholder={t("profileSetup.religionPlaceholder")}'],
  ['placeholder="Tell us about yourself..."', 'placeholder={t("profileSetup.bioPlaceholder")}'],
  ['placeholder="Travel, Cooking, Music, Valle, Reading..."', 'placeholder={t("profileSetup.interestsHint")}'],
]);

// ── ProfileSoundtrack.tsx ─────────────────────────────────────────────────────
patch('src/pages/ProfileSoundtrack.tsx', [
  ['placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/track/..."', 'placeholder={t("profileSoundtrack.musicUrlHint")}'],
  ['aria-label="Remove soundtrack"', 'aria-label={t("profileSoundtrack.removeSoundtrack")}'],
]);

// ── Settings.tsx ──────────────────────────────────────────────────────────────
patch('src/pages/Settings.tsx', [
  ['`Verification code sent to ${registeredEmail}`', 't("settings.verificationSent", { email: registeredEmail })'],
  ['>From<', '>{t("settings.from")}<'],
]);

// ── VideoFeed.tsx ─────────────────────────────────────────────────────────────
patch('src/components/VideoFeed.tsx', [
  ['`Rated ${rating}/10! ⭐`', 't("dancing.rated", { rating })'],
]);

// ── VideoRecorder.tsx ─────────────────────────────────────────────────────────
patch('src/components/VideoRecorder.tsx', [
  ['`Dance to: ${newSong}! 💃`', 't("dancing.danceTo", { song: newSong })'],
  ['`Dance video uploaded with song: ${newSong}! 🎉`', 't("dancing.videoUploaded", { song: newSong })'],
  ['aria-label="Upload video file"', 'aria-label={t("dancing.uploadVideo")}'],
]);

// ── DancingChallenge.tsx ──────────────────────────────────────────────────────
patch('src/components/DancingChallenge.tsx', [
  ['aria-label="Upload dancing video file"', 'aria-label={t("dancing.uploadVideo")}'],
]);

// ── VideoIntro.tsx ────────────────────────────────────────────────────────────
patch('src/pages/VideoIntro.tsx', [
  ['placeholder="https://..."', 'placeholder={t("videoIntro.urlPlaceholder")}'],
]);

// ── EventsMap.tsx ─────────────────────────────────────────────────────────────
patch('src/pages/EventsMap.tsx', [
  ['aria-label="Event pin"', 'aria-label={t("eventsMap.eventPin")}'],
]);

// ── ProfileCard.tsx ───────────────────────────────────────────────────────────
patch('src/components/ProfileCard.tsx', [
  ['aria-label="Report user"', 'aria-label={t("profileCard.reportUser")}'],
]);

// ── PushPrompt.tsx ────────────────────────────────────────────────────────────
patch('src/components/PushPrompt.tsx', [
  ['aria-label="Dismiss"', 'aria-label={t("pushPrompt.dismiss")}'],
]);

// ── SecondLook.tsx ────────────────────────────────────────────────────────────
patch('src/pages/SecondLook.tsx', [
  ['aria-label="Dismiss"', 'aria-label={t("secondLook.dismiss")}'],
  ['aria-label="Like"', 'aria-label={t("secondLook.like")}'],
]);

// ── Radar.tsx ─────────────────────────────────────────────────────────────────
// "Zurück" is German "Back" - likely a bug, replace with Albanian
patch('src/pages/Radar.tsx', [
  ['aria-label="Zurück"', 'aria-label={t("radar.back")}'],
]);

// ── AdminAnalytics.tsx ────────────────────────────────────────────────────────
patch('src/pages/AdminAnalytics.tsx', [
  ['aria-label="Push title"', 'aria-label={t("adminAnalytics.pushTitle")}'],
  ['aria-label="Push body"', 'aria-label={t("adminAnalytics.pushBody")}'],
  ['aria-label="Target user id"', 'aria-label={t("adminAnalytics.targetUserId")}'],
  ['aria-label="Target URL"', 'aria-label={t("adminAnalytics.targetUrl")}'],
  ['aria-label="Send at"', 'aria-label={t("adminAnalytics.sendAt")}'],
]);

// ── BoostBundles.tsx ──────────────────────────────────────────────────────────
patch('src/pages/BoostBundles.tsx', [
  ['`Boost activated for ${hours} hours!`', 't("boostBundles.activated", { hours })'],
]);

// ── DailyRewards.tsx ──────────────────────────────────────────────────────────
patch('src/pages/DailyRewards.tsx', [
  ['`Daily reward claimed! +${DAILY_REWARD} coins`', 't("dailyRewards.claimed", { coins: DAILY_REWARD })'],
]);

// ── DateSpotSuggestions.tsx ───────────────────────────────────────────────────
patch('src/pages/DateSpotSuggestions.tsx', [
  ['`Random pick: ${pick.name} ${pick.emoji}`', 't("dateSpots.randomPick", { name: pick.name, emoji: pick.emoji })'],
]);

// ── Wallet.tsx ────────────────────────────────────────────────────────────────
patch('src/pages/Wallet.tsx', [
  ['`Added ${coins} coins to your wallet.`', 't("wallet.coinsAdded", { coins })'],
]);

console.log('\n🎉 Done! All remaining strings translated.');

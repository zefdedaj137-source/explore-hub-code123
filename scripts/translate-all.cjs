/**
 * Comprehensive translation script - adds all missing keys and replaces hardcoded strings
 */
const fs = require('fs');
const path = require('path');

// ─── 1. NEW TRANSLATION KEYS ────────────────────────────────────────────────

const newEnKeys = {
  common: {
    active: "Active",
    verified: "Verified",
    videoIntro: "Video intro",
    videoIntroLabel: "Video Intro",
    stories: "Stories",
    storyViewer: "Story Viewer",
    loading: "Loading...",
    sending: "Sending...",
    searching: "Searching...",
    preview: "Preview",
    somethingWentWrong: "Something went wrong",
    notifications: "Notifications",
    travelingIn: "Traveling in",
    profile: "Profile",
    tryAgain: "Try again",
  },
  browseProfiles: {
    title: "Meet Your Matches",
  },
  chatInput: {
    voiceMessageRecorded: "Voice message recorded",
  },
  dancing: {
    valleChannel: "Valle Dancing Channel",
    whatYouGet: "What you'll get:",
    challenge: "Dancing Valle Challenge",
    dancingTo: "Dancing to:",
    danceVideos: "Dance Videos",
    rateVideo: "Rate this video:",
    loadingVideos: "Loading dance videos...",
    noVideos: "No videos yet",
    beFirst: "Be the first to upload a dance video!",
    rateDance: "Rate this dance:",
    recordValle: "Record Your Valle",
    dancingToLabel: "Dancing to:",
  },
  datingIdeas: {
    titleWord1: "Dating",
    titleWord2: "Ideas",
    shareTitle: "Share Your Date Ideas",
  },
  chat: {
    startConversation: "Start of conversation",
    blockedByUser: "This user has blocked you. You cannot message or call.",
    mutualBlock: "You both blocked each other. Communication is disabled.",
    noGifsFound: "No GIFs found",
    poweredByTenor: "Powered by Tenor",
    searchMessagesPlaceholder: "Search messages...",
    searchGifsPlaceholder: "Search GIFs...",
    dateTimeLabel: "Date & Time *",
    locationLabel: "Location *",
    notesLabel: "Notes (optional)",
  },
  discover: {
    unlockPremiumFilters: "Unlock Premium Filters",
    viewStory: "View Story",
    noActiveBoosters: "No Active Boosters",
    profileBoosted: "Your profile is boosted!",
    orBuyMore: "Or buy more",
    quickBoost: "Quick boost",
    mostPopular: "Most popular ⭐",
    bestValueBadge: "Best value 💎",
    instantMatch: "Instant Match:",
    automaticLikeBack: "Automatic Like Back:",
    exclusiveRoseTheme: "Exclusive Rose Theme:",
    vipStatus: "VIP Status:",
    creditsRemaining: "Credits remaining:",
    alreadyPremium: "You're Already Premium!",
    premiumBenefits: "Premium Benefits:",
    premiumMember: "Premium Member",
    premiumBenefit: "Premium Benefit",
    bestValueLabel: "Best Value",
    save20: "Save 20%",
    noProfileViews: "No profile views yet",
    noLikesYet: "No likes yet",
    dailyPicks: "Daily Picks",
    discardFilters: "Discard filter changes?",
    instantMatchDesc: "Skip the waiting game",
    automaticLikeBackDesc: "They'll match with you instantly",
    exclusiveRoseThemeDesc: "Special chat background with roses",
    vipStatusDesc: "Stand out as a premium member",
    profileViews: "Profile Views",
    likes: "Likes",
    writeSomethingPlaceholder: "Write something interesting... 💬",
    minPlaceholder: "Min",
    maxPlaceholder: "Max",
    everyonePlaceholder: "Everyone",
    anyPlaceholder: "Any",
  },
  editProfile: {
    haveDogs: "Have dog(s)",
    haveCats: "Have cat(s)",
    lovePetsNoHave: "Love pets but don't have",
    yesLivingWithMe: "Yes, living with me",
    preview: "Preview",
  },
  gameSession: {
    albanianMusicTrivia: "Albanian Music Trivia",
  },
  icebreakerGames: {
    allDone: "All done!",
    shareAnswers: "Share your answers with your match to compare!",
    yourAnswerPlaceholder: "Your answer...",
  },
  matches: {
    youBlockedUser: "You blocked this user.",
    noInstantMessages: "No instant messages yet",
    theirMessage: "Their message:",
    noMessagesYet: "No messages yet",
    typeMessagePlaceholder: "Type your message...",
  },
  matchInsights: {
    subtitle: "AI-powered compatibility snapshots",
    chooseMatch: "Choose a match",
    sharedInterests: "Shared interests",
    distance: "Distance",
    basedOnLocation: "Based on latest location",
    selectMatchPlaceholder: "Select match",
  },
  profile: {
    profileNotFound: "Profile not found",
    nextStep: "Next step",
    setYourMood: "Set your mood",
    addThemeSong: "Add a theme song to your profile",
    seeWhoLiked: "See Who Liked You",
    advancedFilters: "Advanced Filters",
    unlimitedSwipes: "Unlimited Swipes",
    unlimitedCallsVideo: "Unlimited Video & Voice Calls",
  },
  settings: {
    premiumBenefits: "Premium Benefits",
    cancelPremium: "Cancel Premium Membership?",
    minAge: "Min Age",
    maxAge: "Max Age",
    dataControls: "Data Controls",
    exportData: "Export Your Data",
    deactivateAccount: "Deactivate Account",
    permanentDeletion: "Permanent Deletion",
    areYouSure: "Are you absolutely sure?",
    autoDeleteAfter: "Auto-delete after:",
    passwordsNotMatch: "Passwords do not match",
    passwordMinChars: "Password must be at least 6 characters",
    versionLabel: "Version 1.0.0",
    enterCurrentPasswordPlaceholder: "Enter current password",
    atLeast6Placeholder: "At least 6 characters",
    repeatPasswordPlaceholder: "Repeat new password",
  },
};

const newSqKeys = {
  common: {
    active: "Aktiv",
    verified: "Verifikuar",
    videoIntro: "Hyrje video",
    videoIntroLabel: "Hyrje Video",
    stories: "Histori",
    storyViewer: "Shikues Historish",
    loading: "Duke ngarkuar...",
    sending: "Duke dërguar...",
    searching: "Duke kërkuar...",
    preview: "Paraparje",
    somethingWentWrong: "Diçka shkoi keq",
    notifications: "Njoftime",
    travelingIn: "Duke udhëtuar në",
    profile: "Profili",
    tryAgain: "Provo përsëri",
  },
  browseProfiles: {
    title: "Takoni Ndeshjet Tuaja",
  },
  chatInput: {
    voiceMessageRecorded: "Mesazhi zanor u regjistrua",
  },
  dancing: {
    valleChannel: "Kanali i Valle Dances",
    whatYouGet: "Çfarë do të merrni:",
    challenge: "Sfida e Valle Dances",
    dancingTo: "Duke vallëzuar me:",
    danceVideos: "Videot e Dansit",
    rateVideo: "Vlerësoni këtë video:",
    loadingVideos: "Duke ngarkuar videot e dansit...",
    noVideos: "Nuk ka video ende",
    beFirst: "Bëhu i pari që ngarkon një video dansit!",
    rateDance: "Vlerësoni këtë dans:",
    recordValle: "Regjistroni Vallen Tuaj",
    dancingToLabel: "Duke vallëzuar me:",
  },
  datingIdeas: {
    titleWord1: "Takime",
    titleWord2: "Ide",
    shareTitle: "Ndani Idetë Tuaja për Takime",
  },
  chat: {
    startConversation: "Fillimi i bisedës",
    blockedByUser: "Ky përdorues ju ka bllokuar. Nuk mund të dërgoni mesazhe apo të telefononi.",
    mutualBlock: "Ju të dy jeni bllokuar njëri-tjetrin. Komunikimi është çaktivizuar.",
    noGifsFound: "Nuk u gjetën GIF",
    poweredByTenor: "Mundësuar nga Tenor",
    searchMessagesPlaceholder: "Kërko mesazhe...",
    searchGifsPlaceholder: "Kërko GIF...",
    dateTimeLabel: "Data & Ora *",
    locationLabel: "Vendndodhja *",
    notesLabel: "Shënime (opsionale)",
  },
  discover: {
    unlockPremiumFilters: "Zhblloko Filtrat Premium",
    viewStory: "Shiko Historinë",
    noActiveBoosters: "Nuk ka Stimulues Aktivë",
    profileBoosted: "Profili juaj është stimuluar!",
    orBuyMore: "Ose blini më shumë",
    quickBoost: "Stimulim i shpejtë",
    mostPopular: "Më popullori ⭐",
    bestValueBadge: "Vlera më e mirë 💎",
    instantMatch: "Ndeshje e Menjëhershme:",
    automaticLikeBack: "Pelqim Automatik:",
    exclusiveRoseTheme: "Temë Ekskluzive me Trëndafila:",
    vipStatus: "Statusi VIP:",
    creditsRemaining: "Kredite të mbetura:",
    alreadyPremium: "Jeni Tashmë Premium!",
    premiumBenefits: "Përfitimet Premium:",
    premiumMember: "Anëtar Premium",
    premiumBenefit: "Përfitim Premium",
    bestValueLabel: "Vlera më e Mirë",
    save20: "Kurseni 20%",
    noProfileViews: "Nuk ka shikime profili ende",
    noLikesYet: "Nuk ka pelqime ende",
    dailyPicks: "Zgjedhjet Ditore",
    discardFilters: "Hidhni ndryshimet e filtrit?",
    instantMatchDesc: "Kapërceni pritjen",
    automaticLikeBackDesc: "Ata do të përputhen me ju menjëherë",
    exclusiveRoseThemeDesc: "Sfond special bisede me trëndafila",
    vipStatusDesc: "Dallohuni si anëtar premium",
    profileViews: "Shikimet e Profilit",
    likes: "Pelqimet",
    writeSomethingPlaceholder: "Shkruani diçka interesante... 💬",
    minPlaceholder: "Min",
    maxPlaceholder: "Max",
    everyonePlaceholder: "Të gjithë",
    anyPlaceholder: "Çdo",
  },
  editProfile: {
    haveDogs: "Kam qen",
    haveCats: "Kam mace",
    lovePetsNoHave: "Dua kafshë shtëpiake por nuk kam",
    yesLivingWithMe: "Po, jeton me mua",
    preview: "Paraparje",
  },
  gameSession: {
    albanianMusicTrivia: "Pyetje Muzike Shqiptare",
  },
  icebreakerGames: {
    allDone: "U krye!",
    shareAnswers: "Ndani përgjigjet tuaja me ndeshjen tuaj për të krahasuar!",
    yourAnswerPlaceholder: "Përgjigja juaj...",
  },
  matches: {
    youBlockedUser: "Ju keni bllokuar këtë përdorues.",
    noInstantMessages: "Nuk ka mesazhe të menjëhershme ende",
    theirMessage: "Mesazhi i tyre:",
    noMessagesYet: "Nuk ka mesazhe ende",
    typeMessagePlaceholder: "Shkruani mesazhin tuaj...",
  },
  matchInsights: {
    subtitle: "Pamje pajtueshmërie me AI",
    chooseMatch: "Zgjidhni një ndeshje",
    sharedInterests: "Interesa të përbashkëta",
    distance: "Distanca",
    basedOnLocation: "Bazuar në vendndodhjen e fundit",
    selectMatchPlaceholder: "Zgjidhni ndeshjen",
  },
  profile: {
    profileNotFound: "Profili nuk u gjet",
    nextStep: "Hapi tjetër",
    setYourMood: "Vendosni disponimin tuaj",
    addThemeSong: "Shtoni një këngë temë në profilin tuaj",
    seeWhoLiked: "Shihni Kush Ju Ka Pelqyer",
    advancedFilters: "Filtra të Avancuar",
    unlimitedSwipes: "Rrëshqitje të Pakufizuara",
    unlimitedCallsVideo: "Thirrje Video & Zanore të Pakufizuara",
  },
  settings: {
    premiumBenefits: "Përfitimet Premium",
    cancelPremium: "Anuloni Anëtarësimin Premium?",
    minAge: "Mosha Min",
    maxAge: "Mosha Max",
    dataControls: "Kontrollet e të Dhënave",
    exportData: "Eksportoni të Dhënat Tuaja",
    deactivateAccount: "Çaktivizoni Llogarinë",
    permanentDeletion: "Fshirje Permanente",
    areYouSure: "Jeni absolutisht të sigurt?",
    autoDeleteAfter: "Fshirje automatike pas:",
    passwordsNotMatch: "Fjalëkalimet nuk përputhen",
    passwordMinChars: "Fjalëkalimi duhet të ketë të paktën 6 karaktere",
    versionLabel: "Versioni 1.0.0",
    enterCurrentPasswordPlaceholder: "Shkruani fjalëkalimin aktual",
    atLeast6Placeholder: "Të paktën 6 karaktere",
    repeatPasswordPlaceholder: "Përsëritni fjalëkalimin e ri",
  },
};

// ─── 2. MERGE INTO LOCALE FILES ─────────────────────────────────────────────

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (!target[key]) target[key] = source[key]; // only add if missing
    }
  }
  return target;
}

const enPath = 'src/locales/en.json';
const sqPath = 'src/locales/sq.json';
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const sq = JSON.parse(fs.readFileSync(sqPath, 'utf8'));

deepMerge(en, newEnKeys);
deepMerge(sq, newSqKeys);

fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(sqPath, JSON.stringify(sq, null, 2));
console.log('✅ Locale files updated');

// ─── 3. STRING REPLACEMENTS IN SOURCE FILES ──────────────────────────────────

// Helper: replace exact JSX text or attribute value
function replaceIn(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.basename(filePath)}`);
  } else {
    console.log(`⚠️  ${path.basename(filePath)} - no changes (strings may have moved)`);
  }
}

// ─── BrowseProfiles.tsx ──────────────────────────────────────────────────────
// Add useTranslation import + hook, replace hardcoded text
{
  let content = fs.readFileSync('src/components/BrowseProfiles.tsx', 'utf8');
  if (!content.includes('useTranslation')) {
    content = content.replace(
      `import { useState, useEffect } from "react";`,
      `import { useState, useEffect } from "react";\nimport { useTranslation } from "react-i18next";`
    );
    // Find component function and add hook - look for first useState or const
    content = content.replace(
      /const BrowseProfiles[^{]*\{/,
      (m) => m + '\n  const { t } = useTranslation();'
    );
  }
  content = content.split('>Meet Your Matches<').join('>{t("browseProfiles.title")}<');
  fs.writeFileSync('src/components/BrowseProfiles.tsx', content);
  console.log('✅ BrowseProfiles.tsx');
}

// ─── ChatInput.tsx ───────────────────────────────────────────────────────────
replaceIn('src/components/chat/ChatInput.tsx', [
  ['>Voice message recorded<', '>{t("chatInput.voiceMessageRecorded")}<'],
]);

// ─── DancingChallenge.tsx ────────────────────────────────────────────────────
replaceIn('src/components/DancingChallenge.tsx', [
  ['>Valle Dancing Channel<', '>{t("dancing.valleChannel")}<'],
  [">What you'll get:<", '>{t("dancing.whatYouGet")}<'],
  ['>Dancing Valle Challenge<', '>{t("dancing.challenge")}<'],
  ['>Dancing to:<', '>{t("dancing.dancingTo")}<'],
  ['>Dance Videos<', '>{t("dancing.danceVideos")}<'],
  ['>Rate this video:<', '>{t("dancing.rateVideo")}<'],
]);

// ─── DatingIdeas.tsx ─────────────────────────────────────────────────────────
replaceIn('src/components/DatingIdeas.tsx', [
  ['>Dating<', '>{t("datingIdeas.titleWord1")}<'],
  ['>Ideas<', '>{t("datingIdeas.titleWord2")}<'],
  ['>Share Your Date Ideas<', '>{t("datingIdeas.shareTitle")}<'],
]);

// ─── VideoFeed.tsx ────────────────────────────────────────────────────────────
replaceIn('src/components/VideoFeed.tsx', [
  ['>Loading dance videos...</p>', '>{t("dancing.loadingVideos")}</p>'],
  ['>No videos yet<', '>{t("dancing.noVideos")}<'],
  ['>Be the first to upload a dance video!</p>', '>{t("dancing.beFirst")}</p>'],
  ['>Rate this dance:<', '>{t("dancing.rateDance")}<'],
]);

// ─── VideoRecorder.tsx ────────────────────────────────────────────────────────
replaceIn('src/components/VideoRecorder.tsx', [
  ['>Record Your Valle<', '>{t("dancing.recordValle")}<'],
]);

// ─── ErrorBoundary.tsx ────────────────────────────────────────────────────────
// ErrorBoundary is a class component - we can't use hooks, just keep it simple
// We'll leave it for now since class components can't use hooks

// ─── Chat.tsx ─────────────────────────────────────────────────────────────────
replaceIn('src/pages/Chat.tsx', [
  ['>Start of conversation<', '>{t("chat.startConversation")}<'],
  ['>This user has blocked you. You cannot message or call.<', '>{t("chat.blockedByUser")}<'],
  ['>You both blocked each other. Communication is disabled.<', '>{t("chat.mutualBlock")}<'],
  ['>Video intro<', '>{t("common.videoIntro")}<'],
  ['>Stories<', '>{t("common.stories")}<'],
  ['>Searching...</p>', '>{t("common.searching")}</p>'],
  ['>No GIFs found<', '>{t("chat.noGifsFound")}<'],
  ['>Powered by Tenor<', '>{t("chat.poweredByTenor")}<'],
  ['placeholder="Search messages..."', '{...{placeholder: t("chat.searchMessagesPlaceholder")}}'],
  ['placeholder="Search GIFs..."', '{...{placeholder: t("chat.searchGifsPlaceholder")}}'],
  ['<label className="text-sm font-medium">Date & Time *</label>', '<label className="text-sm font-medium">{t("chat.dateTimeLabel")}</label>'],
  ['<label className="text-sm font-medium">Location *</label>', '<label className="text-sm font-medium">{t("chat.locationLabel")}</label>'],
  ['<label className="text-sm font-medium">Notes (optional)</label>', '<label className="text-sm font-medium">{t("chat.notesLabel")}</label>'],
]);

// ─── Discover.tsx ─────────────────────────────────────────────────────────────
replaceIn('src/pages/Discover.tsx', [
  ['>Unlock Premium Filters<', '>{t("discover.unlockPremiumFilters")}<'],
  ['>View Story<', '>{t("discover.viewStory")}<'],
  ['>No Active Boosters<', '>{t("discover.noActiveBoosters")}<'],
  ['>Your profile is boosted!</p>', '>{t("discover.profileBoosted")}</p>'],
  ['>Or buy more<', '>{t("discover.orBuyMore")}<'],
  ['>Quick boost<', '>{t("discover.quickBoost")}<'],
  ['>Most popular ⭐<', '>{t("discover.mostPopular")}<'],
  ['>Best value 💎<', '>{t("discover.bestValueBadge")}<'],
  ['>Instant Match:<', '>{t("discover.instantMatch")}<'],
  ['>Automatic Like Back:<', '>{t("discover.automaticLikeBack")}<'],
  ['>Exclusive Rose Theme:<', '>{t("discover.exclusiveRoseTheme")}<'],
  ['>VIP Status:<', '>{t("discover.vipStatus")}<'],
  ['>Credits remaining:<', '>{t("discover.creditsRemaining")}<'],
  [">You're Already Premium!<", '>{t("discover.alreadyPremium")}<'],
  ['>Premium Benefits:<', '>{t("discover.premiumBenefits")}<'],
  ['>Premium Member<', '>{t("discover.premiumMember")}<'],
  ['>Premium Benefit<', '>{t("discover.premiumBenefit")}<'],
  ['Save 20%', '{t("discover.save20")}'],
  ['>Best Value<', '>{t("discover.bestValueLabel")}<'],
  ['>No profile views yet<', '>{t("discover.noProfileViews")}<'],
  ['>No likes yet<', '>{t("discover.noLikesYet")}<'],
  ['Skip the waiting game', '{t("discover.instantMatchDesc")}'],
  ["They'll match with you instantly", '{t("discover.automaticLikeBackDesc")}'],
  ['Special chat background with roses', '{t("discover.exclusiveRoseThemeDesc")}'],
  ['Stand out as a premium member', '{t("discover.vipStatusDesc")}'],
  ['placeholder="Write something interesting... 💬"', 'placeholder={t("discover.writeSomethingPlaceholder")}'],
  ['<span>Profile Views ({profileViews.length})</span>', '<span>{t("discover.profileViews")} ({profileViews.length})</span>'],
  ['<span>Likes ({profileLikes.length})</span>', '<span>{t("discover.likes")} ({profileLikes.length})</span>'],
]);
// Handle Daily Picks and Discard filters (appears multiple times)
{
  let content = fs.readFileSync('src/pages/Discover.tsx', 'utf8');
  content = content.split('>Daily Picks<').join('>{t("discover.dailyPicks")}<');
  content = content.split('>Discard filter changes?<').join('>{t("discover.discardFilters")}<');
  content = content.split('>Notifications<').join('>{t("common.notifications")}<');
  // Handle Verified and Video Intro badges
  content = content.split('bg-primary text-white border-none">Verified<').join('bg-primary text-white border-none">{t("common.verified")}<');
  content = content.split('bg-background/80 text-white border-none">Video Intro<').join('bg-background/80 text-white border-none">{t("common.videoIntroLabel")}<');
  content = content.split('text-sm font-semibold text-foreground">Video intro<').join('text-sm font-semibold text-foreground">{t("common.videoIntro")}<');
  // Handle Traveling in
  content = content.split('>Traveling in {currentProfile.travel_city}<').join('>{t("common.travelingIn")} {currentProfile.travel_city}<');
  content = content.split('>Traveling in {p.travel_city}<').join('>{t("common.travelingIn")} {p.travel_city}<');
  fs.writeFileSync('src/pages/Discover.tsx', content);
  console.log('✅ Discover.tsx (extra passes)');
}

// ─── EditProfile.tsx ──────────────────────────────────────────────────────────
replaceIn('src/pages/EditProfile.tsx', [
  ['>Have dog(s)<', '>{t("editProfile.haveDogs")}<'],
  ['>Have cat(s)<', '>{t("editProfile.haveCats")}<'],
  [">Love pets but don't have<", '>{t("editProfile.lovePetsNoHave")}<'],
  ['>Yes, living with me<', '>{t("editProfile.yesLivingWithMe")}<'],
  ['>Preview<', '>{t("editProfile.preview")}<'],
  ['bg-primary text-white border-none">Verified<', 'bg-primary text-white border-none">{t("common.verified")}<'],
  ['bg-background/80 text-white border-none">Video Intro<', 'bg-background/80 text-white border-none">{t("common.videoIntroLabel")}<'],
  ['text-sm font-semibold text-foreground">Video intro<', 'text-sm font-semibold text-foreground">{t("common.videoIntro")}<'],
]);

// ─── GameSessionMusic.tsx ─────────────────────────────────────────────────────
replaceIn('src/pages/GameSessionMusic.tsx', [
  ['>Albanian Music Trivia<', '>{t("gameSession.albanianMusicTrivia")}<'],
]);

// ─── IcebreakerGames.tsx ──────────────────────────────────────────────────────
replaceIn('src/pages/IcebreakerGames.tsx', [
  ['>All done!</h2>', '>{t("icebreakerGames.allDone")}</h2>'],
  ['>Share your answers with your match to compare!</p>', '>{t("icebreakerGames.shareAnswers")}</p>'],
  ['placeholder="Your answer..."', 'placeholder={t("icebreakerGames.yourAnswerPlaceholder")}'],
]);

// ─── Matches.tsx ───────────────────────────────────────────────────────────────
{
  let content = fs.readFileSync('src/pages/Matches.tsx', 'utf8');
  content = content.split('>You blocked this user.</p>').join('>{t("matches.youBlockedUser")}</p>');
  content = content.split('>No instant messages yet<').join('>{t("matches.noInstantMessages")}<');
  content = content.split('>Video intro<').join('>{t("common.videoIntro")}<');
  content = content.split('>Stories<').join('>{t("common.stories")}<');
  content = content.split('>Their message:</p>').join('>{t("matches.theirMessage")}</p>');
  content = content.split('<>Sending...</>').join('<>{t("common.sending")}</>');
  content = content.split('>No messages yet<').join('>{t("matches.noMessagesYet")}<');
  content = content.split('placeholder="Type your message..."').join('placeholder={t("matches.typeMessagePlaceholder")}');
  content = content.split('>Traveling in {viewingProfile.profile.travel_city}<').join('>{t("common.travelingIn")} {viewingProfile.profile.travel_city}<');
  content = content.split('text-sm font-semibold text-foreground">Video intro<').join('text-sm font-semibold text-foreground">{t("common.videoIntro")}<');
  content = content.split('text-lg">Stories<').join('text-lg">{t("common.stories")}<');
  content = content.split('bg-primary text-white border-none">Verified<').join('bg-primary text-white border-none">{t("common.verified")}<');
  fs.writeFileSync('src/pages/Matches.tsx', content);
  console.log('✅ Matches.tsx');
}

// ─── MatchInsights.tsx ────────────────────────────────────────────────────────
replaceIn('src/pages/MatchInsights.tsx', [
  ['>Match Insights<', '>{t("matchInsights.title")}<'],
  ['>AI-powered compatibility snapshots<', '>{t("matchInsights.subtitle")}<'],
  ['>Loading...</Card>', '>{t("common.loading")}</Card>'],
  ['>Choose a match<', '>{t("matchInsights.chooseMatch")}<'],
  ['>Shared interests<', '>{t("matchInsights.sharedInterests")}<'],
  ['>Distance<', '>{t("matchInsights.distance")}<'],
  ['>Based on latest location<', '>{t("matchInsights.basedOnLocation")}<'],
  ['placeholder="Select match"', 'placeholder={t("matchInsights.selectMatchPlaceholder")}'],
]);

// ─── MyProfile.tsx ────────────────────────────────────────────────────────────
{
  let content = fs.readFileSync('src/pages/MyProfile.tsx', 'utf8');
  content = content.split('>Profile not found<').join('>{t("profile.profileNotFound")}<');
  content = content.split('>Next step<').join('>{t("profile.nextStep")}<');
  content = content.split('>Set your mood<').join('>{t("profile.setYourMood")}<');
  content = content.split('>Add a theme song to your profile<').join('>{t("profile.addThemeSong")}<');
  content = content.split('>See Who Liked You<').join('>{t("profile.seeWhoLiked")}<');
  content = content.split('>Advanced Filters<').join('>{t("profile.advancedFilters")}<');
  content = content.split('>Unlimited Swipes<').join('>{t("profile.unlimitedSwipes")}<');
  content = content.split('>Unlimited Video & Voice Calls<').join('>{t("profile.unlimitedCallsVideo")}<');
  content = content.split('bg-primary text-white border-none">Verified<').join('bg-primary text-white border-none">{t("common.verified")}<');
  content = content.split('bg-background/80 text-white border-none">Video Intro<').join('bg-background/80 text-white border-none">{t("common.videoIntroLabel")}<');
  content = content.split('text-sm font-semibold text-foreground">Video intro<').join('text-sm font-semibold text-foreground">{t("common.videoIntro")}<');
  fs.writeFileSync('src/pages/MyProfile.tsx', content);
  console.log('✅ MyProfile.tsx');
}

// ─── Settings.tsx ─────────────────────────────────────────────────────────────
replaceIn('src/pages/Settings.tsx', [
  ['>Premium Benefits<', '>{t("settings.premiumBenefits")}<'],
  ['>Cancel Premium Membership?<', '>{t("settings.cancelPremium")}<'],
  ['>Min Age<', '>{t("settings.minAge")}<'],
  ['>Max Age<', '>{t("settings.maxAge")}<'],
  ['>Data Controls<', '>{t("settings.dataControls")}<'],
  ['>Export Your Data<', '>{t("settings.exportData")}<'],
  ['>Deactivate Account<', '>{t("settings.deactivateAccount")}<'],
  ['>Permanent Deletion<', '>{t("settings.permanentDeletion")}<'],
  ['>Are you absolutely sure?<', '>{t("settings.areYouSure")}<'],
  ['>Auto-delete after:<', '>{t("settings.autoDeleteAfter")}<'],
  ['>Passwords do not match<', '>{t("settings.passwordsNotMatch")}<'],
  ['>Password must be at least 6 characters<', '>{t("settings.passwordMinChars")}<'],
  ['placeholder="Enter current password"', 'placeholder={t("settings.enterCurrentPasswordPlaceholder")}'],
  ['placeholder="At least 6 characters"', 'placeholder={t("settings.atLeast6Placeholder")}'],
  ['placeholder="Repeat new password"', 'placeholder={t("settings.repeatPasswordPlaceholder")}'],
]);

// ─── WhoLikedYou.tsx ──────────────────────────────────────────────────────────
replaceIn('src/pages/WhoLikedYou.tsx', [
  ['bg-primary text-white border-none">Verified<', 'bg-primary text-white border-none">{t("common.verified")}<'],
]);

// ─── ProfileGridCard.tsx ──────────────────────────────────────────────────────
{
  let content = fs.readFileSync('src/components/discover/ProfileGridCard.tsx', 'utf8');
  if (!content.includes('useTranslation')) {
    // Find import section and add useTranslation
    content = content.replace(/^(import [^\n]+\n)/, (m) => m + 'import { useTranslation } from "react-i18next";\n');
    // Find component and add hook
    content = content.replace(/const ProfileGridCard[^{]*\{/, (m) => m + '\n  const { t } = useTranslation();');
  }
  content = content.split('>Active<').join('>{t("common.active")}<');
  fs.writeFileSync('src/components/discover/ProfileGridCard.tsx', content);
  console.log('✅ ProfileGridCard.tsx');
}

console.log('\n🎉 All translations applied!');

// Script to add all missing translation keys to en.json and sq.json
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/locales/en.json');
const sqPath = path.join(__dirname, '../src/locales/sq.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const sq = JSON.parse(fs.readFileSync(sqPath, 'utf8'));

function add(obj, section, enKeys, sqKeys) {
  if (!obj[section]) obj[section] = {};
  Object.assign(obj[section], enKeys);
}
function addSq(obj, section, sqKeys) {
  if (!obj[section]) obj[section] = {};
  Object.assign(obj[section], sqKeys);
}

// ============================================================
// auth
// ============================================================
add(en, 'auth', {
  fillAllFields: "Please fill in all fields",
  passwordMin: "Password must be at least 6 characters",
  emailTip: "💡 Tip: Check your spam folder if you don't see the confirmation email.",
  accountCreated: "Account created! Please complete your profile.",
  signupNoUser: "Sign up completed but no user returned. Please try signing in.",
  emailRegistered: "This email is already registered. Please try signing in instead.",
  tooManyAttempts: "Too many attempts. Please wait a moment and try again.",
  invalidEmail: "Please enter a valid email address.",
  enterEmail: "Please enter your email address",
  resetLinkSent: "Password reset link sent! Check your email.",
  enterPhone: "Please enter a phone number",
  otpSentPhone: "OTP sent to your phone!",
  twilioError: "Please verify Twilio is configured correctly in backend settings",
  appleSignInError: "Could not start Apple sign-in. Please verify Apple provider setup in Supabase.",
});
addSq(sq, 'auth', {
  fillAllFields: "Ju lutemi plotësoni të gjitha fushat",
  passwordMin: "Fjalëkalimi duhet të ketë të paktën 6 karaktere",
  emailTip: "💡 Këshillë: Kontrolloni dosjen e spam-it nëse nuk shihni emailin e konfirmimit.",
  accountCreated: "Llogaria u krijua! Ju lutemi plotësoni profilin tuaj.",
  signupNoUser: "Regjistrimi u kompletua por nuk u kthye asnjë përdorues. Ju lutemi provoni të kyçeni.",
  emailRegistered: "Ky email është tashmë i regjistruar. Ju lutemi provoni të kyçeni.",
  tooManyAttempts: "Shumë tentativa. Ju lutemi prisni pak dhe provoni sërisht.",
  invalidEmail: "Ju lutemi shkruani një adresë emaili të vlefshme.",
  enterEmail: "Ju lutemi shkruani adresën tuaj të emailit",
  resetLinkSent: "Lidhja për rivendosjen e fjalëkalimit u dërgua! Kontrolloni emailin tuaj.",
  enterPhone: "Ju lutemi shkruani numrin tuaj të telefonit",
  otpSentPhone: "OTP u dërgua në telefonin tuaj!",
  twilioError: "Ju lutemi verifikoni që Twilio është konfiguruar saktë në cilësimet e serverit",
  appleSignInError: "Nuk mund të fillohej hyrja me Apple. Ju lutemi verifikoni konfigurimin e ofruesit Apple në Supabase.",
});

// ============================================================
// chat
// ============================================================
add(en, 'chat', {
  failedVoice: "Failed to send voice message",
  failedPhoto: "Failed to send photo",
  dateCanceled: "Date plan canceled.",
  failedCancelDate: "Failed to cancel date plan.",
  dateAccepted: "Date accepted! 🎉",
  dateDeclined: "Date declined.",
  failedDateResponse: "Failed to respond to date plan.",
  fillDateLocation: "Please fill in date/time and location.",
  datePlanCreated: "Date plan created!",
  failedCreateDate: "Failed to create date plan.",
  inappropriateMsg: "Your message contains inappropriate language. Please revise it.",
  offlineMessage: "You're offline. Message will be sent when connection returns.",
  reactionsUnavailable: "Reactions not available yet",
  failedDeleteMsg: "Failed to delete message",
  messageDeleted: "Message deleted",
  failedGif: "Failed to send GIF",
  failedUnmatch: "Failed to unmatch",
  userBlocked: "User blocked. You won't receive calls or messages.",
  failedBlock: "Failed to block user",
  userUnblocked: "User unblocked.",
  failedUnblock: "Failed to unblock user",
});
addSq(sq, 'chat', {
  failedVoice: "Dështoi dërgimi i mesazhit zanor",
  failedPhoto: "Dështoi dërgimi i fotos",
  dateCanceled: "Plani i takimit u anulua.",
  failedCancelDate: "Dështoi anulimi i planit të takimit.",
  dateAccepted: "Takimi u pranua! 🎉",
  dateDeclined: "Takimi u refuzua.",
  failedDateResponse: "Dështoi përgjigja ndaj planit të takimit.",
  fillDateLocation: "Ju lutemi plotësoni datën/orën dhe vendndodhjen.",
  datePlanCreated: "Plani i takimit u krijua!",
  failedCreateDate: "Dështoi krijimi i planit të takimit.",
  inappropriateMsg: "Mesazhi juaj përmban gjuhë të papërshtatshme. Ju lutemi rishikojeni.",
  offlineMessage: "Jeni jashtë linje. Mesazhi do të dërgohet kur të riktheheni online.",
  reactionsUnavailable: "Reagimet nuk janë ende të disponueshme",
  failedDeleteMsg: "Dështoi fshirja e mesazhit",
  messageDeleted: "Mesazhi u fshi",
  failedGif: "Dështoi dërgimi i GIF-it",
  failedUnmatch: "Dështoi heqja e ndeshjes",
  userBlocked: "Përdoruesi u bllokua. Nuk do të merrni thirrje ose mesazhe.",
  failedBlock: "Dështoi bllokimi i përdoruesit",
  userUnblocked: "Përdoruesi u zhbllokua.",
  failedUnblock: "Dështoi zhbllokimi i përdoruesit",
});

// ============================================================
// discover
// ============================================================
add(en, 'discover', {
  discoveryUpdateRequired: "Discovery update required. Please contact support.",
  failedLoad: "Failed to load profiles",
  failedUpgrade: "Failed to start upgrade process",
  profileLiked: "Profile liked!",
  superlikeSent: "⚡ Superlike sent!",
  superlikeOffline: "You're offline. Superlike will be sent when connection returns.",
  failedSuperlike: "Failed to send superlike",
  notEnoughCoins: "Not enough coins. Please top up your wallet.",
  alreadyMatched: "You're already matched with this person!",
  rosesSent: "💐 Premium Roses sent! Instant match created with rose-themed chat!",
  outOfSwipes: "Out of swipes! Please wait or upgrade to premium.",
  profilePassed: "Profile passed",
  noRewinds: "No rewinds remaining today!",
  failedUndo: "Failed to undo action",
  noImCredits: "No instant message credits! Purchase more to continue.",
  writeMessage: "Please write a message",
  failedMessage: "Failed to send message",
  spotlightExpired: "Your Spotlight Booster has expired",
  boost3hFree: "Free 3-hour boost activated! ⚡",
  failedBoost: "Failed to activate boost",
  signInToBoost: "Please sign in to boost.",
  boost3h: "3-hour boost activated! ⚡",
  boost6h: "6-hour boost activated! ⚡",
  boost10h: "10-hour boost activated! ⚡",
});
addSq(sq, 'discover', {
  discoveryUpdateRequired: "Kërkohet përditësim i zbulimit. Ju lutemi kontaktoni mbështetjen.",
  failedLoad: "Dështoi ngarkimi i profileve",
  failedUpgrade: "Dështoi fillimi i procesit të përmirësimit",
  profileLiked: "Profili u pëlqye!",
  superlikeSent: "⚡ Superpëlqim u dërgua!",
  superlikeOffline: "Jeni jashtë linje. Superpëlqimi do të dërgohet kur të riktheheni online.",
  failedSuperlike: "Dështoi dërgimi i superpëlqimit",
  notEnoughCoins: "Monedha të pamjaftueshme. Ju lutemi rimbushni portofolin tuaj.",
  alreadyMatched: "Jeni tashmë ndeshur me këtë person!",
  rosesSent: "💐 Trëndafila Premium u dërguan! Ndeshje e menjëhershme u krijua me bisedë me trëndafila!",
  outOfSwipes: "Mbaruan lëvizjet! Ju lutemi prisni ose kaloni në premium.",
  profilePassed: "Profili u kalua",
  noRewinds: "Nuk ka më kthime sot!",
  failedUndo: "Dështoi zhbërja e veprimit",
  noImCredits: "Nuk ka kredi për mesazhe të menjëhershme! Blini më shumë për të vazhduar.",
  writeMessage: "Ju lutemi shkruani një mesazh",
  failedMessage: "Dështoi dërgimi i mesazhit",
  spotlightExpired: "Promovuesi juaj Spotlight ka skaduar",
  boost3hFree: "Rritje falas 3-orëshe u aktivizua! ⚡",
  failedBoost: "Dështoi aktivizimi i rritjes",
  signInToBoost: "Ju lutemi kyçuni për të rritur profilin.",
  boost3h: "Rritje 3-orëshe u aktivizua! ⚡",
  boost6h: "Rritje 6-orëshe u aktivizua! ⚡",
  boost10h: "Rritje 10-orëshe u aktivizua! ⚡",
});

// ============================================================
// editProfile
// ============================================================
add(en, 'editProfile', {
  noProfile: "No profile found. Please complete your profile setup first.",
  profileNotFound: "Profile not found. Redirecting to setup...",
  sessionExpired: "Session expired. Please log in again.",
  permissionDenied: "Permission denied. Please check your account status.",
  failedSavePrompt: "Failed to save prompt",
  promptSaved: "Prompt saved!",
  failedUploadPhoto: "Failed to upload photo",
  photoDeleted: "Photo deleted successfully!",
  failedDeletePhoto: "Failed to delete photo",
  photosReordered: "Photos reordered!",
  failedReorder: "Failed to reorder photos",
  geolocationNotSupported: "Geolocation is not supported by your browser",
  detectingLocation: "Detecting your location...",
  cannotDetermineCity: "Could not determine city from your location",
  failedDetectCity: "Failed to detect city. Please enter manually.",
  locationPermissionDenied: "Location permission denied. Please enable location access.",
  locationUnavailable: "Location information unavailable.",
  locationTimeout: "Location request timed out.",
  failedLocation: "Failed to get your location.",
  enterFullName: "Please enter your full name (at least 2 characters)",
  enterValidAge: "Please enter a valid age",
  inappropriateBio: "Your bio contains inappropriate language. Please revise it.",
  profileUpdated: "Profile updated successfully!",
  maxInterests: "You can only select up to 5 interests",
});
addSq(sq, 'editProfile', {
  noProfile: "Nuk u gjet profil. Ju lutemi plotësoni konfigurimin e profilit fillimisht.",
  profileNotFound: "Profili nuk u gjet. Duke ridrejtuar te konfigurimi...",
  sessionExpired: "Sesioni skadoi. Ju lutemi kyçuni sërisht.",
  permissionDenied: "Leja u refuzua. Ju lutemi kontrolloni statusin e llogarisë tuaj.",
  failedSavePrompt: "Dështoi ruajtja e pyetjes",
  promptSaved: "Pyetja u ruajt!",
  failedUploadPhoto: "Dështoi ngarkimi i fotos",
  photoDeleted: "Foto u fshi me sukses!",
  failedDeletePhoto: "Dështoi fshirja e fotos",
  photosReordered: "Fotot u rirenditin!",
  failedReorder: "Dështoi rirenditja e fotove",
  geolocationNotSupported: "Gjeolokalizimi nuk mbështetet nga shfletuesi juaj",
  detectingLocation: "Duke zbuluar vendndodhjen tuaj...",
  cannotDetermineCity: "Nuk mund të përcaktohet qyteti nga vendndodhja juaj",
  failedDetectCity: "Dështoi zbulimi i qytetit. Ju lutemi shkruajeni manualisht.",
  locationPermissionDenied: "Leja e vendndodhjes u refuzua. Ju lutemi aktivizoni aksesin e vendndodhjes.",
  locationUnavailable: "Informacioni i vendndodhjes nuk është i disponueshëm.",
  locationTimeout: "Kërkesa për vendndodhje skadoi.",
  failedLocation: "Dështoi marrja e vendndodhjes suaj.",
  enterFullName: "Ju lutemi shkruani emrin tuaj të plotë (të paktën 2 karaktere)",
  enterValidAge: "Ju lutemi shkruani një moshë të vlefshme",
  inappropriateBio: "Bio juaj përmban gjuhë të papërshtatshme. Ju lutemi rishikojeni.",
  profileUpdated: "Profili u përditësua me sukses!",
  maxInterests: "Mund të zgjidhni deri në 5 interesa",
});

// ============================================================
// datePlanner
// ============================================================
add(en, 'datePlanner', {
  failedLoad: "Failed to load date planner.",
  fillRequired: "Please complete all required fields.",
  createdNoChat: "Date created but failed to notify in chat.",
  createdNoMatch: "Date created but couldn't send chat notification — no match found.",
  created: "Date plan created & partner notified in chat!",
  failedCreate: "Failed to create date plan.",
  expired: "This date plan has already expired and cannot be accepted.",
  failedUpdate: "Failed to update plan status.",
  planUpdated: "Plan updated.",
});
addSq(sq, 'datePlanner', {
  failedLoad: "Dështoi ngarkimi i planifikuesit të takimit.",
  fillRequired: "Ju lutemi plotësoni të gjitha fushat e detyrueshme.",
  createdNoChat: "Takimi u krijua por dështoi njoftimi në bisedë.",
  createdNoMatch: "Takimi u krijua por nuk mund të dërgohej njoftimi — nuk u gjet ndeshje.",
  created: "Plani i takimit u krijua & partneri u njoftua në bisedë!",
  failedCreate: "Dështoi krijimi i planit të takimit.",
  expired: "Ky plan takimi ka skaduar tashmë dhe nuk mund të pranohet.",
  failedUpdate: "Dështoi përditësimi i statusit të planit.",
  planUpdated: "Plani u përditësua.",
});

// ============================================================
// activityFeed
// ============================================================
add(en, 'activityFeed', { failedLoad: "Failed to load activity feed." });
addSq(sq, 'activityFeed', { failedLoad: "Dështoi ngarkimi i aktivitetit." });

// ============================================================
// blockedUsers
// ============================================================
add(en, 'blockedUsers', {
  failedLoad: "Failed to load blocked users.",
  failedUnblock: "Failed to unblock user.",
  unblocked: "User unblocked.",
});
addSq(sq, 'blockedUsers', {
  failedLoad: "Dështoi ngarkimi i përdoruesve të bllokuar.",
  failedUnblock: "Dështoi zhbllokimi i përdoruesit.",
  unblocked: "Përdoruesi u zhbllokua.",
});

// ============================================================
// boostBundles
// ============================================================
add(en, 'boostBundles', {
  notEnoughCoins: "Not enough coins. Please top up your wallet.",
  failedActivate: "Failed to activate boost.",
});
addSq(sq, 'boostBundles', {
  notEnoughCoins: "Monedha të pamjaftueshme. Ju lutemi rimbushni portofolin tuaj.",
  failedActivate: "Dështoi aktivizimi i rritjes.",
});

// ============================================================
// callHistory
// ============================================================
add(en, 'callHistory', { failedLoad: "Failed to load call history." });
addSq(sq, 'callHistory', { failedLoad: "Dështoi ngarkimi i historikut të thirrjeve." });

// ============================================================
// dailyRewards  (alreadyClaimed/failed may already exist — overwrite with exact strings)
// ============================================================
add(en, 'dailyRewards', {
  toastAlreadyClaimed: "You already claimed today.",
  toastFailed: "Failed to claim daily reward.",
});
addSq(sq, 'dailyRewards', {
  toastAlreadyClaimed: "E keni marrë tashmë shpërblimin e sotëm.",
  toastFailed: "Dështoi marrja e shpërblimit ditor.",
});

// ============================================================
// matches
// ============================================================
add(en, 'matches', {
  bookmarkRemoved: "Bookmark removed",
  matchBookmarked: "Match bookmarked ⭐",
  failedBookmark: "Failed to update bookmark",
  failedLoadIm: "Failed to load instant messages",
  failedLoad: "Failed to load matches",
  failedUnmatch: "Failed to unmatch",
  itsAMatch: "🎉 It's a Match! You can now chat with them!",
  likeSent: "Like sent! 💕",
  failedLike: "Failed to send like",
  failedLoadProfile: "Failed to load profile",
  failedLoadConversation: "Failed to load conversation",
  messageLimitReached: "Message limit reached! Like their profile to unlock unlimited messaging.",
  failedSendMessage: "Failed to send message",
  replySent: "Reply sent! Keep messaging in Instant Messages tab.",
  failedReply: "Failed to send reply",
});
addSq(sq, 'matches', {
  bookmarkRemoved: "Faqeshënuesi u hoq",
  matchBookmarked: "Ndeshja u faqeshënua ⭐",
  failedBookmark: "Dështoi përditësimi i faqeshënuesit",
  failedLoadIm: "Dështoi ngarkimi i mesazheve të menjëhershme",
  failedLoad: "Dështoi ngarkimi i ndeshjeve",
  failedUnmatch: "Dështoi heqja e ndeshjes",
  itsAMatch: "🎉 Është një Ndeshje! Tani mund të bisedoni me ta!",
  likeSent: "Pëlqimi u dërgua! 💕",
  failedLike: "Dështoi dërgimi i pëlqimit",
  failedLoadProfile: "Dështoi ngarkimi i profilit",
  failedLoadConversation: "Dështoi ngarkimi i bisedës",
  messageLimitReached: "Kufiri i mesazheve u arrit! Pëlqejeni profilin e tyre për të zhbllokuar mesazhe të pakufizuara.",
  failedSendMessage: "Dështoi dërgimi i mesazhit",
  replySent: "Përgjigja u dërgua! Vazhdoni mesazhet në skedën e Mesazheve të Menjëhershme.",
  failedReply: "Dështoi dërgimi i përgjigjes",
});

// ============================================================
// settings
// ============================================================
add(en, 'settings', {
  fillAllFields: "Please fill in all fields",
  passwordMin: "New password must be at least 6 characters",
  passwordsDoNotMatch: "Passwords do not match",
  unableVerify: "Unable to verify account",
  wrongPassword: "Current password is incorrect",
  passwordUpdated: "Password updated successfully",
  sessionExpired: "Session expired. Please log in again.",
  failedLoad: "Failed to load settings. Please try refreshing the page.",
  noEmail: "No registered email found on your account",
  enterOtpCode: "Please enter the OTP code",
  accountVerified: "Account verified! ✓ Your verified badge is now active.",
  accountDeleted: "Account permanently deleted",
  discoveryUpdated: "Discovery settings updated successfully!",
  failedDiscovery: "Failed to update discovery settings",
  linkCopied: "Invite link copied to clipboard!",
  notificationsUnsupported: "Notifications are not supported in this browser.",
  pushEnabled: "Push notifications enabled.",
  pushNotEnabled: "Push notifications not enabled.",
  pushSaved: "Push subscription saved.",
  failedPush: "Failed to enable push.",
  pushRemoved: "Push subscription removed.",
  failedDisablePush: "Failed to disable push.",
  failedReport: "Failed to submit request.",
  openingSubscription: "Opening subscription management...",
  failedCancelMembership: "Failed to cancel membership. Please try again.",
  dndDisabled: "DND disabled",
  supportMsg: "Thank you for your support! ❤️",
  followUs: "Follow us @shqiponja on social media!",
  aboutApp: "Shqiponja — Where hearts connect. v1.0.0",
  preparingExport: "Preparing your data export...",
  dataExported: "Data exported successfully!",
  failedExport: "Failed to export data. Please try again.",
});
addSq(sq, 'settings', {
  fillAllFields: "Ju lutemi plotësoni të gjitha fushat",
  passwordMin: "Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere",
  passwordsDoNotMatch: "Fjalëkalimet nuk përputhen",
  unableVerify: "Nuk mund të verifikohet llogaria",
  wrongPassword: "Fjalëkalimi aktual është i gabuar",
  passwordUpdated: "Fjalëkalimi u përditësua me sukses",
  sessionExpired: "Sesioni skadoi. Ju lutemi kyçuni sërisht.",
  failedLoad: "Dështoi ngarkimi i cilësimeve. Ju lutemi rifreskoni faqen.",
  noEmail: "Nuk u gjet email i regjistruar në llogarinë tuaj",
  enterOtpCode: "Ju lutemi shkruani kodin OTP",
  accountVerified: "Llogaria u verifikua! ✓ Distinktivi juaj i verifikimit është tani aktiv.",
  accountDeleted: "Llogaria u fshi përgjithmonë",
  discoveryUpdated: "Cilësimet e zbulimit u përditësuan me sukses!",
  failedDiscovery: "Dështoi përditësimi i cilësimeve të zbulimit",
  linkCopied: "Lidhja e ftesës u kopjua në clipboard!",
  notificationsUnsupported: "Njoftimet nuk mbështeten në këtë shfletues.",
  pushEnabled: "Njoftimet push u aktivizuan.",
  pushNotEnabled: "Njoftimet push nuk u aktivizuan.",
  pushSaved: "Abonimet push u ruajt.",
  failedPush: "Dështoi aktivizimi i push.",
  pushRemoved: "Abonimet push u hoq.",
  failedDisablePush: "Dështoi çaktivizimi i push.",
  failedReport: "Dështoi dërgimi i kërkesës.",
  openingSubscription: "Duke hapur menaxhimin e abonimit...",
  failedCancelMembership: "Dështoi anulimi i anëtarësimit. Ju lutemi provoni sërisht.",
  dndDisabled: "DND u çaktivizua",
  supportMsg: "Faleminderit për mbështetjen tuaj! ❤️",
  followUs: "Ndiqni @shqiponja në rrjetet sociale!",
  aboutApp: "Shqiponja — Ku zemrat lidhen. v1.0.0",
  preparingExport: "Duke përgatitur eksportimin e të dhënave tuaja...",
  dataExported: "Të dhënat u eksportuan me sukses!",
  failedExport: "Dështoi eksportimi i të dhënave. Ju lutemi provoni sërisht.",
});

// ============================================================
// profileSetup
// ============================================================
add(en, 'profileSetup', {
  geolocationNotSupported: "Geolocation is not supported by your browser",
  locationDetected: "Location detected!",
  locationUnavailable: "Location unavailable. Check your device settings.",
  failedGetLocation: "Failed to get location. You can still use the app.",
  imageTooLarge: "Image must be less than 5MB",
  waitForAuth: "Please wait for authentication to complete",
  authRequired: "Authentication required. Please refresh and sign in again.",
  cannotUpload: "Cannot upload: User ID not available",
  photoUploaded: "Profile photo uploaded! ✓",
  bucketNotConfigured: "Storage bucket not configured. Please run database fix first.",
  storagePermissions: "Storage permissions not configured. Please run database fix first.",
  invalidFormat: "Invalid file format. Please select a valid image.",
  selfieUploaded: "Verification selfie uploaded! ✓",
  mustBeLoggedIn: "You must be logged in",
  uploadPhotoRequired: "Please upload a profile photo",
  inappropriateBio: "Your bio contains inappropriate language. Please revise it.",
  profileCreated: "Profile created successfully!",
});
addSq(sq, 'profileSetup', {
  geolocationNotSupported: "Gjeolokalizimi nuk mbështetet nga shfletuesi juaj",
  locationDetected: "Vendndodhja u zbulua!",
  locationUnavailable: "Vendndodhja nuk është e disponueshme. Kontrolloni cilësimet e pajisjes.",
  failedGetLocation: "Dështoi marrja e vendndodhjes. Mund ta përdorni aplikacionin prapëseprapë.",
  imageTooLarge: "Imazhi duhet të jetë më pak se 5MB",
  waitForAuth: "Ju lutemi prisni që autentikimi të përfundojë",
  authRequired: "Autentikimi kërkohet. Ju lutemi rifreskoni dhe kyçuni sërisht.",
  cannotUpload: "Nuk mund të ngarkohet: ID e përdoruesit nuk është e disponueshme",
  photoUploaded: "Foto e profilit u ngarkua! ✓",
  bucketNotConfigured: "Kova e ruajtjes nuk është konfiguruar. Ju lutemi ekzekutoni rregullimin e bazës së të dhënave fillimisht.",
  storagePermissions: "Lejet e ruajtjes nuk janë konfiguruar. Ju lutemi ekzekutoni rregullimin e bazës së të dhënave fillimisht.",
  invalidFormat: "Format i pavlefshëm imazhi. Ju lutemi zgjidhni një imazh të vlefshëm.",
  selfieUploaded: "Selfie verifikimi u ngarkua! ✓",
  mustBeLoggedIn: "Duhet të jeni të kyçur",
  uploadPhotoRequired: "Ju lutemi ngarkoni një foto profili",
  inappropriateBio: "Bio juaj përmban gjuhë të papërshtatshme. Ju lutemi rishikojeni.",
  profileCreated: "Profili u krijua me sukses!",
});

// ============================================================
// radar
// ============================================================
add(en, 'radar', {
  failedLoad: "Failed to load nearby users",
  alreadyLiked: "You've already liked this user!",
  itsAMatch: "🎉 It's a match! You can now chat with them!",
  superlikeSent: "⚡ Superlike sent!",
  failedSuperlike: "Failed to send superlike",
});
addSq(sq, 'radar', {
  failedLoad: "Dështoi ngarkimi i përdoruesve afër",
  alreadyLiked: "E keni pëlqyer tashmë këtë përdorues!",
  itsAMatch: "🎉 Është një ndeshje! Tani mund të bisedoni me ta!",
  superlikeSent: "⚡ Superpëlqim u dërgua!",
  failedSuperlike: "Dështoi dërgimi i superpëlqimit",
});

// ============================================================
// videoIntro
// ============================================================
add(en, 'videoIntro', {
  failedUpload: "Failed to upload video intro.",
  failedSaveLink: "Failed to save video intro link.",
  failedRemove: "Failed to remove video intro.",
  failedLoadVideos: "Failed to load videos",
  loginToRate: "Please log in to rate videos",
  failedRating: "Failed to submit rating",
  cameraError: "Could not access camera",
  danceUploaded: "Dance video uploaded! 🎉",
  failedUploadVideo: "Failed to upload video",
});
addSq(sq, 'videoIntro', {
  failedUpload: "Dështoi ngarkimi i hyrjes video.",
  failedSaveLink: "Dështoi ruajtja e lidhjes së hyrjes video.",
  failedRemove: "Dështoi heqja e hyrjes video.",
  failedLoadVideos: "Dështoi ngarkimi i videove",
  loginToRate: "Ju lutemi kyçuni për të vlerësuar videot",
  failedRating: "Dështoi dërgimi i vlerësimit",
  cameraError: "Nuk mund të aksesohet kamera",
  danceUploaded: "Videoja e vallëzimit u ngarkua! 🎉",
  failedUploadVideo: "Dështoi ngarkimi i videos",
});

// ============================================================
// ghostAlerts
// ============================================================
add(en, 'ghostAlerts', { failedNudge: "Failed to send nudge" });
addSq(sq, 'ghostAlerts', { failedNudge: "Dështoi dërgimi i kujtesës" });

// ============================================================
// icebreakerGames
// ============================================================
add(en, 'icebreakerGames', {
  answersCopied: "Answers copied! Paste in chat to share 📋",
  copyFailed: "Couldn't copy — try again",
});
addSq(sq, 'icebreakerGames', {
  answersCopied: "Përgjigjet u kopjuan! Ngjisni në bisedë për të ndarë 📋",
  copyFailed: "Nuk mund të kopjohej — provoni sërisht",
});

// ============================================================
// inviteFriends
// ============================================================
add(en, 'inviteFriends', {
  linkCopied: "Invite link copied.",
  copyManually: "Copy the link manually.",
  shareError: "Unable to share invite.",
  copyError: "Unable to copy link.",
});
addSq(sq, 'inviteFriends', {
  linkCopied: "Lidhja e ftesës u kopjua.",
  copyManually: "Kopjoni lidhjen manualisht.",
  shareError: "Nuk mund të ndahej ftesa.",
  copyError: "Nuk mund të kopjohej lidhja.",
});

// ============================================================
// matchGoals
// ============================================================
add(en, 'matchGoals', { failedLoad: "Failed to load goals." });
addSq(sq, 'matchGoals', { failedLoad: "Dështoi ngarkimi i qëllimeve." });

// ============================================================
// matchInsights
// ============================================================
add(en, 'matchInsights', { failedLoad: "Failed to load match insights" });
addSq(sq, 'matchInsights', { failedLoad: "Dështoi ngarkimi i analizave të ndeshjes" });

// ============================================================
// moodStatus
// ============================================================
add(en, 'moodStatus', { moodSet: "Mood set! {{emoji}}" });
addSq(sq, 'moodStatus', { moodSet: "Gjendja shpirtërore u vendos! {{emoji}}" });

// ============================================================
// profile (MyProfile.tsx)
// ============================================================
add(en, 'profile', {
  failedLoad: "Failed to load profile",
  photoUpdated: "Profile photo updated!",
  failedUploadPhoto: "Failed to upload photo",
  linkCopied: "Profile link copied!",
});
addSq(sq, 'profile', {
  failedLoad: "Dështoi ngarkimi i profilit",
  photoUpdated: "Foto e profilit u përditësua!",
  failedUploadPhoto: "Dështoi ngarkimi i fotos",
  linkCopied: "Lidhja e profilit u kopjua!",
});

// ============================================================
// notificationsCenter
// ============================================================
add(en, 'notificationsCenter', {
  pushSent: "Push sent.",
  failedPush: "Failed to send push.",
});
addSq(sq, 'notificationsCenter', {
  pushSent: "Push u dërgua.",
  failedPush: "Dështoi dërgimi i push.",
});

// ============================================================
// premiumSuccess
// ============================================================
add(en, 'premiumSuccess', {
  welcomePremium: "Welcome to Shqiponja Premium! 🎉",
  errorVerifying: "Error verifying subscription",
});
addSq(sq, 'premiumSuccess', {
  welcomePremium: "Mirë se vini në Shqiponja Premium! 🎉",
  errorVerifying: "Gabim gjatë verifikimit të abonimit",
});

// ============================================================
// profileInsights
// ============================================================
add(en, 'profileInsights', { failedLoad: "Failed to load insights." });
addSq(sq, 'profileInsights', { failedLoad: "Dështoi ngarkimi i analizave." });

// ============================================================
// profileSoundtrack
// ============================================================
add(en, 'profileSoundtrack', {
  invalidLink: "Please paste a valid YouTube or Spotify link",
  saved: "Soundtrack saved!",
  failedSave: "Failed to save soundtrack",
  removed: "Soundtrack removed",
  failedRemove: "Failed to remove",
});
addSq(sq, 'profileSoundtrack', {
  invalidLink: "Ju lutemi ngjisni një lidhje të vlefshme YouTube ose Spotify",
  saved: "Melodia e profilit u ruajt!",
  failedSave: "Dështoi ruajtja e melodisë",
  removed: "Melodia e profilit u hoq",
  failedRemove: "Dështoi heqja",
});

// ============================================================
// profileVerification
// ============================================================
add(en, 'profileVerification', {
  cameraDenied: "Camera access denied. Please allow camera access or upload a photo instead.",
  selfieFirst: "Please provide a selfie first.",
  submitted: "Verification request submitted! We'll review it within 24-48h.",
  failedSubmit: "Failed to submit request.",
});
addSq(sq, 'profileVerification', {
  cameraDenied: "Aksesi i kamerës u refuzua. Ju lutemi lejoni aksesin e kamerës ose ngarkoni një foto.",
  selfieFirst: "Ju lutemi siguroni fillimisht një selfie.",
  submitted: "Kërkesa e verifikimit u dërgua! Do ta rishikojmë brenda 24-48 orësh.",
  failedSubmit: "Dështoi dërgimi i kërkesës.",
});

// ============================================================
// recentlyViewed
// ============================================================
add(en, 'recentlyViewed', { failedLoad: "Failed to load recently viewed profiles." });
addSq(sq, 'recentlyViewed', { failedLoad: "Dështoi ngarkimi i profileve të shikuara kohët e fundit." });

// ============================================================
// savedProfiles
// ============================================================
add(en, 'savedProfiles', {
  failedLoad: "Failed to load saved profiles.",
  failedRemoveBookmark: "Failed to remove bookmark",
});
addSq(sq, 'savedProfiles', {
  failedLoad: "Dështoi ngarkimi i profileve të ruajtura.",
  failedRemoveBookmark: "Dështoi heqja e faqeshënuesit",
});

// ============================================================
// secondLook
// ============================================================
add(en, 'secondLook', { failedLike: "Failed to like this profile" });
addSq(sq, 'secondLook', { failedLike: "Dështoi pëlqimi i këtij profili" });

// ============================================================
// superlikeSuccess
// ============================================================
add(en, 'superlikeSuccess', { superlikesAdded: "Super Likes added to your account! ⚡" });
addSq(sq, 'superlikeSuccess', { superlikesAdded: "Super Pëlqimet u shtuan në llogarinë tuaj! ⚡" });

// ============================================================
// wallet
// ============================================================
add(en, 'wallet', {
  invalidAmount: "Invalid coin amount",
  failedUpdate: "Failed to update wallet",
});
addSq(sq, 'wallet', {
  invalidAmount: "Sasi e pavlefshme monedhash",
  failedUpdate: "Dështoi përditësimi i portofolit",
});

// ============================================================
// whoLikedYou
// ============================================================
add(en, 'whoLikedYou', {
  failedLoad: "Failed to load likes",
  failedStreakCredit: "Failed to use streak credit",
  likeSent: "Like sent! ❤️",
  failedLike: "Failed to like profile",
});
addSq(sq, 'whoLikedYou', {
  failedLoad: "Dështoi ngarkimi i pëlqimeve",
  failedStreakCredit: "Dështoi përdorimi i kreditit të serisë",
  likeSent: "Pëlqimi u dërgua! ❤️",
  failedLike: "Dështoi pëlqimi i profilit",
});

// ============================================================
// pushPrompt
// ============================================================
add(en, 'pushPrompt', {
  enabled: "Push notifications enabled!",
  failed: "Could not enable notifications.",
});
addSq(sq, 'pushPrompt', {
  enabled: "Njoftimet push u aktivizuan!",
  failed: "Nuk mund të aktivizohen njoftimet.",
});

// ============================================================
// report
// ============================================================
add(en, 'report', {
  pleaseSelect: "Please select a reason",
  submitted: "Report submitted. Thank you for keeping the community safe.",
  failedSubmit: "Failed to submit report. Please try again.",
});
addSq(sq, 'report', {
  pleaseSelect: "Ju lutemi zgjidhni një arsye",
  submitted: "Raporti u dërgua. Faleminderit për mbajtjen e komunitetit të sigurt.",
  failedSubmit: "Dështoi dërgimi i raportit. Ju lutemi provoni sërisht.",
});

// ============================================================
// travelMode
// ============================================================
add(en, 'travelMode', {
  pleaseSelect: "Please select a destination",
  locationNotFound: "Could not find that location. Please try again.",
  backHome: "Back to your home location",
});
addSq(sq, 'travelMode', {
  pleaseSelect: "Ju lutemi zgjidhni një destinacion",
  locationNotFound: "Nuk mund të gjendej ai vendndodhje. Ju lutemi provoni sërisht.",
  backHome: "Kthimi te vendndodhja juaj e shtëpisë",
});

// ============================================================
// Write output
// ============================================================
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
fs.writeFileSync(sqPath, JSON.stringify(sq, null, 2));
console.log('✅ Done! Both locale files updated.');

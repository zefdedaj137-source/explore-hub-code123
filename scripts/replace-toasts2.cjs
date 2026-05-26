// Replace toasts in Chat.tsx, Discover.tsx, and add useTranslation to VideoFeed/VideoRecorder
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '../src');

function replace(filePath, pairs) {
  const full = path.join(base, filePath);
  let content = fs.readFileSync(full, 'utf8');
  for (const [from, to] of pairs) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(full, content);
  console.log('✅', filePath);
}

// ============================================================
// Chat.tsx
replace('pages/Chat.tsx', [
  ['toast.error("Failed to send voice message")', 'toast.error(t("chat.failedVoice"))'],
  ['toast.error("Failed to send photo")', 'toast.error(t("chat.failedPhoto"))'],
  ['toast.success("Date plan canceled.")', 'toast.success(t("chat.dateCanceled"))'],
  ['toast.error("Failed to cancel date plan.")', 'toast.error(t("chat.failedCancelDate"))'],
  ['toast.success("Date accepted! 🎉")', 'toast.success(t("chat.dateAccepted"))'],
  ['toast.success("Date declined.")', 'toast.success(t("chat.dateDeclined"))'],
  ['toast.error("Failed to respond to date plan.")', 'toast.error(t("chat.failedDateResponse"))'],
  ['toast.error("Please fill in date/time and location.")', 'toast.error(t("chat.fillDateLocation"))'],
  ['toast.success("Date plan created!")', 'toast.success(t("chat.datePlanCreated"))'],
  ['toast.error("Failed to create date plan.")', 'toast.error(t("chat.failedCreateDate"))'],
  ['toast.error("Your message contains inappropriate language. Please revise it.")', 'toast.error(t("chat.inappropriateMsg"))'],
  ["toast.info(\"You're offline. Message will be sent when connection returns.\")", 'toast.info(t("chat.offlineMessage"))'],
  ['if (reactionsTableMissing.current) toast.error("Reactions not available yet")', 'if (reactionsTableMissing.current) toast.error(t("chat.reactionsUnavailable"))'],
  ['toast.error("Reactions not available yet")', 'toast.error(t("chat.reactionsUnavailable"))'],
  ['toast.error("Failed to delete message")', 'toast.error(t("chat.failedDeleteMsg"))'],
  ['toast.success("Message deleted")', 'toast.success(t("chat.messageDeleted"))'],
  ['toast.error("Failed to send GIF")', 'toast.error(t("chat.failedGif"))'],
  ['toast.error("Failed to unmatch")', 'toast.error(t("chat.failedUnmatch"))'],
  ["toast.success(\"User blocked. You won't receive calls or messages.\")", 'toast.success(t("chat.userBlocked"))'],
  ['toast.error("Failed to block user")', 'toast.error(t("chat.failedBlock"))'],
  ['toast.success("User unblocked.")', 'toast.success(t("chat.userUnblocked"))'],
  ['toast.error("Failed to unblock user")', 'toast.error(t("chat.failedUnblock"))'],
]);

// ============================================================
// Discover.tsx
replace('pages/Discover.tsx', [
  ['toast.error("Discovery update required. Please contact support.")', 'toast.error(t("discover.discoveryUpdateRequired"))'],
  ['toast.error("Failed to load profiles")', 'toast.error(t("discover.failedLoad"))'],
  ['toast.error("Failed to start upgrade process")', 'toast.error(t("discover.failedUpgrade"))'],
  ['toast.success("Profile liked!")', 'toast.success(t("discover.profileLiked"))'],
  ['toast.success("⚡ Superlike sent!")', 'toast.success(t("discover.superlikeSent"))'],
  ["toast.info(\"You're offline. Superlike will be sent when connection returns.\")", 'toast.info(t("discover.superlikeOffline"))'],
  ['toast.error("Failed to send superlike")', 'toast.error(t("discover.failedSuperlike"))'],
  ['toast.error("Not enough coins. Please top up your wallet.")', 'toast.error(t("discover.notEnoughCoins"))'],
  ["toast.info(\"You're already matched with this person!\")", 'toast.info(t("discover.alreadyMatched"))'],
  ['toast.success("💐 Premium Roses sent! Instant match created with rose-themed chat!")', 'toast.success(t("discover.rosesSent"))'],
  ['toast.info("Out of swipes! Please wait or upgrade to premium.")', 'toast.info(t("discover.outOfSwipes"))'],
  ['toast.success("Profile passed")', 'toast.success(t("discover.profilePassed"))'],
  ['toast.error("No rewinds remaining today!")', 'toast.error(t("discover.noRewinds"))'],
  ['toast.error("Failed to undo action")', 'toast.error(t("discover.failedUndo"))'],
  ['toast.error("No instant message credits! Purchase more to continue.")', 'toast.error(t("discover.noImCredits"))'],
  ['toast.error("Please write a message")', 'toast.error(t("discover.writeMessage"))'],
  ['toast.error("Failed to send message")', 'toast.error(t("discover.failedMessage"))'],
  ['toast.info("Your Spotlight Booster has expired")', 'toast.info(t("discover.spotlightExpired"))'],
  ['toast.success("Free 3-hour boost activated! ⚡")', 'toast.success(t("discover.boost3hFree"))'],
  ['toast.error("Failed to activate boost")', 'toast.error(t("discover.failedBoost"))'],
  ['toast.error("Please sign in to boost.")', 'toast.error(t("discover.signInToBoost"))'],
  ['toast.success("3-hour boost activated! ⚡")', 'toast.success(t("discover.boost3h"))'],
  ['toast.success("6-hour boost activated! ⚡")', 'toast.success(t("discover.boost6h"))'],
  ['toast.success("10-hour boost activated! ⚡")', 'toast.success(t("discover.boost10h"))'],
]);

// ============================================================
// VideoFeed.tsx — add useTranslation and replace toasts
const videoFeedPath = path.join(base, 'components/VideoFeed.tsx');
let videoFeed = fs.readFileSync(videoFeedPath, 'utf8');

// Add useTranslation import if not present
if (!videoFeed.includes('useTranslation')) {
  // Find first import line and add after it
  const firstImportEnd = videoFeed.indexOf('\n', videoFeed.indexOf('import ')) + 1;
  videoFeed = videoFeed.slice(0, firstImportEnd) +
    'import { useTranslation } from "react-i18next";\n' +
    videoFeed.slice(firstImportEnd);
  console.log('  Added useTranslation import to VideoFeed.tsx');
}

// Add const { t } = useTranslation() after function component opening
if (!videoFeed.includes('const { t }')) {
  // Find the first function body opening { after component declaration
  const funcMatch = videoFeed.match(/const\s+\w+[^{]+{/);
  if (funcMatch) {
    const insertPos = videoFeed.indexOf(funcMatch[0]) + funcMatch[0].length;
    videoFeed = videoFeed.slice(0, insertPos) +
      '\n  const { t } = useTranslation();' +
      videoFeed.slice(insertPos);
    console.log('  Added const { t } to VideoFeed.tsx');
  }
}

// Replace toast strings (strip dynamic parts)
videoFeed = videoFeed
  .replace(/toast\.error\("Failed to load videos: " \+ \(error as Error\)\.message\)/g, 'toast.error(t("videoIntro.failedLoadVideos"))')
  .replace(/toast\.error\("Please log in to rate videos"\)/g, 'toast.error(t("videoIntro.loginToRate"))')
  .replace(/toast\.error\("Failed to submit rating: " \+ \(error as Error\)\.message\)/g, 'toast.error(t("videoIntro.failedRating"))');

fs.writeFileSync(videoFeedPath, videoFeed);
console.log('✅ components/VideoFeed.tsx');

// ============================================================
// VideoRecorder.tsx — add useTranslation and replace toasts
const videoRecorderPath = path.join(base, 'components/VideoRecorder.tsx');
let videoRecorder = fs.readFileSync(videoRecorderPath, 'utf8');

if (!videoRecorder.includes('useTranslation')) {
  const firstImportEnd = videoRecorder.indexOf('\n', videoRecorder.indexOf('import ')) + 1;
  videoRecorder = videoRecorder.slice(0, firstImportEnd) +
    'import { useTranslation } from "react-i18next";\n' +
    videoRecorder.slice(firstImportEnd);
  console.log('  Added useTranslation import to VideoRecorder.tsx');
}

if (!videoRecorder.includes('const { t }')) {
  const funcMatch = videoRecorder.match(/const\s+\w+[^{]+{/);
  if (funcMatch) {
    const insertPos = videoRecorder.indexOf(funcMatch[0]) + funcMatch[0].length;
    videoRecorder = videoRecorder.slice(0, insertPos) +
      '\n  const { t } = useTranslation();' +
      videoRecorder.slice(insertPos);
    console.log('  Added const { t } to VideoRecorder.tsx');
  }
}

videoRecorder = videoRecorder
  .replace(/toast\.error\("Could not access camera: " \+ \(error as Error\)\.message\)/g, 'toast.error(t("videoIntro.cameraError"))')
  .replace(/toast\.success\("Dance video uploaded! 🎉"\)/g, 'toast.success(t("videoIntro.danceUploaded"))')
  .replace(/toast\.error\("Failed to upload video: " \+ \(error as Error\)\.message\)/g, 'toast.error(t("videoIntro.failedUploadVideo"))');

fs.writeFileSync(videoRecorderPath, videoRecorder);
console.log('✅ components/VideoRecorder.tsx');

console.log('\n🎉 All remaining files processed!');

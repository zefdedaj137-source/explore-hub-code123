// Batch replace all raw toast strings in all pages/components
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
// BlockedUsers
replace('pages/BlockedUsers.tsx', [
  ['toast.error("Failed to load blocked users.")', 'toast.error(t("blockedUsers.failedLoad"))'],
  ['toast.error("Failed to unblock user.")', 'toast.error(t("blockedUsers.failedUnblock"))'],
  ['toast.success("User unblocked.")', 'toast.success(t("blockedUsers.unblocked"))'],
]);

// BoostBundles
replace('pages/BoostBundles.tsx', [
  ['toast.error("Not enough coins. Please top up your wallet.")', 'toast.error(t("boostBundles.notEnoughCoins"))'],
  ['toast.error("Failed to activate boost.")', 'toast.error(t("boostBundles.failedActivate"))'],
]);

// CallHistory
replace('pages/CallHistory.tsx', [
  ['toast.error("Failed to load call history.")', 'toast.error(t("callHistory.failedLoad"))'],
]);

// DailyRewards
replace('pages/DailyRewards.tsx', [
  ['toast.info("You already claimed today.")', 'toast.info(t("dailyRewards.toastAlreadyClaimed"))'],
  ['toast.error("Failed to claim daily reward.")', 'toast.error(t("dailyRewards.toastFailed"))'],
]);

// GhostModeAlert
replace('pages/GhostModeAlert.tsx', [
  ['toast.error("Failed to send nudge")', 'toast.error(t("ghostAlerts.failedNudge"))'],
]);

// IcebreakerGames
replace('pages/IcebreakerGames.tsx', [
  ['toast.success("Answers copied! Paste in chat to share 📋")', 'toast.success(t("icebreakerGames.answersCopied"))'],
  ['toast.error("Couldn\'t copy — try again")', 'toast.error(t("icebreakerGames.copyFailed"))'],
]);

// InviteFriends
replace('pages/InviteFriends.tsx', [
  ['toast.success("Invite link copied.")', 'toast.success(t("inviteFriends.linkCopied"))'],
  ['toast.info("Copy the link manually.")', 'toast.info(t("inviteFriends.copyManually"))'],
  ['toast.error("Unable to share invite.")', 'toast.error(t("inviteFriends.shareError"))'],
  ['toast.error("Unable to copy link.")', 'toast.error(t("inviteFriends.copyError"))'],
]);

// MatchGoals
replace('pages/MatchGoals.tsx', [
  ['toast.error("Failed to load goals.")', 'toast.error(t("matchGoals.failedLoad"))'],
]);

// MatchInsights
replace('pages/MatchInsights.tsx', [
  ['toast.error("Failed to load match insights")', 'toast.error(t("matchInsights.failedLoad"))'],
]);

// MoodStatus
replace('pages/MoodStatus.tsx', [
  [
    'toast.success("Mood set! " + selectedEmoji)',
    'toast.success(t("moodStatus.moodSet", { emoji: selectedEmoji }))',
  ],
]);

// MyProfile
replace('pages/MyProfile.tsx', [
  ['toast.error("Failed to load profile")', 'toast.error(t("profile.failedLoad"))'],
  ['toast.success("Profile photo updated!")', 'toast.success(t("profile.photoUpdated"))'],
  ['toast.error("Failed to upload photo")', 'toast.error(t("profile.failedUploadPhoto"))'],
  ['toast.success("Profile link copied!")', 'toast.success(t("profile.linkCopied"))'],
]);

// NotificationsCenter
replace('pages/NotificationsCenter.tsx', [
  ['toast.success("Push sent.")', 'toast.success(t("notificationsCenter.pushSent"))'],
  ['toast.error("Failed to send push.")', 'toast.error(t("notificationsCenter.failedPush"))'],
]);

// PremiumSuccess
replace('pages/PremiumSuccess.tsx', [
  ['toast.success("Welcome to Shqiponja Premium! 🎉")', 'toast.success(t("premiumSuccess.welcomePremium"))'],
  ['toast.error("Error verifying subscription")', 'toast.error(t("premiumSuccess.errorVerifying"))'],
]);

// ProfileInsights
replace('pages/ProfileInsights.tsx', [
  ['toast.error("Failed to load insights.")', 'toast.error(t("profileInsights.failedLoad"))'],
]);

// ProfileSoundtrack
replace('pages/ProfileSoundtrack.tsx', [
  ['toast.error("Please paste a valid YouTube or Spotify link")', 'toast.error(t("profileSoundtrack.invalidLink"))'],
  ['toast.success("Soundtrack saved!")', 'toast.success(t("profileSoundtrack.saved"))'],
  ['toast.error("Failed to save soundtrack")', 'toast.error(t("profileSoundtrack.failedSave"))'],
  ['toast.success("Soundtrack removed")', 'toast.success(t("profileSoundtrack.removed"))'],
  ['toast.error("Failed to remove")', 'toast.error(t("profileSoundtrack.failedRemove"))'],
]);

// ProfileVerification
replace('pages/ProfileVerification.tsx', [
  ['toast.error("Camera access denied. Please allow camera access or upload a photo instead.")', 'toast.error(t("profileVerification.cameraDenied"))'],
  ['toast.error("Please provide a selfie first.")', 'toast.error(t("profileVerification.selfieFirst"))'],
  ['toast.success("Verification request submitted! We\'ll review it within 24-48h.")', 'toast.success(t("profileVerification.submitted"))'],
  ['toast.error("Failed to submit request.")', 'toast.error(t("profileVerification.failedSubmit"))'],
]);

// RecentlyViewed
replace('pages/RecentlyViewed.tsx', [
  ['toast.error("Failed to load recently viewed profiles.")', 'toast.error(t("recentlyViewed.failedLoad"))'],
]);

// SavedProfiles
replace('pages/SavedProfiles.tsx', [
  ['toast.error("Failed to load saved profiles.")', 'toast.error(t("savedProfiles.failedLoad"))'],
  ['toast.error("Failed to remove bookmark")', 'toast.error(t("savedProfiles.failedRemoveBookmark"))'],
  ['toast.success("Bookmark removed")', 'toast.success(t("savedProfiles.bookmarkRemoved"))'],
]);

// SecondLook
replace('pages/SecondLook.tsx', [
  ['toast.error("Failed to like this profile")', 'toast.error(t("secondLook.failedLike"))'],
]);

// SuperlikeSuccess
replace('pages/SuperlikeSuccess.tsx', [
  ['toast.success("Super Likes added to your account! ⚡")', 'toast.success(t("superlikeSuccess.superlikesAdded"))'],
]);

// VideoIntro
replace('pages/VideoIntro.tsx', [
  ['toast.success("Video intro updated.")', 'toast.success(t("videoIntro.videoUpdated"))'],
  ['toast.error("Failed to upload video intro.")', 'toast.error(t("videoIntro.failedUpload"))'],
  ['toast.success("Video intro link saved.")', 'toast.success(t("videoIntro.videoLinkSaved"))'],
  ['toast.error("Failed to save video intro link.")', 'toast.error(t("videoIntro.failedSaveLink"))'],
  ['toast.error("Failed to remove video intro.")', 'toast.error(t("videoIntro.failedRemove"))'],
  ['toast.success("Video intro removed.")', 'toast.success(t("videoIntro.videoRemoved"))'],
]);

// Wallet
replace('pages/Wallet.tsx', [
  ['toast.error("Invalid coin amount")', 'toast.error(t("wallet.invalidAmount"))'],
  ['toast.error("Failed to update wallet")', 'toast.error(t("wallet.failedUpdate"))'],
]);

// WhoLikedYou
replace('pages/WhoLikedYou.tsx', [
  ['toast.error("Failed to load likes")', 'toast.error(t("whoLikedYou.failedLoad"))'],
  ['toast.error("Failed to use streak credit")', 'toast.error(t("whoLikedYou.failedStreakCredit"))'],
  ['toast.success("Like sent! ❤️")', 'toast.success(t("whoLikedYou.likeSent"))'],
  ['toast.error("Failed to like profile")', 'toast.error(t("whoLikedYou.failedLike"))'],
]);

// PushPrompt (component)
replace('components/PushPrompt.tsx', [
  ['toast.success("Push notifications enabled!")', 'toast.success(t("pushPrompt.enabled"))'],
  ['toast.error("Could not enable notifications.")', 'toast.error(t("pushPrompt.failed"))'],
]);

// ReportUserDialog (component)
replace('components/ReportUserDialog.tsx', [
  ['toast.error("Please select a reason")', 'toast.error(t("report.pleaseSelect"))'],
  ['toast.success("Report submitted. Thank you for keeping the community safe.")', 'toast.success(t("report.submitted"))'],
  ['toast.error("Failed to submit report. Please try again.")', 'toast.error(t("report.failedSubmit"))'],
]);

// TravelMode
replace('components/TravelMode.tsx', [
  ['toast.error("Please select a destination")', 'toast.error(t("travelMode.pleaseSelect"))'],
  ['toast.error("Could not find that location. Please try again.")', 'toast.error(t("travelMode.locationNotFound"))'],
  ['toast.success("Back to your home location")', 'toast.success(t("travelMode.backHome"))'],
]);

// Radar
replace('pages/Radar.tsx', [
  ['toast.error("Failed to load nearby users")', 'toast.error(t("radar.failedLoad"))'],
  ["toast.info(\"You've already liked this user!\")", 'toast.info(t("radar.alreadyLiked"))'],
  ['toast.success("🎉 It\'s a match! You can now chat with them!")', 'toast.success(t("radar.itsAMatch"))'],
  ['toast.success("⚡ Superlike sent!")', 'toast.success(t("radar.superlikeSent"))'],
  ['toast.error("Failed to send superlike")', 'toast.error(t("radar.failedSuperlike"))'],
]);

// DatePlanner
replace('pages/DatePlanner.tsx', [
  ['toast.error("Failed to load date planner.")', 'toast.error(t("datePlanner.failedLoad"))'],
  ['toast.error("Please complete all required fields.")', 'toast.error(t("datePlanner.fillRequired"))'],
  ['toast.error("Date created but failed to notify in chat.")', 'toast.error(t("datePlanner.createdNoChat"))'],
  ['toast.error("Date created but couldn\'t send chat notification — no match found.")', 'toast.error(t("datePlanner.createdNoMatch"))'],
  ['toast.success("Date plan created & partner notified in chat!")', 'toast.success(t("datePlanner.created"))'],
  ['toast.error("Failed to create date plan.")', 'toast.error(t("datePlanner.failedCreate"))'],
  ['toast.error("This date plan has already expired and cannot be accepted.")', 'toast.error(t("datePlanner.expired"))'],
  ['toast.error("Failed to update plan status.")', 'toast.error(t("datePlanner.failedUpdate"))'],
  ['toast.success("Plan updated.")', 'toast.success(t("datePlanner.planUpdated"))'],
]);

// Matches
replace('pages/Matches.tsx', [
  ['toast.success("Bookmark removed")', 'toast.success(t("matches.bookmarkRemoved"))'],
  ['toast.success("Match bookmarked ⭐")', 'toast.success(t("matches.matchBookmarked"))'],
  ['toast.error("Failed to update bookmark")', 'toast.error(t("matches.failedBookmark"))'],
  ['toast.error("Failed to load instant messages")', 'toast.error(t("matches.failedLoadIm"))'],
  ['toast.error("Failed to load matches")', 'toast.error(t("matches.failedLoad"))'],
  ['toast.error("Failed to unmatch")', 'toast.error(t("matches.failedUnmatch"))'],
  ["toast.success(\"🎉 It's a Match! You can now chat with them!\")", 'toast.success(t("matches.itsAMatch"))'],
  ['toast.success("Like sent! 💕")', 'toast.success(t("matches.likeSent"))'],
  ['toast.error("Failed to send like")', 'toast.error(t("matches.failedLike"))'],
  ['toast.error("Failed to load profile")', 'toast.error(t("matches.failedLoadProfile"))'],
  ['toast.error("Failed to load conversation")', 'toast.error(t("matches.failedLoadConversation"))'],
  ['toast.error("Message limit reached! Like their profile to unlock unlimited messaging.")', 'toast.error(t("matches.messageLimitReached"))'],
  ['toast.error("Failed to send message")', 'toast.error(t("matches.failedSendMessage"))'],
  ['toast.success("Reply sent! Keep messaging in Instant Messages tab.")', 'toast.success(t("matches.replySent"))'],
  ['toast.error("Failed to send reply")', 'toast.error(t("matches.failedReply"))'],
]);

// ProfileSetup
replace('pages/ProfileSetup.tsx', [
  ['toast.error("Geolocation is not supported by your browser")', 'toast.error(t("profileSetup.geolocationNotSupported"))'],
  ['toast.success("Location detected!")', 'toast.success(t("profileSetup.locationDetected"))'],
  ['toast.error("Location unavailable. Check your device settings.")', 'toast.error(t("profileSetup.locationUnavailable"))'],
  ['toast.error("Failed to get location. You can still use the app.")', 'toast.error(t("profileSetup.failedGetLocation"))'],
  ['toast.error("Image must be less than 5MB")', 'toast.error(t("profileSetup.imageTooLarge"))'],
  ['toast.error("Please wait for authentication to complete")', 'toast.error(t("profileSetup.waitForAuth"))'],
  ['toast.error("Authentication required. Please refresh and sign in again.")', 'toast.error(t("profileSetup.authRequired"))'],
  ['toast.error("Cannot upload: User ID not available")', 'toast.error(t("profileSetup.cannotUpload"))'],
  ['toast.success("Profile photo uploaded! ✓")', 'toast.success(t("profileSetup.photoUploaded"))'],
  ['toast.error("Storage bucket not configured. Please run database fix first.")', 'toast.error(t("profileSetup.bucketNotConfigured"))'],
  ['toast.error("Storage permissions not configured. Please run database fix first.")', 'toast.error(t("profileSetup.storagePermissions"))'],
  ['toast.error("Invalid file format. Please select a valid image.")', 'toast.error(t("profileSetup.invalidFormat"))'],
  ['toast.success("Verification selfie uploaded! ✓")', 'toast.success(t("profileSetup.selfieUploaded"))'],
  ['toast.error("You must be logged in")', 'toast.error(t("profileSetup.mustBeLoggedIn"))'],
  ['toast.error("Please upload a profile photo")', 'toast.error(t("profileSetup.uploadPhotoRequired"))'],
  ['toast.error("Your bio contains inappropriate language. Please revise it.")', 'toast.error(t("profileSetup.inappropriateBio"))'],
  ['toast.success("Profile created successfully!")', 'toast.success(t("profileSetup.profileCreated"))'],
]);

// EditProfile
replace('pages/EditProfile.tsx', [
  ['toast.error("No profile found. Please complete your profile setup first.")', 'toast.error(t("editProfile.noProfile"))'],
  ['toast.error("Profile not found. Redirecting to setup...")', 'toast.error(t("editProfile.profileNotFound"))'],
  ['toast.error("Session expired. Please log in again.")', 'toast.error(t("editProfile.sessionExpired"))'],
  ['toast.error("Permission denied. Please check your account status.")', 'toast.error(t("editProfile.permissionDenied"))'],
  ['toast.error("Failed to save prompt")', 'toast.error(t("editProfile.failedSavePrompt"))'],
  ['toast.success("Prompt saved!")', 'toast.success(t("editProfile.promptSaved"))'],
  ['toast.error("Failed to upload photo")', 'toast.error(t("editProfile.failedUploadPhoto"))'],
  ['toast.success("Photo deleted successfully!")', 'toast.success(t("editProfile.photoDeleted"))'],
  ['toast.error("Failed to delete photo")', 'toast.error(t("editProfile.failedDeletePhoto"))'],
  ['toast.success("Photos reordered!")', 'toast.success(t("editProfile.photosReordered"))'],
  ['toast.error("Failed to reorder photos")', 'toast.error(t("editProfile.failedReorder"))'],
  ['toast.error("Geolocation is not supported by your browser")', 'toast.error(t("editProfile.geolocationNotSupported"))'],
  ['toast.info("Detecting your location...")', 'toast.info(t("editProfile.detectingLocation"))'],
  ['toast.error("Could not determine city from your location")', 'toast.error(t("editProfile.cannotDetermineCity"))'],
  ['toast.error("Failed to detect city. Please enter manually.")', 'toast.error(t("editProfile.failedDetectCity"))'],
  ['toast.error("Location permission denied. Please enable location access.")', 'toast.error(t("editProfile.locationPermissionDenied"))'],
  ['toast.error("Location information unavailable.")', 'toast.error(t("editProfile.locationUnavailable"))'],
  ['toast.error("Location request timed out.")', 'toast.error(t("editProfile.locationTimeout"))'],
  ['toast.error("Failed to get your location.")', 'toast.error(t("editProfile.failedLocation"))'],
  ['toast.error("Please enter your full name (at least 2 characters)")', 'toast.error(t("editProfile.enterFullName"))'],
  ['toast.error("Please enter a valid age")', 'toast.error(t("editProfile.enterValidAge"))'],
  ['toast.error("Your bio contains inappropriate language. Please revise it.")', 'toast.error(t("editProfile.inappropriateBio"))'],
  ['toast.success("Profile updated successfully!")', 'toast.success(t("editProfile.profileUpdated"))'],
  ['toast.error("You can only select up to 5 interests")', 'toast.error(t("editProfile.maxInterests"))'],
]);

console.log('\n🎉 All files processed!');

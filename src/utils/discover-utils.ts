import type { Profile } from "@/types/profile";

/** Extract YouTube video ID from URL */
export const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

/** Extract Spotify track ID from URL */
export const extractSpotifyTrackId = (url: string): string | null => {
  const m = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
};

/** Format a timestamp as relative time (e.g. "5m ago") */
export const formatTimeAgo = (timestamp: string | undefined): string => {
  if (!timestamp) return "";

  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
};

/** Compute a compatibility percentage (0-100) between two profiles */
export const computeMatchScore = (profile: Profile, myProfile: Profile | null): number => {
  if (!myProfile) return 0;

  let score = 0;
  let maxScore = 0;

  // Shared interests (up to 40 pts)
  const myInterests = new Set((myProfile.interests || []).map((i) => i.toLowerCase()));
  const profileInterests = (profile.interests || []).map((i) => i.toLowerCase());
  const sharedCount = profileInterests.filter((i) => myInterests.has(i)).length;
  const interestScore = Math.min(sharedCount * 10, 40);
  score += interestScore;
  maxScore += 40;

  // Looking-for overlap (up to 20 pts)
  const myGoals = new Set((myProfile.looking_for || []).map((g) => g.toLowerCase()));
  const theirGoals = (profile.looking_for || []).map((g) => g.toLowerCase());
  const sharedGoals = theirGoals.filter((g) => myGoals.has(g)).length;
  score += Math.min(sharedGoals * 10, 20);
  maxScore += 20;

  // Religion match (10 pts)
  if (myProfile.religion && profile.religion && myProfile.religion === profile.religion) {
    score += 10;
  }
  maxScore += 10;

  // Lifestyle match (10 pts)
  if (myProfile.lifestyle && profile.lifestyle && myProfile.lifestyle === profile.lifestyle) {
    score += 10;
  }
  maxScore += 10;

  // Distance (up to 15 pts — closer is better)
  if (profile.distance_km !== undefined) {
    const distPts = Math.max(0, 15 - Math.floor(profile.distance_km / 20));
    score += distPts;
  }
  maxScore += 15;

  // Verified bonus (5 pts)
  if (profile.verified) score += 5;
  maxScore += 5;

  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};

/** Check if a user is currently online (active within last 5 minutes) */
export const isOnline = (lastActive?: string | null): boolean => {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
};

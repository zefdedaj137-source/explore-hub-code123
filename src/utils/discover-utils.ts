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

/** Compute a match score between two profiles based on shared interests, distance, and verification */
export const computeMatchScore = (profile: Profile, myProfile: Profile | null): number => {
  const myInterests = new Set((myProfile?.interests || []).map((i) => i.toLowerCase()));
  const profileInterests = (profile.interests || []).map((i) => i.toLowerCase());
  const sharedInterests = profileInterests.reduce((count, interest) => {
    return myInterests.has(interest) ? count + 1 : count;
  }, 0);

  const distanceScore =
    profile.distance_km !== undefined ? Math.max(0, 50 - Math.round(profile.distance_km)) : 0;
  const verifiedBonus = profile.verified ? 5 : 0;

  return sharedInterests * 10 + distanceScore + verifiedBonus;
};

/** Check if a user is currently online (active within last 5 minutes) */
export const isOnline = (lastActive?: string | null): boolean => {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
};

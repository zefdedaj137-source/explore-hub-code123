import { describe, it, expect } from "vitest";
import {
  extractYouTubeId,
  extractSpotifyTrackId,
  formatTimeAgo,
  computeMatchScore,
  isOnline,
} from "@/utils/discover-utils";
import type { Profile } from "@/types/profile";

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "1",
  full_name: "Test User",
  age: 25,
  gender: "male",
  location: "NYC",
  city: "New York",
  country: "US",
  bio: null,
  interests: [],
  profile_image_url: null,
  verified: false,
  zodiac_sign: null,
  religion: null,
  latitude: null,
  longitude: null,
  ...overrides,
});

describe("extractYouTubeId", () => {
  it("extracts ID from standard watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from short URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from embed URL", () => {
    expect(extractYouTubeId("https://youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from shorts URL", () => {
    expect(extractYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URL", () => {
    expect(extractYouTubeId("https://example.com")).toBeNull();
  });
});

describe("extractSpotifyTrackId", () => {
  it("extracts track ID from Spotify URL", () => {
    expect(extractSpotifyTrackId("https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6")).toBe(
      "6rqhFgbbKwnb9MLmUQDhG6"
    );
  });

  it("returns null for non-Spotify URL", () => {
    expect(extractSpotifyTrackId("https://example.com/track")).toBeNull();
  });
});

describe("formatTimeAgo", () => {
  it("returns empty string for undefined", () => {
    expect(formatTimeAgo(undefined)).toBe("");
  });

  it('returns "Just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

describe("computeMatchScore", () => {
  it("returns 0 when no shared interests and no distance", () => {
    const profile = makeProfile({ interests: ["hiking"] });
    const myProfile = makeProfile({ interests: ["cooking"] });
    expect(computeMatchScore(profile, myProfile)).toBe(0);
  });

  it("scores shared interests at 10 points each", () => {
    const profile = makeProfile({ interests: ["hiking", "cooking", "music"] });
    const myProfile = makeProfile({ interests: ["hiking", "music"] });
    expect(computeMatchScore(profile, myProfile)).toBe(20);
  });

  it("adds distance bonus for nearby profiles", () => {
    const profile = makeProfile({ interests: [], distance_km: 5 });
    const myProfile = makeProfile();
    expect(computeMatchScore(profile, myProfile)).toBe(45); // 50 - 5
  });

  it("adds verified bonus", () => {
    const profile = makeProfile({ interests: [], verified: true });
    const myProfile = makeProfile();
    expect(computeMatchScore(profile, myProfile)).toBe(5);
  });

  it("handles null myProfile", () => {
    const profile = makeProfile({ interests: ["hiking"] });
    expect(computeMatchScore(profile, null)).toBe(0);
  });
});

describe("isOnline", () => {
  it("returns false for null/undefined", () => {
    expect(isOnline(null)).toBe(false);
    expect(isOnline(undefined)).toBe(false);
  });

  it("returns true if active within 5 minutes", () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(isOnline(recent)).toBe(true);
  });

  it("returns false if active more than 5 minutes ago", () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isOnline(old)).toBe(false);
  });
});

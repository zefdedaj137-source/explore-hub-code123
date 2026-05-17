import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Track whether the user_achievements table is accessible.
// Uses a 30-minute localStorage TTL to avoid hitting the 400 on every page refresh
// while the DB cache is stale. Clears automatically on first successful query.
let achievementsTableMissing = (() => {
  try {
    const v = localStorage.getItem("__achievements_table_missing");
    return !!v && Date.now() - Number(v) < 30 * 60 * 1000;
  } catch {
    return false;
  }
})();

function markTableMissing() {
  achievementsTableMissing = true;
  try {
    localStorage.setItem("__achievements_table_missing", String(Date.now()));
  } catch {
    /* */
  }
}

function markTableOk() {
  achievementsTableMissing = false;
  try {
    localStorage.removeItem("__achievements_table_missing");
  } catch {
    /* */
  }
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_match",
    name: "First Spark",
    description: "Got your first match",
    icon: "💕",
    condition: "matches >= 1",
  },
  {
    id: "ten_matches",
    name: "Popular",
    description: "Reached 10 matches",
    icon: "🔥",
    condition: "matches >= 10",
  },
  {
    id: "fifty_matches",
    name: "Heart Magnet",
    description: "Reached 50 matches",
    icon: "🧲",
    condition: "matches >= 50",
  },
  {
    id: "first_message",
    name: "Ice Breaker",
    description: "Sent your first message",
    icon: "💬",
    condition: "messages >= 1",
  },
  {
    id: "hundred_messages",
    name: "Chatterbox",
    description: "Sent 100 messages",
    icon: "📢",
    condition: "messages >= 100",
  },
  {
    id: "first_superlike",
    name: "Bold Move",
    description: "Sent your first super like",
    icon: "⭐",
    condition: "superlikes >= 1",
  },
  {
    id: "streak_7",
    name: "Weekly Warrior",
    description: "7-day messaging streak",
    icon: "🏆",
    condition: "streak >= 7",
  },
  {
    id: "streak_30",
    name: "Committed",
    description: "30-day messaging streak",
    icon: "👑",
    condition: "streak >= 30",
  },
  {
    id: "profile_complete",
    name: "All Dressed Up",
    description: "Completed your profile 100%",
    icon: "✨",
    condition: "profile_complete",
  },
  {
    id: "verified",
    name: "Verified",
    description: "Verified your profile",
    icon: "✅",
    condition: "verified",
  },
  {
    id: "first_date_plan",
    name: "Planner",
    description: "Created your first date plan",
    icon: "📅",
    condition: "date_plans >= 1",
  },
  {
    id: "photo_gallery",
    name: "Photogenic",
    description: "Uploaded 5+ photos",
    icon: "📸",
    condition: "photos >= 5",
  },
];

export async function checkAndGrantAchievements(userId: string): Promise<string[]> {
  if (achievementsTableMissing) return [];
  const newlyGranted: string[] = [];

  // Fetch existing achievements (gracefully handle missing table)
  const { data: existing, error: existingErr } = (await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)) as { data: { achievement_id: string }[] | null; error: unknown };
  if (existingErr) {
    markTableMissing();
    return [];
  }
  markTableOk();
  const earned = new Set((existing || []).map((a) => a.achievement_id));

  // Fetch user stats (skip likes.is_superlike — column doesn't exist)
  const [matchRes, msgRes, profileRes, datePlanRes] = await Promise.all([
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId),
    supabase
      .from("profiles")
      .select(
        "full_name, bio, interests, profile_images, verified, profile_image_url, superlikes_remaining"
      )
      .eq("id", userId)
      .single(),
    supabase
      .from("date_plans")
      .select("id", { count: "exact", head: true })
      .eq("planner_id", userId),
  ]);

  // Log individual fetch failures but continue with defaults so partial data
  // doesn't silently block all achievements from being granted.
  if (matchRes.error) logger.error("achievements: match count query failed:", matchRes.error);
  if (msgRes.error) logger.error("achievements: message count query failed:", msgRes.error);
  if (datePlanRes.error) logger.error("achievements: date_plans query failed:", datePlanRes.error);
  if (profileRes.error) {
    logger.error("achievements: profile query failed:", profileRes.error);
    return [];
  }

  const matchCount = matchRes.count || 0;
  const msgCount = msgRes.count || 0;
  const datePlanCount = datePlanRes.count || 0;
  const profile = profileRes.data as Record<string, unknown> | null;

  // Read streak from localStorage (run only in browser)
  let streak = 0;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`match_streak_${userId}`);
      if (raw) streak = JSON.parse(raw).streak || 0;
    } catch {
      /* ignore */
    }
  }

  const photoCount =
    (profile?.profile_images as string[] | null)?.length || (profile?.profile_image_url ? 1 : 0);
  const isVerified = !!profile?.verified;
  const isProfileComplete = !!(
    profile?.full_name &&
    profile?.bio &&
    (profile?.interests as string[] | null)?.length &&
    profile?.profile_image_url
  );
  // If superlikes_remaining < default (3), user has used at least one
  const hasUsedSuperlike =
    typeof profile?.superlikes_remaining === "number" &&
    (profile.superlikes_remaining as number) < 3;

  const checks: Record<string, boolean> = {
    first_match: matchCount >= 1,
    ten_matches: matchCount >= 10,
    fifty_matches: matchCount >= 50,
    first_message: msgCount >= 1,
    hundred_messages: msgCount >= 100,
    first_superlike: hasUsedSuperlike,
    streak_7: streak >= 7,
    streak_30: streak >= 30,
    profile_complete: isProfileComplete,
    verified: isVerified,
    first_date_plan: datePlanCount >= 1,
    photo_gallery: photoCount >= 5,
  };

  for (const achievement of ACHIEVEMENTS) {
    if (earned.has(achievement.id)) continue;
    if (checks[achievement.id]) {
      const { error } = await supabase
        .from("user_achievements")
        .insert({ user_id: userId, achievement_id: achievement.id } as Record<string, unknown>);
      if (!error) newlyGranted.push(achievement.id);
    }
  }

  return newlyGranted;
}

export async function getUserAchievements(userId: string): Promise<string[]> {
  if (achievementsTableMissing) return [];
  const { data, error } = (await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)) as { data: { achievement_id: string }[] | null; error: unknown };
  if (error) {
    markTableMissing();
    return [];
  }
  markTableOk();
  return (data || []).map((a) => a.achievement_id);
}

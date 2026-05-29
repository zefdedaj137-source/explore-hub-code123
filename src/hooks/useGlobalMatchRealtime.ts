/**
 * useGlobalMatchRealtime
 *
 * Listens for new rows in the `matches` table for the current user.
 * When a match is detected anywhere (Discover, WhoLikedYou, Games, etc.)
 * it surfaces an immediate overlay — no page navigation needed.
 *
 * Deduplication: page-level handlers (e.g. Discover.tsx) call
 * `markMatchHandled(userId)` to prevent the global listener from
 * double-firing the same animation.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Module-level dedup registry (shared across hook instances)
// ---------------------------------------------------------------------------
const _handledUserIds = new Set<string>();

/** Call this in page-level match handlers so the global hook skips that match. */
export function markMatchHandled(otherUserId: string) {
  _handledUserIds.add(otherUserId);
  // Auto-clean after 15 s — in case the match never actually fires via realtime
  setTimeout(() => _handledUserIds.delete(otherUserId), 15_000);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PendingMatch {
  matchId: string;
  matchName: string;
  matchImage: string | null;
  sharedInterests: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGlobalMatchRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const myInterestsRef = useRef<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Pre-load my interests for shared-interest computation
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("interests")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        myInterestsRef.current = (data?.interests as string[]) ?? [];
      });
  }, [user]);

  const handleNewMatch = useCallback(
    async (matchId: string, otherUserId: string) => {
      // Skip if a page-level handler already claimed this match
      if (_handledUserIds.has(otherUserId)) return;

      // Immediately invalidate cached match/conversation lists so they are
      // fresh as soon as the user navigates there
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });

      // Fetch the other person's profile (only name + avatar + interests)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, profile_image_url, interests")
        .eq("id", otherUserId)
        .single();

      if (!profile) return;

      const theirInterests = (profile.interests as string[]) ?? [];
      const shared = theirInterests.filter((i) =>
        myInterestsRef.current.map((x) => x.toLowerCase()).includes(i.toLowerCase())
      );

      setPendingMatch({
        matchId,
        matchName: profile.full_name ?? "Someone",
        matchImage: profile.profile_image_url ?? null,
        sharedInterests: shared,
      });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!user) return;
    if (channelRef.current) return; // already subscribed

    const channel = supabase
      .channel(`global-match:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user1_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; user2_id: string };
          handleNewMatch(row.id, row.user2_id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
          filter: `user2_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; user1_id: string };
          handleNewMatch(row.id, row.user1_id);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, handleNewMatch]);

  const dismissMatch = useCallback(() => setPendingMatch(null), []);

  return { pendingMatch, dismissMatch };
}

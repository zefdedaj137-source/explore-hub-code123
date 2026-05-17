import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function isBlockedBetween(
  a: string,
  b: string
): Promise<{
  blockedByYou: boolean;
  blockedYou: boolean;
}> {
  if (!UUID_RE.test(a) || !UUID_RE.test(b)) {
    logger.warn("Invalid user ID format in block check");
    return { blockedByYou: false, blockedYou: false };
  }
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);

  if (error) {
    logger.warn("Failed to check block status:", error);
    return { blockedByYou: false, blockedYou: false };
  }

  const blockedByYou = !!data?.some((r) => r.blocker_id === a && r.blocked_id === b);
  const blockedYou = !!data?.some((r) => r.blocker_id === b && r.blocked_id === a);
  return { blockedByYou, blockedYou };
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

import { supabase } from "@/integrations/supabase/client";

export async function isBlockedBetween(a: string, b: string): Promise<{
  blockedByYou: boolean;
  blockedYou: boolean;
}> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);

  if (error) {
    console.warn("Failed to check block status:", error);
    return { blockedByYou: false, blockedYou: false };
  }

  const blockedByYou = !!data?.some((r) => r.blocker_id === a && r.blocked_id === b);
  const blockedYou = !!data?.some((r) => r.blocker_id === b && r.blocked_id === a);
  return { blockedByYou, blockedYou };
}

export async function blockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
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

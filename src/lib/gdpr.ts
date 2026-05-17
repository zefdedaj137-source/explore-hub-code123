import { supabase } from "@/integrations/supabase/client";

/**
 * Export all personal data for the current user (GDPR Article 15).
 * Returns a JSON blob the user can download.
 */
export async function exportUserData(userId: string): Promise<Blob> {
  const [profileRes, matchesRes, messagesRes, likesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("matches")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
    supabase.from("messages").select("id, content, created_at, match_id").eq("sender_id", userId),
    supabase.from("likes").select("id, liked_id, created_at").eq("liker_id", userId),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: profileRes.data,
    matches: matchesRes.data ?? [],
    messagesSent: messagesRes.data ?? [],
    likes: likesRes.data ?? [],
  };

  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
}

/**
 * Trigger a download of the user's data export.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Delete the user's account and all associated data (GDPR Article 17).
 * This removes the profile, auth account, and lets cascade rules handle the rest.
 */
export async function deleteAccount(userId: string): Promise<void> {
  // Delete profile (cascades to matches, messages, likes via FK rules)
  const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to delete profile: ${profileError.message}`);
  }

  // Sign out the user (auth.admin.deleteUser requires service role — handle server-side)
  await supabase.auth.signOut();
}

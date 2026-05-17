import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Record that a user viewed another user's profile
 * @param viewerId - The ID of the user viewing the profile
 * @param viewedId - The ID of the profile being viewed
 */
export async function recordProfileView(viewerId: string, viewedId: string) {
  try {
    // Don't record if viewing own profile
    if (viewerId === viewedId) {
      return;
    }

    // Respect viewer's save_data preference
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("save_data")
      .eq("id", viewerId)
      .maybeSingle();

    if (viewerProfile && viewerProfile.save_data === false) {
      return;
    }

    // Call the database function to upsert the view
    const { error } = await supabase.rpc("record_profile_view", {
      p_viewer_id: viewerId,
      p_viewed_id: viewedId,
    });

    if (error) {
      // If the function doesn't exist yet (table not created), fail silently
      if (error.message.includes("does not exist")) {
        logger.log("Profile views tracking not enabled yet. Create the profile_views table first.");
        return;
      }
      throw error;
    }

    logger.log(`✅ Profile view recorded: ${viewerId} viewed ${viewedId}`);
  } catch (error) {
    logger.error("Error recording profile view:", error);
  }
}

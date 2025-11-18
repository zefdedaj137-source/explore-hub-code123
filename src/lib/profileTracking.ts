import { supabase } from "@/integrations/supabase/client";

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

    // Call the database function to upsert the view
    const { error } = await supabase.rpc('record_profile_view', {
      p_viewer_id: viewerId,
      p_viewed_id: viewedId
    });

    if (error) {
      // If the function doesn't exist yet (table not created), fail silently
      if (error.message.includes('does not exist')) {
        console.log('Profile views tracking not enabled yet. Create the profile_views table first.');
        return;
      }
      throw error;
    }

    console.log(`✅ Profile view recorded: ${viewerId} viewed ${viewedId}`);
  } catch (error) {
    console.error('Error recording profile view:', error);
  }
}

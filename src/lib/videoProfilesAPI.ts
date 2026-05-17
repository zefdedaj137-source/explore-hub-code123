import { supabase } from "@/integrations/supabase/client";
import { VideoProfile } from "./premiumTypes";
import { logger } from "@/lib/logger";

/**
 * Video Profiles API - Handle video profile uploads and management
 */

export class VideoProfilesAPI {
  /**
   * Get user's video profile
   */
  static async getUserVideoProfile(userId: string): Promise<VideoProfile | null> {
    try {
      const { data, error } = await supabase
        .from("video_profiles")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // No rows returned
        throw error;
      }

      return data as VideoProfile;
    } catch (error) {
      logger.error("Error fetching video profile:", error);
      return null;
    }
  }

  /**
   * Upload and create video profile
   */
  static async uploadVideoProfile(file: File, userId: string): Promise<VideoProfile | null> {
    try {
      // Validate file
      if (!file.type.startsWith("video/")) {
        throw new Error("File must be a video");
      }

      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error("Video must be less than 50MB");
      }

      // Check duration using video element
      const duration = await this.getVideoDuration(file);
      if (duration < 5 || duration > 30) {
        throw new Error("Video must be between 5 and 30 seconds");
      }

      // Upload video
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("video-profiles")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("video-profiles").getPublicUrl(filePath);

      // Generate thumbnail (would need server-side processing or client-side canvas)
      const thumbnailUrl = await this.generateThumbnail(file);

      // Deactivate old video profile
      await supabase.from("video_profiles").update({ is_active: false }).eq("user_id", userId);

      // Create new video profile record
      const { data, error } = await supabase
        .from("video_profiles")
        .insert({
          user_id: userId,
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl || publicUrl,
          duration: Math.round(duration),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile completeness
      await supabase.rpc("update_profile_completeness", { p_user_id: userId });

      return data as VideoProfile;
    } catch (error) {
      logger.error("Error uploading video profile:", error);
      throw error;
    }
  }

  /**
   * Delete video profile
   */
  static async deleteVideoProfile(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("video_profiles")
        .update({ is_active: false })
        .eq("user_id", userId);

      if (error) throw error;

      // Update profile completeness
      await supabase.rpc("update_profile_completeness", { p_user_id: userId });

      return true;
    } catch (error) {
      logger.error("Error deleting video profile:", error);
      return false;
    }
  }

  /**
   * Get video duration from file
   */
  private static getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate thumbnail from video
   */
  private static async generateThumbnail(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        video.currentTime = 1; // Seek to 1 second
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(video.src);
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                resolve(null);
              }
            },
            "image/jpeg",
            0.8
          );
        } else {
          URL.revokeObjectURL(video.src);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
      video.load();
    });
  }
}

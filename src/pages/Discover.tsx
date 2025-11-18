import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { recordProfileView } from "@/lib/profileTracking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, X, MapPin, LogOut, MessageCircle, Settings, Crown, Filter, Home, Users, Menu, Navigation, Info, ChevronLeft, ChevronRight, Sparkles, Gamepad2, Zap, MessageSquare, Flower2, Bell, Eye, RotateCcw, User, Briefcase, GraduationCap, Ruler, Church, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { MatchAnimation } from "@/components/MatchAnimation";
import { ProfileCardSkeleton } from "@/components/LoadingSkeleton";
import BottomNav from "@/components/BottomNav";

interface Profile {
  id: string;
  full_name: string;
  age: number;
  location: string;
  city: string | null;
  country: string | null;
  bio: string | null;
  interests: string[];
  profile_image_url: string | null;
  profile_images?: string[];
  verified: boolean | null;
  zodiac_sign: string | null;
  religion: string | null;
  latitude: number | null;
  longitude: number | null;
  travel_mode_active?: boolean | null;
  travel_city?: string | null;
  travel_latitude?: number | null;
  travel_longitude?: number | null;
  distance_km?: number;
  work?: string | null;
  education?: string | null;
  height?: string | null;
  height_cm?: number | null;
  timestamp?: string; // For notifications - viewed_at or created_at
  looking_for?: string[];
  lifestyle?: string | null;
  drinking?: string | null;
  smoking?: string | null;
  pets?: string | null;
  last_active?: string | null;
  booster_active?: boolean | null;
  booster_expires_at?: string | null;
}

// Helper function to format time ago
const formatTimeAgo = (timestamp: string | undefined): string => {
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

const Discover = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [spotlightProfiles, setSpotlightProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [passedProfiles, setPassedProfiles] = useState<Set<string>>(new Set());
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [isPremiumRosesMatch, setIsPremiumRosesMatch] = useState(false);
  const [swipeLimit, setSwipeLimit] = useState({
    remainingSwipes: 15,
    minutesUntilReset: 0,
    isPremium: false
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showSuperlikeDialog, setShowSuperlikeDialog] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileViews, setProfileViews] = useState<Profile[]>([]);
  const [profileLikes, setProfileLikes] = useState<Profile[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationTab, setNotificationTab] = useState<"views" | "likes">("views");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // Load last seen count from localStorage on mount (user-specific)
  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState(() => {
    if (!user) return 0;
    const saved = localStorage.getItem(`lastSeenNotificationCount_${user.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [superlikesRemaining, setSuperlikesRemaining] = useState(0);
  const [boosterActive, setBoosterActive] = useState(false);
  const [boosterExpiresAt, setBoosterExpiresAt] = useState<string | null>(null);
  const [boosterTimeRemaining, setBoosterTimeRemaining] = useState<string>("");
  const [boostCredits, setBoostCredits] = useState(0);
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [showBoostStatusDialog, setShowBoostStatusDialog] = useState(false);
  const [instantMessageCredits, setInstantMessageCredits] = useState(0);
  const [travelModeActive, setTravelModeActive] = useState(false);
  const [travelLatitude, setTravelLatitude] = useState<number | null>(null);
  const [travelLongitude, setTravelLongitude] = useState<number | null>(null);
  const [travelCity, setTravelCity] = useState<string | null>(null);
  const [showInstantMessageDialog, setShowInstantMessageDialog] = useState(false);
  const [instantMessageText, setInstantMessageText] = useState("");
  const [instantMessageTargetProfile, setInstantMessageTargetProfile] = useState<Profile | null>(null);
  const [showPremiumRosesDialog, setShowPremiumRosesDialog] = useState(false);
  const [rosesTargetProfile, setRosesTargetProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"for-you" | "last-active">("for-you");
  const [rewindsRemaining, setRewindsRemaining] = useState(3);
  const [lastActionHistory, setLastActionHistory] = useState<Array<{ type: 'like' | 'pass', profileId: string, timestamp: number }>>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showNotificationProfileDialog, setShowNotificationProfileDialog] = useState(false);
  const [notificationProfile, setNotificationProfile] = useState<Profile | null>(null);
  const [notificationProfileImageIndex, setNotificationProfileImageIndex] = useState(0);
  const [showNotificationFullProfile, setShowNotificationFullProfile] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 100,
    gender: "everyone",
    // Premium filters
    verifiedOnly: false,
    hasProfileImage: true,
    specificInterests: [] as string[],
    minHeight: 0,
    maxHeight: 250,
    education: "any",
    smoking: "any",
    drinking: "any",
    religion: "any"
  });
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 100,
    gender: "everyone",
    // Premium filters
    verifiedOnly: false,
    hasProfileImage: true,
    specificInterests: [] as string[],
    minHeight: 0,
    maxHeight: 250,
    education: "any",
    smoking: "any",
    drinking: "any",
    religion: "any"
  });

  // Fetch current user's profile
  const fetchMyProfile = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      // Update booster status
      if (myProfile) {
        setBoosterActive(myProfile.booster_active || false);
        setBoosterExpiresAt(myProfile.booster_expires_at || null);
        setBoostCredits(myProfile.boost_credits || 0);
        setInstantMessageCredits(myProfile.instant_message_credits || 0);
        setTravelModeActive(myProfile.travel_mode_active || false);
        setTravelLatitude(myProfile.travel_latitude || null);
        setTravelLongitude(myProfile.travel_longitude || null);
        setTravelCity(myProfile.travel_city || null);
      }
      
      return myProfile;
    } catch (error) {
      console.error("Error fetching my profile:", error);
      return null;
    }
  }, [user]);

  // Fetch superlike count
  const fetchSuperlikeCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("superlikes_remaining")
        .eq("id", user.id)
        .single() as { data: { superlikes_remaining: number } | null; error: unknown };
      
      if (error) throw error;
      setSuperlikesRemaining(data?.superlikes_remaining || 0);
    } catch (error) {
      console.error("Error fetching superlike count:", error);
    }
  }, [user]);

  // Check subscription and swipe limits
  const checkSwipeLimit = useCallback(async () => {
    try {
      if (!user) return;
      
      // Get remaining swipes and subscription status
      const { data, error } = await supabase
        .rpc('get_remaining_swipes', {
          user_id: user.id
        }) as { data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null; error: unknown };

      if (error) throw error;

      if (data) {
        setSwipeLimit({
          remainingSwipes: data.remaining_swipes,
          minutesUntilReset: Math.ceil(data.minutes_until_reset),
          isPremium: data.is_premium
        });
      }

      // Also fetch superlike count
      await fetchSuperlikeCount();

    } catch (error) {
      console.error("Error checking swipe limits:", error);
    }
  }, [user, fetchSuperlikeCount]);

  // Fetch rewind count
  const fetchRewindCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("rewinds_remaining")
        .eq("id", user.id)
        .single() as { data: { rewinds_remaining: number } | null; error: unknown };
      
      if (error) {
        // Column doesn't exist yet, default to 3
        console.warn("rewinds_remaining column not found, using default value");
        setRewindsRemaining(3);
        return;
      }
      setRewindsRemaining(data?.rewinds_remaining || 3);
    } catch (error) {
      console.error("Error fetching rewind count:", error);
      setRewindsRemaining(3); // Default value
    }
  }, [user]);

  // Load liked profiles from database
  const loadLikedProfiles = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);

      if (error) throw error;

      if (data) {
        const likedIds = data.map(like => like.liked_id);
        setLikedProfiles(new Set(likedIds));
        console.log("Loaded liked profiles:", likedIds.length);
      }
    } catch (error) {
      console.error("Error loading liked profiles:", error);
    }
  }, [user]);

  // Fetch profile views (users who viewed your profile)
  const fetchProfileViews = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profile_views")
        .select(`
          viewer_id,
          viewed_at,
          profiles!profile_views_viewer_id_fkey (
            id,
            full_name,
            age,
            profile_image_url,
            bio,
            location,
            profile_images,
            verified,
            work,
            education,
            height,
            height_cm,
            zodiac_sign,
            religion,
            interests,
            latitude,
            longitude,
            city,
            country
          )
        `)
        .eq("viewed_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching profile views:", error);
        setProfileViews([]);
        return;
      }

      if (data) {
        const viewers = data
          .filter(view => view.profiles)
          .map(view => ({
            ...(view.profiles as unknown as Profile),
            timestamp: view.viewed_at
          }));
        setProfileViews(viewers);
      }
    } catch (error) {
      console.error("Error fetching profile views:", error);
      setProfileViews([]);
    }
  }, [user]);

  // Fetch profile likes (users who liked you)
  const fetchProfileLikes = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("likes")
        .select(`
          liker_id,
          created_at,
          profiles!likes_liker_id_fkey (
            id,
            full_name,
            age,
            profile_image_url,
            bio,
            location,
            profile_images,
            verified,
            work,
            education,
            height,
            height_cm,
            zodiac_sign,
            religion,
            interests,
            latitude,
            longitude,
            city,
            country
          )
        `)
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const likers = data
          .filter(like => like.profiles)
          .map(like => ({
            ...(like.profiles as unknown as Profile),
            timestamp: like.created_at
          }));
        setProfileLikes(likers);
        
        // Calculate total notifications
        const totalNotifications = profileViews.length + likers.length;
        
        // Only show count for NEW notifications (since last time user opened the dialog)
        const newNotificationCount = Math.max(0, totalNotifications - lastSeenNotificationCount);
        setNotificationCount(newNotificationCount);
      }
    } catch (error) {
      console.error("Error fetching profile likes:", error);
      setProfileLikes([]);
    }
  }, [user, profileViews.length, lastSeenNotificationCount]);

  // Fetch profiles for discovery
  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const myProfile = await fetchMyProfile();
      if (!myProfile) {
        navigate("/profile-setup");
        return;
      }

      // Get all profiles except current user and ones already interacted with
      // Note: We don't exclude spotlight profiles here to avoid dependency issues
      const excludedIds = Array.from(new Set([
        ...Array.from(likedProfiles),
        ...Array.from(passedProfiles)
      ]));

      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);

      // Only add the NOT IN filter if there are excluded IDs
      if (excludedIds.length > 0) {
        query = query.not("id", "in", `(${excludedIds.join(",")})`);
      }

      const { data: profiles, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      // Determine which coordinates to use (travel or regular)
      const userLat = myProfile.travel_mode_active && myProfile.travel_latitude 
        ? myProfile.travel_latitude 
        : myProfile.latitude;
      const userLon = myProfile.travel_mode_active && myProfile.travel_longitude
        ? myProfile.travel_longitude
        : myProfile.longitude;

      // Add distance to each profile if location available
      const profilesWithDistance = (profiles || []).map((profile: Profile) => {
        let distance_km = undefined;
        if (userLat && userLon) {
          // Check if the profile user is in travel mode and use their travel coordinates
          const profileLat = profile.travel_mode_active && profile.travel_latitude
            ? profile.travel_latitude
            : profile.latitude;
          const profileLon = profile.travel_mode_active && profile.travel_longitude
            ? profile.travel_longitude
            : profile.longitude;
          
          if (profileLat && profileLon) {
            distance_km = calculateDistance(
              userLat,
              userLon,
              profileLat,
              profileLon
            );
            
            // Debug log for all profiles
            console.log(`📍 Profile ${profile.full_name} (${profile.id}):`, {
              city: profile.city,
              travelMode: profile.travel_mode_active,
              travelCity: profile.travel_city,
              distance: distance_km ? Math.round(distance_km) + 'km' : 'N/A',
              profileLat,
              profileLon,
              homeCity: profile.city
            });
          }
        }

        return {
          ...profile,
          distance_km,
          interests: profile.interests || []
        };
      }).filter((profile: Profile) => {
        // Apply age filter (always applied, not premium-only)
        if (profile.age < filters.minAge || profile.age > filters.maxAge) {
          return false;
        }
        
        // Apply distance filter (always applied, not premium-only)
        if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
          console.log(`🚫 Filtering out ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`);
          return false;
        }
        
        // Premium filters (only apply if user is premium)
        if (swipeLimit.isPremium) {
          // Verified only filter
          if (filters.verifiedOnly && !profile.verified) {
            return false;
          }
          
          // Profile image filter
          if (filters.hasProfileImage && !profile.profile_image_url) {
            return false;
          }
          
          // Specific interests filter
          if (filters.specificInterests.length > 0) {
            const hasMatchingInterest = filters.specificInterests.some(interest =>
              profile.interests.includes(interest)
            );
            if (!hasMatchingInterest) {
              return false;
            }
          }
          
          // Height filter
          if (profile.height_cm) {
            if (filters.minHeight > 0 && profile.height_cm < filters.minHeight) {
              return false;
            }
            if (filters.maxHeight < 250 && profile.height_cm > filters.maxHeight) {
              return false;
            }
          }
          
          // Education filter
          if (filters.education !== "any" && profile.education !== filters.education) {
            return false;
          }
          
          // Smoking filter
          if (filters.smoking !== "any" && profile.smoking !== filters.smoking) {
            return false;
          }
          
          // Drinking filter
          if (filters.drinking !== "any" && profile.drinking !== filters.drinking) {
            return false;
          }
          
          // Religion filter
          if (filters.religion !== "any" && profile.religion !== filters.religion) {
            return false;
          }
        }
        
        return true;
      }) || [];

      setProfiles(profilesWithDistance);
      setCurrentProfileIndex(0);
    } catch (error) {
      console.error("Error in fetchProfiles:", error);
      toast.error("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, [user, filters, likedProfiles, passedProfiles, fetchMyProfile, navigate, swipeLimit.isPremium]);

  // Fetch spotlight/boosted profiles
  const fetchSpotlightProfiles = useCallback(async () => {
    if (!user) return;
    
    try {
      // Get user's location first
      const myProfile = await fetchMyProfile();
      
      // Determine which coordinates to use (travel or regular)
      const userLat = myProfile?.travel_mode_active && myProfile?.travel_latitude 
        ? myProfile.travel_latitude 
        : myProfile?.latitude;
      const userLon = myProfile?.travel_mode_active && myProfile?.travel_longitude
        ? myProfile.travel_longitude
        : myProfile?.longitude;
      
      if (!myProfile || !userLat || !userLon) {
        console.log("Cannot fetch spotlight profiles: user location not available");
        return;
      }

      const { data, error } = await supabase
        .rpc('get_spotlight_profiles', {
          current_user_id: user.id,
          user_latitude: userLat,
          user_longitude: userLon,
          max_distance_km: filters.maxDistance
        }) as { data: Profile[] | null; error: unknown };

      if (error) {
        const errorObj = error as { code?: string; message?: string };
        // Silently handle missing function (user hasn't run migration yet)
        if (errorObj.code === 'PGRST202' || errorObj.message?.includes('not found')) {
          console.log("Spotlight function not available yet. Run migration: 20251031_add_spotlight_profiles_function.sql");
          return;
        }
        console.error("Error fetching spotlight profiles:", error);
        return;
      }

      if (data) {
        // Add distance to spotlight profiles
        const profilesWithDistance = data.map((profile: Profile) => {
          let distance_km = undefined;
          if (userLat && userLon) {
            // Check if the profile user is in travel mode and use their travel coordinates
            const profileLat = profile.travel_mode_active && profile.travel_latitude
              ? profile.travel_latitude
              : profile.latitude;
            const profileLon = profile.travel_mode_active && profile.travel_longitude
              ? profile.travel_longitude
              : profile.longitude;
            
            if (profileLat && profileLon) {
              distance_km = calculateDistance(
                userLat,
                userLon,
                profileLat,
                profileLon
              );
            }
          }

          return {
            ...profile,
            distance_km,
            interests: profile.interests || []
          };
        }).filter((profile: Profile) => {
          // Filter spotlight profiles by distance when in travel mode or always
          if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
            console.log(`🚫 Filtering out spotlight ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`);
            return false;
          }
          return true;
        });

        console.log(`Found ${profilesWithDistance.length} boosted profiles`);
        setSpotlightProfiles(profilesWithDistance);
      }
    } catch (error) {
      console.error("Error fetching spotlight profiles:", error);
    }
  }, [user, filters.maxDistance, fetchMyProfile]);

  // Handle premium upgrade
  const handleUpgrade = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start upgrade process");
    }
  };

  // Handle like action
  const handleLike = async (profileId: string) => {
    if (!user) return;

    try {
      // Use the like_user RPC function which handles swipe limits
      const { data, error } = await supabase
        .rpc('like_user', {
          current_user_id: user.id,
          target_user_id: profileId
        }) as { data: { success: boolean; error?: string; remaining_swipes: number; minutes_until_reset: number; is_premium: boolean; is_match: boolean } | null; error: unknown };

      if (error) {
        console.error("Supabase RPC error:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from like_user function");
      }

      console.log("Like user response:", data);

      if (!data.success) {
        // Show upgrade dialog if out of swipes
        setShowUpgradeDialog(true);
        toast.info(data.error || "Out of swipes!");
        return;
      }

      // Update local swipe limit state
      setSwipeLimit({
        remainingSwipes: data.remaining_swipes || 0,
        minutesUntilReset: Math.ceil(data.minutes_until_reset || 0),
        isPremium: data.is_premium || false
      });

      // Add to liked profiles
      setLikedProfiles(prev => new Set([...prev, profileId]));

      // Track this action for rewind
      setLastActionHistory(prev => [...prev, { type: 'like', profileId, timestamp: Date.now() }]);

      // Handle match if it occurred
      if (data.is_match) {
        const matchedUserProfile = profiles.find(p => p.id === profileId);
        if (matchedUserProfile) {
          setMatchedProfile(matchedUserProfile);
          setIsPremiumRosesMatch(false); // Regular match
          setShowMatchAnimation(true);
        }
        toast.success("It's a match! 🎉");
      } else {
        toast.success("Profile liked!");
      }

      // Move to next profile
      setCurrentProfileIndex(prev => prev + 1);
    } catch (error) {
      console.error("Error liking profile:", error);
      toast.error(`Failed to like profile: ${error.message || "Unknown error"}`);
    }
  };

  // Handle superlike action
  const handleSuperlike = async () => {
    if (!user || !currentProfile) return;

    // Check if user has superlikes
    if (superlikesRemaining <= 0) {
      setShowSuperlikeDialog(true);
      return;
    }

    const profileId = currentProfile.id;

    try {
      // Use superlike
      const { data: usageData, error: usageError } = await supabase
        .rpc('use_superlike', {
          p_user_id: user.id
        }) as { data: { success: boolean; superlikes_remaining: number } | null; error: unknown };

      if (usageError) throw usageError;

      if (!usageData?.success) {
        setShowSuperlikeDialog(true);
        return;
      }

      // Update superlike count
      setSuperlikesRemaining(usageData.superlikes_remaining || 0);

      // Create the superlike
      const { error: likeError } = await supabase
        .from("likes")
        .insert({
          liker_id: user.id,
          liked_id: profileId,
          is_superlike: true,
        });

      if (likeError) throw likeError;

      // Check if they liked us back
      const { data: reciprocalLike } = await supabase
        .from("likes")
        .select("*")
        .eq("liker_id", profileId)
        .eq("liked_id", user.id)
        .single();

      if (reciprocalLike) {
        // Create match
        const { error: matchError } = await supabase
          .from("matches")
          .insert({
            user1_id: user.id,
            user2_id: profileId,
          });

        if (matchError) throw matchError;

        const matchedUserProfile = profiles.find(p => p.id === profileId);
        if (matchedUserProfile) {
          setMatchedProfile(matchedUserProfile);
          setIsPremiumRosesMatch(false); // Regular match
          setShowMatchAnimation(true);
        }
        toast.success("It's a match! 🎉");
      } else {
        toast.success("⚡ Superlike sent!");
      }

      // Add to liked profiles
      setLikedProfiles(prev => new Set([...prev, profileId]));
      
      // Move to next profile
      setCurrentProfileIndex(prev => prev + 1);
    } catch (error) {
      console.error("Error sending superlike:", error);
      toast.error("Failed to send superlike");
    }
  };

  // Premium Roses - Instant Match
  const handlePremiumRoses = async () => {
    if (!user || !rosesTargetProfile) return;

    console.log('🌹 Sending Premium Roses to:', rosesTargetProfile.full_name);

    try {
      const profileId = rosesTargetProfile.id;

      // Check if match already exists
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (existingMatch) {
        toast.info("You're already matched with this person!");
        setShowPremiumRosesDialog(false);
        return;
      }

      // Premium Roses: Only create like from current user (no need for reciprocal like)
      // The match will be created directly, bypassing normal mutual-like requirement
      console.log('💝 Creating your like (Premium Roses bypass mutual requirement)...');
      
      // Delete any existing likes first to avoid conflicts
      await supabase
        .from("likes")
        .delete()
        .eq('liker_id', user.id)
        .eq('liked_id', profileId);

      const { error: likeError } = await supabase
        .from("likes")
        .insert({
          liker_id: user.id,
          liked_id: profileId,
        });

      if (likeError) {
        console.error('Error creating like:', likeError);
        // Don't throw - Premium Roses should create match regardless
        console.log('⚠️ Like creation failed, but continuing with Premium Roses match...');
      }

      // Create match with special rose type
      console.log('💐 Creating Premium Roses match...');
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .insert({
          user1_id: user.id,
          user2_id: profileId,
          special_match_type: 'premium_roses',
        })
        .select()
        .single();

      if (matchError) {
        console.error('Error creating match:', matchError);
        throw matchError;
      }

      console.log('✅ Premium Roses match created successfully!', matchData);

      // Show match animation with Premium Roses theme
      setMatchedProfile(rosesTargetProfile);
      setIsPremiumRosesMatch(true);
      setShowMatchAnimation(true);
      
      toast.success("💐 Premium Roses sent! Instant match created with rose-themed chat!");
      
      // Close dialog
      setShowPremiumRosesDialog(false);
      setRosesTargetProfile(null);
      
      // Move to next profile if current
      if (currentProfile?.id === profileId) {
        setCurrentProfileIndex(prev => prev + 1);
      }
    } catch (error: unknown) {
      console.error("❌ Error sending premium roses:", error);
      const err = error as { message?: string; details?: string; hint?: string };
      console.error("Error details:", err?.message, err?.details, err?.hint);
      toast.error(err?.message || "Failed to send premium roses");
    }
  };

  // Purchase superlikes
  const handlePurchaseSuperlikes = async (amount: number) => {
    if (!user) return;

    try {
      const price = amount * 3; // €3 per superlike
      
      // In a real app, you would integrate with Stripe here
      // For now, we'll directly add the superlikes
      const { data, error } = await supabase
        .rpc('add_purchased_superlikes', {
          p_user_id: user.id,
          p_amount: amount,
          p_price: price
        }) as { data: { success: boolean; superlikes_remaining: number } | null; error: unknown };

      if (error) throw error;

      if (data?.success) {
        setSuperlikesRemaining(data.superlikes_remaining || 0);
        toast.success(`${amount} Superlike${amount > 1 ? 's' : ''} added!`);
        setShowSuperlikeDialog(false);
      }
    } catch (error) {
      console.error("Error purchasing superlikes:", error);
      toast.error("Failed to purchase superlikes");
    }
  };

  // Handle pass action
  const handlePass = async (profileId: string) => {
    if (!user) return;

    try {
      // Check swipe limits
      const { data, error } = await supabase
        .rpc('get_remaining_swipes', {
          user_id: user.id
        }) as { data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null; error: unknown };

      if (error) {
        console.error("Error checking swipe limits:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from get_remaining_swipes");
      }

      console.log("Swipe limits:", data);

      // Update swipe limit state
      setSwipeLimit({
        remainingSwipes: data.remaining_swipes || 0,
        minutesUntilReset: Math.ceil(data.minutes_until_reset || 0),
        isPremium: data.is_premium || false
      });

      // Show upgrade dialog if out of swipes
      if (!data.is_premium && data.remaining_swipes <= 0) {
        setShowUpgradeDialog(true);
        toast.info("Out of swipes! Please wait or upgrade to premium.");
        return;
      }

      setPassedProfiles(prev => new Set([...prev, profileId]));
      
      // Track this action for rewind
      setLastActionHistory(prev => [...prev, { type: 'pass', profileId, timestamp: Date.now() }]);
      
      setCurrentProfileIndex(prev => prev + 1);
      toast.success("Profile passed");

      // Increment swipe count in database for non-premium users
      if (!data.is_premium) {
        const newCount = Math.max(0, 10 - (data.remaining_swipes - 1));
        await supabase.from('daily_swipes')
          .upsert({ 
            user_id: user.id,
            swipe_count: newCount,
            last_reset: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        // Update local state
        setSwipeLimit(prev => ({
          ...prev,
          remainingSwipes: Math.max(0, prev.remainingSwipes - 1)
        }));
      }
    } catch (error) {
      console.error("Error passing profile:", error);
      toast.error(`Failed to pass profile: ${error.message || "Unknown error"}`);
    }
  };

  // Handle rewind (undo last action)
  const handleRewind = async () => {
    if (!user || lastActionHistory.length === 0 || rewindsRemaining <= 0) {
      if (rewindsRemaining <= 0) {
        toast.error("No rewinds remaining today!");
      }
      return;
    }

    try {
      const lastAction = lastActionHistory[lastActionHistory.length - 1];
      
      // Undo the last action in the database
      if (lastAction.type === 'like') {
        // Remove the like
        await supabase
          .from('likes')
          .delete()
          .eq('liker_id', user.id)
          .eq('liked_id', lastAction.profileId);
        
        // Remove from local state
        setLikedProfiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastAction.profileId);
          return newSet;
        });
      }
      // Note: passes aren't stored in DB, just remove from local state
      else if (lastAction.type === 'pass') {
        setPassedProfiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(lastAction.profileId);
          return newSet;
        });
      }

      // Decrease rewind count in database (if column exists)
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ rewinds_remaining: rewindsRemaining - 1 } as never)
          .eq('id', user.id);

        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
      } catch (dbError) {
        console.warn('Could not update rewinds_remaining in database:', dbError);
      }

      // Update local state
      setRewindsRemaining(prev => prev - 1);
      
      // Go back one profile
      setCurrentProfileIndex(prev => Math.max(0, prev - 1));
      
      // Remove last action from history
      setLastActionHistory(prev => prev.slice(0, -1));

      toast.success(`${lastAction.type === 'like' ? 'Like' : 'Pass'} undone!`);
    } catch (error) {
      console.error("Error rewinding:", error);
      toast.error("Failed to undo action");
    }
  };

  // Handle instant message
  const handleInstantMessage = (profile: Profile) => {
    if (instantMessageCredits <= 0) {
      toast.error("No instant message credits! Purchase more to continue.");
      return;
    }
    setInstantMessageTargetProfile(profile);
    setInstantMessageText("");
    setShowInstantMessageDialog(true);
  };

  const sendInstantMessage = async () => {
    if (!user || !instantMessageTargetProfile || !instantMessageText.trim()) {
      toast.error("Please write a message");
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('send_instant_message', {
          sender_user_id: user.id,
          receiver_user_id: instantMessageTargetProfile.id,
          message_text: instantMessageText.trim()
        }) as { data: { success: boolean; error?: string; credits_remaining?: number } | null; error: unknown };

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      if (data && !data.success) {
        toast.error(data.error || "Failed to send instant message");
        return;
      }

      if (data && data.success) {
        setInstantMessageCredits(data.credits_remaining || 0);
        toast.success(`Message sent to ${instantMessageTargetProfile.full_name}! 💬`);
        setShowInstantMessageDialog(false);
        setInstantMessageText("");
        setInstantMessageTargetProfile(null);
      }
    } catch (error) {
      console.error("Error sending instant message:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error("Failed to send message");
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      // Sign out first
      await supabase.auth.signOut();
      // Then navigate to auth page
      navigate("/auth", { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      // Navigate anyway even if sign out fails
      navigate("/auth", { replace: true });
    }
  };

  // Handle opening filter sheet
  const handleOpenFilterSheet = () => {
    // Copy current filters to temp filters
    setTempFilters({ ...filters });
    setShowFilterSheet(true);
  };

  // Handle saving filters
  const handleSaveFilters = () => {
    // Apply temp filters to actual filters
    setFilters({ ...tempFilters });
    // Close the sheet
    setShowFilterSheet(false);
    // Filters will automatically trigger refetch via useEffect
  };

  // Handle opening notifications - mark as seen
  const handleOpenNotifications = () => {
    // Calculate current total notifications
    const totalNotifications = profileViews.length + profileLikes.length;
    
    // Mark current count as "seen"
    setLastSeenNotificationCount(totalNotifications);
    
    // Reset notification badge to 0
    setNotificationCount(0);
    
    // Open the dialog
    setShowNotifications(true);
  };

  // Memoize data initialization to prevent recreation on every render
  const initializeData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // 1. Load liked profiles from database
      const { data: likesData } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);

      if (likesData) {
        const likedIds = likesData.map(like => like.liked_id);
        setLikedProfiles(new Set(likedIds));
        console.log("Loaded liked profiles:", likedIds.length);
      }

      // 2. Check swipe limits and premium status
      const { data: swipeData } = await supabase
        .rpc('get_remaining_swipes', {
          user_id: user.id
        }) as { data: { remaining_swipes: number; minutes_until_reset: number; is_premium: boolean } | null };

      // Also check premium status directly from profile to ensure accuracy
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      const actualPremiumStatus = profileData?.is_premium || swipeData?.is_premium || false;

      if (swipeData) {
        setSwipeLimit({
          remainingSwipes: swipeData.remaining_swipes,
          minutesUntilReset: Math.ceil(swipeData.minutes_until_reset),
          isPremium: actualPremiumStatus
        });
      }

      // 2.5. Fetch spotlight profiles
      const myProfileForSpotlight = await fetchMyProfile();
      
      // Determine which coordinates to use (travel or regular)
      const userLatForSpotlight = myProfileForSpotlight?.travel_mode_active && myProfileForSpotlight?.travel_latitude 
        ? myProfileForSpotlight.travel_latitude 
        : myProfileForSpotlight?.latitude;
      const userLonForSpotlight = myProfileForSpotlight?.travel_mode_active && myProfileForSpotlight?.travel_longitude
        ? myProfileForSpotlight.travel_longitude
        : myProfileForSpotlight?.longitude;
      
      if (userLatForSpotlight && userLonForSpotlight) {
        const { data: spotlightData, error: spotlightError } = await supabase
          .rpc('get_spotlight_profiles', {
            current_user_id: user.id,
            user_latitude: userLatForSpotlight,
            user_longitude: userLonForSpotlight,
            max_distance_km: filters.maxDistance
          }) as { data: Profile[] | null; error: unknown };

        // Silently handle missing function
        if (spotlightError) {
          const errorObj = spotlightError as { code?: string; message?: string };
          if (errorObj.code === 'PGRST202' || errorObj.message?.includes('not found')) {
            console.log("Spotlight function not available yet. Run migration: 20251031_add_spotlight_profiles_function.sql");
          } else {
            console.error("Error fetching spotlight profiles:", spotlightError);
          }
        }

        if (spotlightData && !spotlightError) {
          const spotlightWithDistance = spotlightData.map((profile: Profile) => {
            let distance_km = undefined;
            if (userLatForSpotlight && userLonForSpotlight) {
              // Check if the profile user is in travel mode and use their travel coordinates
              const profileLat = profile.travel_mode_active && profile.travel_latitude
                ? profile.travel_latitude
                : profile.latitude;
              const profileLon = profile.travel_mode_active && profile.travel_longitude
                ? profile.travel_longitude
                : profile.longitude;
              
              if (profileLat && profileLon) {
                distance_km = calculateDistance(
                  userLatForSpotlight,
                  userLonForSpotlight,
                  profileLat,
                  profileLon
                );
              }
            }
            return {
              ...profile,
              distance_km,
              interests: profile.interests || []
            };
          }).filter((profile: Profile) => {
            // Filter spotlight profiles by distance when in travel mode or always
            if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
              console.log(`🚫 Filtering out initial spotlight ${profile.full_name}: ${Math.round(profile.distance_km)}km > ${filters.maxDistance}km`);
              return false;
            }
            return true;
          });
          console.log(`Loaded ${spotlightWithDistance.length} spotlight profiles`);
          setSpotlightProfiles(spotlightWithDistance);
        }
      }

      // 3. Fetch profiles (call directly instead of through callback)
      const myProfile = await fetchMyProfile();
      if (!myProfile) {
        navigate("/profile-setup");
        return;
      }

      // Get excluded IDs
      const excludedIds = likesData ? likesData.map(like => like.liked_id) : [];

      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);

      if (excludedIds.length > 0) {
        query = query.not("id", "in", `(${excludedIds.join(",")})`);
      }

      const { data: profilesData, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      if (profilesData) {
        const profilesWithDistance = profilesData.map((profile: Profile) => {
          let distance_km = undefined;
          if (
            myProfile.latitude && myProfile.longitude &&
            profile.latitude && profile.longitude
          ) {
            distance_km = calculateDistance(
              myProfile.latitude,
              myProfile.longitude,
              profile.latitude,
              profile.longitude
            );
          }

          return {
            ...profile,
            distance_km,
            interests: profile.interests || []
          };
        }).filter((profile: Profile) => {
          // Apply age filter
          if (profile.age < filters.minAge || profile.age > filters.maxAge) {
            return false;
          }
          
          // Apply distance filter
          if (profile.distance_km !== undefined && profile.distance_km > filters.maxDistance) {
            return false;
          }
          return true;
        });

        setProfiles(profilesWithDistance);
        setCurrentProfileIndex(0);
      }

    } catch (error) {
      console.error("Error initializing:", error);
    } finally {
      setLoading(false);
    }
  }, [user, filters.maxDistance, filters.minAge, filters.maxAge, navigate, fetchMyProfile]);

  // Initialize - Load data on mount only
  useEffect(() => {
    initializeData();
  }, [initializeData]);  // Save last seen notification count to localStorage (user-specific)
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`lastSeenNotificationCount_${user.id}`, lastSeenNotificationCount.toString());
  }, [lastSeenNotificationCount, user]);

  // Auto-update location on page load/login
  useEffect(() => {
    if (!user || !navigator.geolocation) return;

    const updateLocationSilently = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use Nominatim reverse geocoding
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'ShqiponjaApp/1.0'
                }
              }
            );

            if (!response.ok) return;

            const data = await response.json();
            const address = data.address;
            const city = address.city || address.town || address.village || address.municipality || "";
            const country = address.country || "";

            if (city && country) {
              // Update location in database silently
              await supabase
                .from('profiles')
                .update({
                  city: city,
                  country: country,
                  location: `${city}, ${country}`,
                  latitude: latitude,
                  longitude: longitude
                })
                .eq('id', user.id);

              console.log('Location updated automatically:', city, country);
            }
          } catch (error) {
            console.error("Silent location update failed:", error);
          }
        },
        () => {
          // Fail silently
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    };

    const timer = setTimeout(updateLocationSilently, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  // Subscribe to booster status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`booster:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          setBoosterActive(newProfile.booster_active || false);
          setBoosterExpiresAt(newProfile.booster_expires_at || null);
          
          // Show toast when booster expires
          if (!newProfile.booster_active && boosterActive) {
            toast.info("Your Spotlight Booster has expired");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, boosterActive]);

  // Update booster countdown timer
  useEffect(() => {
    if (!boosterActive || !boosterExpiresAt) {
      setBoosterTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(boosterExpiresAt);
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setBoosterTimeRemaining("Expired");
        setBoosterActive(false);
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setBoosterTimeRemaining(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [boosterActive, boosterExpiresAt]);

  // Refetch profiles when filters change
  useEffect(() => {
    // Only refetch if we already have profiles loaded (not on initial mount)
    if (profiles.length > 0 || likedProfiles.size > 0 || passedProfiles.size > 0) {
      console.log("Filters changed, refetching profiles...");
      fetchProfiles();
    }
  }, [fetchProfiles, profiles.length, likedProfiles.size, passedProfiles.size]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchProfileViews();
      fetchProfileLikes();
      fetchRewindCount();
    }
  }, [user, fetchProfileViews, fetchProfileLikes, fetchRewindCount]);

  // Get current profile - memoized for performance
  const currentProfile = useMemo(() => 
    profiles[currentProfileIndex], 
    [profiles, currentProfileIndex]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-sm mx-auto">
          <ProfileCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      {/* Header */}
      <div className="flex flex-col max-w-2xl mx-auto mb-6">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700 p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-yellow-500 font-serif">Shqiponja</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBoostDialog(true)}
                className="p-2 hover:bg-blue-600/20 rounded-full transition-colors group"
                aria-label="Boost"
              >
                <Zap className="h-6 w-6 text-blue-500 animate-pulse group-hover:text-blue-400" />
              </button>
              <button
                onClick={() => swipeLimit.isPremium ? navigate("/settings") : setShowUpgradeDialog(true)}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                aria-label="Premium"
              >
                <Crown className={`h-6 w-6 ${swipeLimit.isPremium ? 'text-yellow-500 animate-pulse' : 'text-gray-400 hover:text-yellow-500'}`} />
              </button>
              <button
                onClick={handleOpenNotifications}
                className="relative p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6 text-yellow-500" />
                {notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </button>
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors" aria-label="Menu">
                    <Menu className="h-6 w-6 text-yellow-500" />
                  </button>
                </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigation and account options
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/game-lobby")}
                  >
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    Multiplayer Games
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/edit-profile")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Sheet open={showFilterSheet} onOpenChange={setShowFilterSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleOpenFilterSheet}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Customize your profile discovery preferences
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* Basic Filters */}
                  <div className="space-y-2">
                    <Label>Maximum Distance (km)</Label>
                    <Input 
                      type="number" 
                      value={tempFilters.maxDistance}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        maxDistance: parseInt(e.target.value) || 0
                      }))}
                      min={1}
                      max={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age Range</Label>
                    <div className="flex gap-4">
                      <Input 
                        type="number"
                        placeholder="Min"
                        value={tempFilters.minAge}
                        onChange={(e) => setTempFilters(prev => ({
                          ...prev,
                          minAge: parseInt(e.target.value) || 18
                        }))}
                        min={18}
                        max={99}
                      />
                      <Input 
                        type="number"
                        placeholder="Max"
                        value={tempFilters.maxAge}
                        onChange={(e) => setTempFilters(prev => ({
                          ...prev,
                          maxAge: parseInt(e.target.value) || 99
                        }))}
                        min={18}
                        max={99}
                      />
                    </div>
                  </div>
                  
                  {/* Premium Filters */}
                  {swipeLimit.isPremium && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm font-semibold text-yellow-600">
                        <Crown className="h-4 w-4" />
                        <span>Premium Filters</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="verified-only">Verified Profiles Only</Label>
                        <Switch
                          id="verified-only"
                          checked={tempFilters.verifiedOnly}
                          onCheckedChange={(checked) => setTempFilters(prev => ({
                            ...prev,
                            verifiedOnly: checked
                          }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="has-image">Has Profile Image</Label>
                        <Switch
                          id="has-image"
                          checked={tempFilters.hasProfileImage}
                          onCheckedChange={(checked) => setTempFilters(prev => ({
                            ...prev,
                            hasProfileImage: checked
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Height Range (cm)</Label>
                        <div className="flex gap-4">
                          <Input 
                            type="number"
                            placeholder="Min"
                            value={tempFilters.minHeight || ""}
                            onChange={(e) => setTempFilters(prev => ({
                              ...prev,
                              minHeight: parseInt(e.target.value) || 0
                            }))}
                            min={0}
                            max={250}
                          />
                          <Input 
                            type="number"
                            placeholder="Max"
                            value={tempFilters.maxHeight === 250 ? "" : tempFilters.maxHeight}
                            onChange={(e) => setTempFilters(prev => ({
                              ...prev,
                              maxHeight: parseInt(e.target.value) || 250
                            }))}
                            min={0}
                            max={250}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Smoking</Label>
                        <Select 
                          value={tempFilters.smoking}
                          onValueChange={(value) => setTempFilters(prev => ({
                            ...prev,
                            smoking: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="Non-smoker">Non-smoker</SelectItem>
                            <SelectItem value="Social smoker">Social smoker</SelectItem>
                            <SelectItem value="Regular smoker">Regular smoker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Drinking</Label>
                        <Select 
                          value={tempFilters.drinking}
                          onValueChange={(value) => setTempFilters(prev => ({
                            ...prev,
                            drinking: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="Never">Never</SelectItem>
                            <SelectItem value="Socially">Socially</SelectItem>
                            <SelectItem value="Regularly">Regularly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Religion</Label>
                        <Select 
                          value={tempFilters.religion}
                          onValueChange={(value) => setTempFilters(prev => ({
                            ...prev,
                            religion: value
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="Christian">Christian</SelectItem>
                            <SelectItem value="Muslim">Muslim</SelectItem>
                            <SelectItem value="Hindu">Hindu</SelectItem>
                            <SelectItem value="Buddhist">Buddhist</SelectItem>
                            <SelectItem value="Jewish">Jewish</SelectItem>
                            <SelectItem value="Atheist">Atheist</SelectItem>
                            <SelectItem value="Agnostic">Agnostic</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  
                  {!swipeLimit.isPremium && (
                    <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400">
                      <div className="text-center space-y-2">
                        <Crown className="h-8 w-8 text-yellow-600 mx-auto" />
                        <p className="text-sm font-semibold">Unlock Premium Filters</p>
                        <p className="text-xs text-gray-600">Get verified, height, lifestyle & more filters</p>
                        <Button 
                          size="sm"
                          className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                          onClick={() => setShowUpgradeDialog(true)}
                        >
                          Upgrade Now
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Save Button */}
                  <div className="pt-4 space-y-2">
                    <Button 
                      onClick={handleSaveFilters}
                      className="w-full bg-pink-500 hover:bg-pink-600"
                    >
                      Apply Filters
                    </Button>
                    <p className="text-xs text-center text-gray-500">
                      Changes will apply after clicking "Apply Filters"
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setActiveTab("for-you")}
            className={`flex-1 px-6 py-3 rounded-2xl font-semibold text-base transition-all duration-300 border-2 ${
              activeTab === "for-you"
                ? "bg-yellow-600/20 text-yellow-500 border-yellow-600/50 shadow-lg shadow-yellow-600/20"
                : "bg-transparent text-gray-400 border-gray-700 hover:border-yellow-600/30 hover:text-yellow-500"
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab("last-active")}
            className={`flex-1 px-6 py-3 rounded-2xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
              activeTab === "last-active"
                ? "bg-yellow-600/20 text-yellow-500 border-yellow-600/50 shadow-lg shadow-yellow-600/20"
                : "bg-transparent text-gray-400 border-gray-700 hover:border-yellow-600/30 hover:text-yellow-500"
            }`}
          >
            Last Active
          </button>
        </div>
        </div>
      </div>

      {/* Main Content - For You Tab */}
      {activeTab === "for-you" && (
        <>
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <ProfileCardSkeleton />
            </div>
          ) : profiles.length > 0 && currentProfileIndex < profiles.length ? (
            <div className="max-w-sm mx-auto relative">
              {currentProfile ? (
          <Card className="overflow-hidden shadow-2xl border-none dark:bg-gradient-to-br dark:from-red-950 dark:to-black dark:border dark:border-red-900/30">
            <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-red-950">
              {currentProfile.profile_image_url ? (
                <>
                  <img
                    src={currentProfile.profile_image_url}
                    alt={currentProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Profile info overlay on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-3xl font-bold drop-shadow-lg">
                            {currentProfile.full_name}
                          </h3>
                          <span className="text-2xl font-light">{currentProfile.age}</span>
                          {currentProfile.verified && (
                            <Badge className="bg-blue-500 text-white border-none">✓</Badge>
                          )}
                        </div>
                        
                        {/* Location & Distance */}
                        <div className="flex items-center gap-3 text-sm font-medium">
                          {/* Show travel city if in travel mode, otherwise regular city */}
                          {(currentProfile.travel_mode_active && currentProfile.travel_city) ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                              <span className="text-base">✈️</span>
                              <span>Traveling in {currentProfile.travel_city}</span>
                            </div>
                          ) : currentProfile.city ? (
                            <div className="flex items-center gap-1 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                              <MapPin className="h-4 w-4" />
                              <span>{currentProfile.city}</span>
                            </div>
                          ) : null}
                          {currentProfile.distance_km && (
                            <div className="backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                              {formatDistance(currentProfile.distance_km)} away
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No photo
                </div>
              )}
            </div>
            
            {/* Card content below image */}
            <div className="p-5 bg-white space-y-4">
              {currentProfile.bio && (
                <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{currentProfile.bio}</p>
              )}
              
              {currentProfile.interests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.slice(0, 5).map((interest, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full px-3 py-1 bg-pink-50 text-pink-700 border-pink-200">
                      {interest}
                    </Badge>
                  ))}
                  {currentProfile.interests.length > 5 && (
                    <Badge variant="secondary" className="rounded-full px-3 py-1 bg-gray-100 text-gray-600">
                      +{currentProfile.interests.length - 5}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* View Full Profile Button */}
              <Button
                variant="ghost"
                className="w-full text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50 font-medium"
                onClick={() => {
                  setSelectedImageIndex(0);
                  setShowProfileDialog(true);
                  // Record profile view
                  if (user && currentProfile) {
                    recordProfileView(user.id, currentProfile.id);
                  }
                }}
              >
                <Info className="h-4 w-4 mr-2" />
                See Full Profile
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center shadow-lg dark:bg-gradient-to-br dark:from-red-950 dark:to-black dark:border dark:border-red-900/30">
            <h3 className="text-xl font-semibold mb-2 dark:text-red-100">No more profiles</h3>
            <p className="text-muted-foreground dark:text-red-300/70 mb-4">Come back later to see more people</p>
            <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 dark:from-red-600 dark:to-rose-700 dark:hover:from-red-700 dark:hover:to-rose-800">
              Refresh
            </Button>
          </Card>
        )}
        
        {/* Action Buttons - Floating Style */}
        {currentProfile && (
          <div className="flex flex-col items-center gap-4 mt-8">
            {/* Game Discover Call-to-Action with Mini Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 hover:border-pink-500 hover:from-pink-100 hover:to-purple-100 dark:from-red-950/50 dark:to-rose-950/50 dark:border-red-800 dark:hover:border-red-600 dark:hover:from-red-900/50 dark:hover:to-rose-900/50 px-6 py-2 rounded-full shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => navigate("/game-discover")}
              >
                <Gamepad2 className="h-4 w-4 mr-2 text-pink-500 dark:text-red-400" />
                <span className="font-semibold text-gray-700 dark:text-red-200">Try Game Discover ✨</span>
              </Button>
              
              {/* Mini Super Like Button */}
              <div className="relative">
                <Button
                  size="sm"
                  className="rounded-full w-10 h-10 p-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 hover:from-blue-500 hover:via-purple-600 hover:to-pink-600 dark:from-rose-600 dark:via-red-600 dark:to-rose-700 dark:hover:from-rose-700 dark:hover:via-red-700 dark:hover:to-rose-800 disabled:opacity-50 shadow-lg transition-all duration-200 hover:scale-110 disabled:hover:scale-100"
                  onClick={handleSuperlike}
                  disabled={superlikesRemaining === 0}
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </Button>
                {superlikesRemaining > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-red-600 dark:to-rose-600 text-white border-2 border-white dark:border-gray-800 rounded-full w-5 h-5 flex items-center justify-center p-0 text-[9px] font-bold shadow-lg">
                    {superlikesRemaining}
                  </Badge>
                )}
              </div>

              {/* Mini Premium Roses Button */}
              <div className="relative">
                <Button
                  size="sm"
                  className="rounded-full w-10 h-10 p-0 bg-gradient-to-br from-rose-600 via-red-700 to-rose-800 hover:from-rose-700 hover:via-red-800 hover:to-rose-900 shadow-lg transition-all duration-200 hover:scale-110 border-2 border-yellow-400"
                  onClick={() => {
                    setRosesTargetProfile(currentProfile);
                    setShowPremiumRosesDialog(true);
                  }}
                >
                  <span className="text-2xl">🌹</span>
                </Button>
              </div>

              {/* Mini Instant Message Button */}
              <div className="relative">
                <Button
                  size="sm"
                  className="rounded-full w-10 h-10 p-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-600 hover:from-cyan-500 hover:via-blue-600 hover:to-cyan-700 shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 border-2 border-blue-300"
                  onClick={() => handleInstantMessage(currentProfile)}
                  disabled={instantMessageCredits === 0}
                >
                  <MessageSquare className="h-5 w-5 text-white" />
                </Button>
                {instantMessageCredits > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-2 border-white dark:border-gray-800 rounded-full w-5 h-5 flex items-center justify-center p-0 text-[9px] font-bold shadow-lg">
                    {instantMessageCredits}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-center items-center gap-6">
              {/* Rewind Button */}
              <div className="relative">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full w-14 h-14 p-0 border-2 border-yellow-400 hover:border-yellow-500 hover:bg-yellow-50 dark:border-yellow-600 dark:hover:border-yellow-500 dark:hover:bg-yellow-950/50 shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                  onClick={handleRewind}
                  disabled={lastActionHistory.length === 0 || rewindsRemaining <= 0}
                  title="Undo last action"
                >
                  <RotateCcw className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
                </Button>
                {rewindsRemaining > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-white dark:border-gray-800 rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs font-bold shadow-lg">
                    {rewindsRemaining}
                  </Badge>
                )}
              </div>
              
              <Button
                size="lg"
                variant="outline"
                className="rounded-full w-16 h-16 p-0 border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-600 dark:hover:bg-red-950/50 shadow-lg transition-all duration-200 hover:scale-110"
                onClick={() => handlePass(currentProfile.id)}
              >
                <X className="h-7 w-7 text-gray-600 dark:text-red-400" />
              </Button>
            
            <Button
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 dark:from-red-600 dark:to-rose-700 dark:hover:from-red-700 dark:hover:to-rose-800 shadow-lg transition-all duration-200 hover:scale-110"
              onClick={() => handleLike(currentProfile.id)}
            >
              <Heart className="h-7 w-7 text-white" />
            </Button>
            </div>
          </div>
        )}
      </div>
          ) : (
            <div className="flex justify-center items-center h-96 text-gray-500">
              <p>No more profiles to show</p>
            </div>
          )}
        </>
      )}

      {/* Main Content - Last Active Tab */}
      {activeTab === "last-active" && (
        <div className="max-w-6xl mx-auto px-4i q">
          {boosterActive ? (
            spotlightProfiles.length > 0 ? (
              <ScrollArea className="w-full">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {spotlightProfiles.map((profile) => (
                  <Card 
                    key={profile.id}
                    className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 relative"
                    onClick={() => {
                      // Navigate to profile
                      const profileIndex = profiles.findIndex(p => p.id === profile.id);
                      if (profileIndex >= 0) {
                        setActiveTab("for-you");
                        setCurrentProfileIndex(profileIndex);
                      }
                    }}
                  >
                    {/* Boost badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-white rounded-full p-1.5 shadow-lg">
                        <Zap className="h-5 w-5 text-blue-400 animate-pulse" fill="currentColor" />
                      </div>
                    </div>
                    
                    {/* Profile Image */}
                    <div className="relative h-48 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-red-950 dark:to-black">
                      {profile.profile_image_url ? (
                        <img
                          src={profile.profile_image_url}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No photo
                        </div>
                      )}
                    </div>
                    
                    {/* Profile Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-bold text-sm truncate dark:text-red-100">{profile.full_name}</h3>
                        <span className="text-xs text-gray-600 dark:text-red-300">{profile.age}</span>
                        {profile.verified && (
                          <Badge className="bg-blue-500 dark:bg-red-600 text-white border-none scale-75">✓</Badge>
                        )}
                      </div>
                      
                      {profile.city && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-red-300/80 mb-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{profile.city}</span>
                        </div>
                      )}
                      
                      {profile.distance_km && (
                        <div className="text-xs text-gray-500 dark:text-red-400/70">
                          {formatDistance(profile.distance_km)} away
                        </div>
                      )}
                      
                      {/* Active status */}
                      <div className="mt-2 flex items-center gap-1">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Active Now</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Sparkles className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Boosters</h3>
              <p className="text-sm text-gray-500">
                No users are currently using boost in your area
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Zap className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Boost Required</h3>
            <p className="text-sm text-gray-500 mb-4">
              Activate a boost to see who's most active right now
            </p>
            <Button
              onClick={() => setShowBoostDialog(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Activate Boost
            </Button>
          </div>
        )}
        </div>
      )}

      {/* Boost Status Dialog (when active) */}
      <Dialog open={showBoostStatusDialog} onOpenChange={setShowBoostStatusDialog}>
        <DialogContent className="max-w-md dark:bg-gradient-to-br dark:from-gray-900 dark:via-red-950 dark:to-black dark:border dark:border-red-900/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-red-100">
              <Zap className="h-6 w-6 text-blue-500 dark:text-red-500 animate-zap-shine" fill="currentColor" />
              Spotlight Boost Active
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-red-950/50 dark:to-rose-950/50 p-6 rounded-lg border-2 border-blue-200 dark:border-red-800">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <Zap className="h-16 w-16 text-blue-500 dark:text-red-500 animate-pulse" fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-red-300/70 mb-2">Time Remaining</p>
                  <p className="text-4xl font-bold text-blue-600 dark:text-red-400">{boosterTimeRemaining}</p>
                </div>
                {boosterExpiresAt && (
                  <p className="text-xs text-muted-foreground dark:text-red-300/60">
                    Expires at {new Date(boosterExpiresAt).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-red-950/30 border border-green-200 dark:border-red-800 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-red-200">
                  <p className="font-semibold mb-1">Your profile is boosted!</p>
                  <p>You're being shown to more people in your area and appearing higher in their discovery feed.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowBoostStatusDialog(false)}
              className="w-full dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-100"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Boost Purchase Dialog */}
      <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
        <DialogContent className="max-w-md dark:bg-gradient-to-br dark:from-gray-900 dark:via-red-950 dark:to-black dark:border dark:border-red-900/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-red-100">
              <Zap className="h-6 w-6 text-blue-500 dark:text-red-500" fill="currentColor" />
              Activate Spotlight Boost
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground">
              Get more visibility! Your profile will be shown to more people in your area.
            </p>
            
            <div className="space-y-3">
              {/* Free Boost Option (if user has credits) */}
              {boostCredits > 0 && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.rpc('activate_booster_with_credit', {
                          user_id: user?.id,
                          hours: 3
                        }) as { data: { success: boolean; credits_remaining?: number; error?: string } | null; error: unknown };
                        
                        if (error) throw error;
                        
                        if (data?.success) {
                          toast.success("Free 3-hour boost activated! ⚡");
                          setBoostCredits(data.credits_remaining || 0);
                          setShowBoostDialog(false);
                          await fetchMyProfile();
                        } else {
                          toast.error(data?.error || "Failed to activate boost");
                        }
                      } catch (error) {
                        console.error("Error activating boost:", error);
                        toast.error("Failed to activate boost");
                      }
                    }}
                    className="w-full p-4 border-2 border-green-500 bg-green-50 rounded-lg hover:border-green-600 hover:bg-green-100 transition-all text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2">
                          3 Hours
                          <Badge className="bg-green-500">FREE</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">Use 1 of your {boostCredits} free boosts</div>
                      </div>
                      <Crown className="h-8 w-8 text-yellow-500" />
                    </div>
                  </button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or buy more</span>
                    </div>
                  </div>
                </>
              )}

              {/* 3 Hours Option */}
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc('activate_booster', {
                      user_id: user?.id,
                      hours: 3
                    });
                    if (error) throw error;
                    toast.success("3-hour boost activated! ⚡");
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    console.error("Error activating boost:", error);
                    toast.error("Failed to activate boost");
                  }
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">3 Hours</div>
                    <div className="text-sm text-muted-foreground">Quick boost</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">$2.99</div>
                </div>
              </button>

              {/* 6 Hours Option */}
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc('activate_booster', {
                      user_id: user?.id,
                      hours: 6
                    });
                    if (error) throw error;
                    toast.success("6-hour boost activated! ⚡");
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    console.error("Error activating boost:", error);
                    toast.error("Failed to activate boost");
                  }
                }}
                className="w-full p-4 border-2 border-blue-500 bg-blue-50 rounded-lg hover:border-blue-600 hover:bg-blue-100 transition-all text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">6 Hours</div>
                    <div className="text-sm text-muted-foreground">Most popular ⭐</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">$4.99</div>
                </div>
              </button>

              {/* 10 Hours Option */}
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc('activate_booster', {
                      user_id: user?.id,
                      hours: 10
                    });
                    if (error) throw error;
                    toast.success("10-hour boost activated! ⚡");
                    setShowBoostDialog(false);
                    await fetchMyProfile();
                  } catch (error) {
                    console.error("Error activating boost:", error);
                    toast.error("Failed to activate boost");
                  }
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-lg">10 Hours</div>
                    <div className="text-sm text-muted-foreground">Best value 💎</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">$7.99</div>
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Roses VIP Dialog */}
      <Dialog open={showPremiumRosesDialog} onOpenChange={setShowPremiumRosesDialog}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-red-950 dark:to-black border-4 border-rose-400 dark:border-rose-600">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 bg-clip-text text-transparent flex items-center justify-center gap-3">
              <Flower2 className="h-8 w-8 text-rose-600 animate-bounce" />
              Premium Roses
              <Crown className="h-8 w-8 text-yellow-500 animate-pulse" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {rosesTargetProfile && (
              <div className="relative">
                {/* Rose Animation Background */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <Flower2 className="h-32 w-32 text-rose-500 animate-spin-slow" />
                </div>
                
                <div className="relative flex flex-col items-center gap-4 p-6 bg-white/80 dark:bg-gray-900/80 rounded-xl border-2 border-rose-300 dark:border-rose-700 backdrop-blur-sm">
                  <img
                    src={rosesTargetProfile.profile_image_url || "/placeholder.svg"}
                    alt={rosesTargetProfile.full_name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-rose-400 shadow-xl"
                  />
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-red-100">{rosesTargetProfile.full_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-red-300">Age {rosesTargetProfile.age}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-rose-100 to-red-100 dark:from-red-950/50 dark:to-rose-950/50 p-6 rounded-xl border-2 border-rose-300 dark:border-rose-800">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Flower2 className="h-6 w-6 text-rose-600 dark:text-rose-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-lg text-rose-900 dark:text-rose-200 mb-2">💐 VIP Premium Roses Experience</h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-red-200">
                      <li className="flex items-center gap-2">
                        <span className="text-rose-500">✓</span>
                        <span><strong>Instant Match:</strong> Skip the waiting game</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-rose-500">✓</span>
                        <span><strong>Automatic Like Back:</strong> They'll match with you instantly</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-rose-500">✓</span>
                        <span><strong>Exclusive Rose Theme:</strong> Special chat background with roses</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-rose-500">✓</span>
                        <span><strong>VIP Status:</strong> Stand out as a premium member</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 border-t-2 border-rose-300 dark:border-rose-800">
                  <Crown className="h-6 w-6 text-yellow-500 animate-pulse" />
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-rose-700 dark:text-rose-300">€50.00</span>
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full mt-1">TEST MODE - FREE</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-red-400">One-time VIP purchase</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPremiumRosesDialog(false)}
                className="flex-1 border-2 border-gray-300 dark:border-red-800 hover:bg-gray-100 dark:hover:bg-red-950/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePremiumRoses}
                className="flex-1 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:via-red-700 hover:to-rose-800 text-white font-bold text-lg shadow-xl border-2 border-yellow-400 dark:border-yellow-500"
              >
                <Flower2 className="h-5 w-5 mr-2 animate-bounce" />
                Send Roses 💐 (Test)
              </Button>
            </div>

            <p className="text-xs text-center text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 py-2 rounded">
              🧪 TEST MODE: No payment required - Testing Premium Roses feature
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instant Message Dialog */}
      <Dialog open={showInstantMessageDialog} onOpenChange={setShowInstantMessageDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-cyan-500" />
              Instant Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {instantMessageTargetProfile && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg">
                <img
                  src={instantMessageTargetProfile.profile_image_url || "/placeholder.svg"}
                  alt={instantMessageTargetProfile.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold">{instantMessageTargetProfile.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Send a message without matching first!
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="instant-message-text">Your Message</Label>
              <Textarea
                id="instant-message-text"
                placeholder="Write something interesting... 💬"
                value={instantMessageText}
                onChange={(e) => setInstantMessageText(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {instantMessageText.length}/500 characters
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium">Credits remaining:</span>
              </div>
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                {instantMessageCredits}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowInstantMessageDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={sendInstantMessage}
                disabled={!instantMessageText.trim() || instantMessageCredits === 0}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground border-t pt-3">
              💡 Tip: Write something personalized to increase your chances of a response!
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {swipeLimit.isPremium ? "Premium Active" : "Upgrade to Premium"}
            </DialogTitle>
          </DialogHeader>
          {swipeLimit.isPremium ? (
            <div className="py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Crown className="h-8 w-8 text-accent-foreground" />
                </div>
                <h4 className="text-lg font-semibold">You're Already Premium!</h4>
                <p className="text-muted-foreground">
                  You have access to all premium features including unlimited swipes, 
                  advanced filters, and the ability to see who liked you.
                </p>
                <ul className="space-y-2 text-left w-full">
                  <li className="flex items-center gap-2 text-green-600">
                    <Heart className="h-5 w-5" />
                    Unlimited Swipes ✓
                  </li>
                  <li className="flex items-center gap-2 text-green-600">
                    <MessageCircle className="h-5 w-5" />
                    See who liked you ✓
                  </li>
                  <li className="flex items-center gap-2 text-green-600">
                    <Settings className="h-5 w-5" />
                    Advanced filters ✓
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <h4 className="text-lg font-semibold mb-4">Premium Benefits:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Unlimited Swipes
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  See who liked you
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Advanced filters
                </li>
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              {swipeLimit.isPremium ? "Close" : "Later"}
            </Button>
            {!swipeLimit.isPremium && (
              <Button onClick={handleUpgrade}>Upgrade Now</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {currentProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {currentProfile.full_name}, {currentProfile.age}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Image Carousel */}
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                  {currentProfile.profile_images && currentProfile.profile_images.length > 0 ? (
                    <>
                      <img
                        src={currentProfile.profile_images[selectedImageIndex] || currentProfile.profile_image_url || "/placeholder.svg"}
                        alt={`${currentProfile.full_name} - Photo ${selectedImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {currentProfile.profile_images.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            onClick={() => setSelectedImageIndex((prev) => 
                              prev === 0 ? currentProfile.profile_images!.length - 1 : prev - 1
                            )}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            onClick={() => setSelectedImageIndex((prev) => 
                              prev === currentProfile.profile_images!.length - 1 ? 0 : prev + 1
                            )}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </Button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {currentProfile.profile_images.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${
                                  idx === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <img
                      src={currentProfile.profile_image_url || "/placeholder.svg"}
                      alt={currentProfile.full_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Location */}
                {currentProfile.city && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">{currentProfile.city}</span>
                    {currentProfile.distance_km && (
                      <span className="text-muted-foreground">• {formatDistance(currentProfile.distance_km)} away</span>
                    )}
                  </div>
                )}

                {/* Profile Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {currentProfile.work && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.work}</p>
                    </Card>
                  )}
                  {currentProfile.education && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.education}</p>
                    </Card>
                  )}
                  {(currentProfile.height_cm || currentProfile.height) && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {currentProfile.height_cm ? `${currentProfile.height_cm} cm` : currentProfile.height}
                      </p>
                    </Card>
                  )}
                  {currentProfile.zodiac_sign && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.zodiac_sign}</p>
                    </Card>
                  )}
                  {currentProfile.religion && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.religion}</p>
                    </Card>
                  )}
                  {currentProfile.lifestyle && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.lifestyle}</p>
                    </Card>
                  )}
                  {currentProfile.drinking && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.drinking}</p>
                    </Card>
                  )}
                  {currentProfile.smoking && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.smoking}</p>
                    </Card>
                  )}
                  {currentProfile.pets && (
                    <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                      <p className="font-semibold text-sm text-gray-800">{currentProfile.pets}</p>
                    </Card>
                  )}
                </div>

                {/* Bio */}
                {currentProfile.bio && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">💬</span> About
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">{currentProfile.bio}</p>
                  </div>
                )}

                {/* Looking For */}
                {currentProfile.looking_for && currentProfile.looking_for.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">💕</span> Looking For
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.looking_for.map((item, idx) => (
                        <Badge key={idx} className="text-sm py-1.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-none">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">✨</span> Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.interests.map((interest, idx) => (
                        <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-4 rounded-full bg-pink-50 text-pink-700 border-pink-200">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowProfileDialog(false);
                      handlePass(currentProfile.id);
                    }}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Pass
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                    onClick={() => {
                      setShowProfileDialog(false);
                      handleLike(currentProfile.id);
                    }}
                  >
                    <Heart className="h-5 w-5 mr-2" />
                    Like
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Superlike Purchase Dialog */}
      <Dialog open={showSuperlikeDialog} onOpenChange={setShowSuperlikeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              Get Superlikes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-muted-foreground">
              Stand out from the crowd! Superlikes give you 3x more chances to match.
            </p>

            {/* Premium Upsell */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Premium Benefit</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Premium members get 5 free Superlikes every month!
              </p>
              <Button
                variant="outline"
                className="w-full mt-3 border-purple-500/50 hover:bg-purple-500/10"
                onClick={() => {
                  setShowSuperlikeDialog(false);
                  navigate("/premium");
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>

            {/* Purchase Options */}
            <div className="space-y-3">
              <h3 className="font-semibold">Or Buy Superlikes</h3>
              
              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4"
                onClick={() => {
                  handlePurchaseSuperlikes(1);
                  setShowSuperlikeDialog(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">1 Superlike</span>
                </div>
                <span className="text-lg font-bold">€3.00</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4 border-purple-500/30 relative"
                onClick={() => {
                  handlePurchaseSuperlikes(5);
                  setShowSuperlikeDialog(false);
                }}
              >
                <Badge className="absolute -top-2 -right-2 bg-green-600">Save 20%</Badge>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">5 Superlikes</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">€12.00</div>
                  <div className="text-xs text-muted-foreground line-through">€15.00</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto p-4 border-yellow-500/30 relative"
                onClick={() => {
                  handlePurchaseSuperlikes(10);
                  setShowSuperlikeDialog(false);
                }}
              >
                <Badge className="absolute -top-2 -right-2 bg-yellow-600">Best Value</Badge>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">10 Superlikes</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">€20.00</div>
                  <div className="text-xs text-muted-foreground line-through">€30.00</div>
                </div>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Animation - Only render when needed */}
      {showMatchAnimation && (
        <MatchAnimation 
          show={showMatchAnimation}
          matchName={matchedProfile?.full_name || "Someone"}
          onComplete={() => {
            setShowMatchAnimation(false);
            setIsPremiumRosesMatch(false);
          }}
          isPremiumRoses={isPremiumRosesMatch}
        />
      )}

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="flex border-b">
            <button
              onClick={() => setNotificationTab("views")}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                notificationTab === "views"
                  ? "border-b-2 border-pink-500 text-pink-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Profile Views ({profileViews.length})</span>
              </div>
            </button>
            <button
              onClick={() => setNotificationTab("likes")}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                notificationTab === "likes"
                  ? "border-b-2 border-pink-500 text-pink-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Heart className="h-4 w-4" />
                <span>Likes ({profileLikes.length})</span>
              </div>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            {notificationTab === "views" ? (
              profileViews.length > 0 ? (
                <div className="space-y-3">
                  {profileViews.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setNotificationProfile(profile);
                        setShowNotificationProfileDialog(true);
                      }}
                    >
                      <Avatar className="h-12 w-12 border-2 border-pink-200">
                        <AvatarImage src={profile.profile_image_url || ""} alt={profile.full_name} />
                        <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                          {profile.verified && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {profile.age} • {profile.location || "Location hidden"}
                        </p>
                        {profile.timestamp && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatTimeAgo(profile.timestamp)}
                          </p>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No profile views yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    People who view your profile will appear here
                  </p>
                </div>
              )
            ) : (
              profileLikes.length > 0 ? (
                <div className="space-y-3">
                  {profileLikes.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setNotificationProfile(profile);
                        setShowNotificationProfileDialog(true);
                      }}
                    >
                      <Avatar className="h-12 w-12 border-2 border-pink-200">
                        <AvatarImage src={profile.profile_image_url || ""} alt={profile.full_name} />
                        <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                          {profile.verified && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {profile.age} • {profile.location || "Location hidden"}
                        </p>
                        {profile.timestamp && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatTimeAgo(profile.timestamp)}
                          </p>
                        )}
                      </div>
                      <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No likes yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    People who like you will appear here
                  </p>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Profile Dialog - Show full profile with all photos and info */}
      <Dialog open={showNotificationProfileDialog} onOpenChange={(open) => {
        setShowNotificationProfileDialog(open);
        if (!open) {
          setNotificationProfileImageIndex(0);
          setShowNotificationFullProfile(false);
        }
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Profile Details</DialogTitle>
          </DialogHeader>
          {notificationProfile && (() => {
            const allImages = [
              notificationProfile.profile_image_url,
              ...(notificationProfile.profile_images || [])
            ].filter(Boolean) as string[];
            
            return (
              <div className="overflow-y-auto max-h-[90vh]">
                <Card className="overflow-hidden shadow-2xl border-none dark:bg-gradient-to-br dark:from-red-950 dark:to-black dark:border dark:border-red-900/30">
                  {/* Image with Profile Info Overlay - Matching Discovery Card */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-900 to-gray-800 dark:from-black dark:to-red-950">
                    {allImages.length > 0 ? (
                      <>
                        <img
                          src={allImages[notificationProfileImageIndex]}
                          alt={notificationProfile.full_name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Image Navigation Dots */}
                        {allImages.length > 1 && (
                          <div className="absolute top-2 left-0 right-0 flex justify-center gap-1 px-2 z-10">
                            {allImages.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-1 flex-1 rounded-full transition-all ${
                                  idx === notificationProfileImageIndex
                                    ? "bg-white"
                                    : "bg-white/30"
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Gradient overlay for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        {/* Profile info overlay on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="flex items-end justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-3xl font-bold drop-shadow-lg">
                                  {notificationProfile.full_name}
                                </h3>
                                <span className="text-2xl font-light">{notificationProfile.age}</span>
                                {notificationProfile.verified && (
                                  <Badge className="bg-blue-500 text-white border-none">✓</Badge>
                                )}
                              </div>
                              
                              {/* Location & Distance */}
                              <div className="flex items-center gap-3 text-sm font-medium">
                                {notificationProfile.city && (
                                  <div className="flex items-center gap-1 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                                    <MapPin className="h-4 w-4" />
                                    <span>{notificationProfile.city}</span>
                                  </div>
                                )}
                                {notificationProfile.distance_km && (
                                  <div className="backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                                    {formatDistance(notificationProfile.distance_km)} away
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Click zones for navigation */}
                        {allImages.length > 1 && (
                          <>
                            <div
                              className="absolute top-0 left-0 w-1/3 h-full cursor-pointer z-20"
                              onClick={() => setNotificationProfileImageIndex(prev => 
                                prev > 0 ? prev - 1 : allImages.length - 1
                              )}
                            />
                            <div
                              className="absolute top-0 right-0 w-1/3 h-full cursor-pointer z-20"
                              onClick={() => setNotificationProfileImageIndex(prev => 
                                prev < allImages.length - 1 ? prev + 1 : 0
                              )}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No photo
                      </div>
                    )}
                  </div>
                  
                  {/* Card content below image - Matching Discovery Card */}
                  <div className="p-5 bg-white space-y-4">
                    {notificationProfile.bio && (
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{notificationProfile.bio}</p>
                    )}
                    
                    {notificationProfile.interests && notificationProfile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {notificationProfile.interests.slice(0, 5).map((interest, i) => (
                          <Badge key={i} variant="secondary" className="rounded-full px-3 py-1 bg-pink-50 text-pink-700 border-pink-200">
                            {interest}
                          </Badge>
                        ))}
                        {notificationProfile.interests.length > 5 && (
                          <Badge variant="secondary" className="rounded-full px-3 py-1 bg-gray-100 text-gray-600">
                            +{notificationProfile.interests.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* See Full Profile Button */}
                    {!showNotificationFullProfile && (
                      <Button
                        variant="ghost"
                        className="w-full text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50 font-medium"
                        onClick={() => setShowNotificationFullProfile(true)}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        See Full Profile
                      </Button>
                    )}

                    {/* Full Profile Details - Show when expanded */}
                    {showNotificationFullProfile && (
                      <div className="space-y-4 pt-2 border-t">
                        {/* About Section */}
                        {notificationProfile.bio && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              About
                            </h4>
                            <p className="text-gray-700 leading-relaxed">{notificationProfile.bio}</p>
                          </div>
                        )}
                        
                        {/* Basic Info Grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {notificationProfile.work && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{notificationProfile.work}</span>
                            </div>
                          )}
                          {notificationProfile.education && (
                            <div className="flex items-center gap-2 text-sm">
                              <GraduationCap className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{notificationProfile.education}</span>
                            </div>
                          )}
                          {notificationProfile.height && (
                            <div className="flex items-center gap-2 text-sm">
                              <Ruler className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{notificationProfile.height}</span>
                            </div>
                          )}
                          {notificationProfile.zodiac_sign && (
                            <div className="flex items-center gap-2 text-sm">
                              <Sparkles className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{notificationProfile.zodiac_sign}</span>
                            </div>
                          )}
                          {notificationProfile.religion && (
                            <div className="flex items-center gap-2 text-sm">
                              <Church className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{notificationProfile.religion}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* All Interests when expanded */}
                        {notificationProfile.interests && notificationProfile.interests.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Heart className="h-4 w-4" />
                              Interests
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {notificationProfile.interests.map((interest, i) => (
                                <Badge key={i} variant="secondary" className="rounded-full px-3 py-1 bg-pink-50 text-pink-700 border-pink-200">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Premium Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      {/* Instant Message Button */}
                      <Button
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                        onClick={() => {
                          setInstantMessageTargetProfile(notificationProfile);
                          setShowNotificationProfileDialog(false);
                          setShowInstantMessageDialog(true);
                        }}
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Instant Message
                      </Button>

                      {/* Rose Button */}
                      <Button
                        className="bg-gradient-to-br from-rose-600 via-red-700 to-rose-800 hover:from-rose-700 hover:via-red-800 hover:to-rose-900 text-white border-2 border-yellow-400"
                        onClick={() => {
                          setRosesTargetProfile(notificationProfile);
                          setShowNotificationProfileDialog(false);
                          setShowPremiumRosesDialog(true);
                        }}
                      >
                        <span className="text-2xl">🌹</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Discover;
import { useState, useEffect, useCallback } from "react";
import { sanitizeText } from "@/lib/sanitize";

import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Heart,
  ArrowLeft,
  Crown,
  Lock,
  X,
  Flame,
  Eye,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { MatchAnimation } from "@/components/MatchAnimation";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";

interface LikeWithProfile {
  id: string;
  is_superlike: boolean;
  profile: {
    id: string;
    full_name: string;
    age: number;
    location: string;
    bio: string | null;
    interests: string[];
    profile_image_url: string | null;
    profile_images: string[] | null;
    verified: boolean;
    is_premium: boolean;
    video_intro_url: string | null;
    work: string | null;
    education: string | null;
    height: string | null;
    height_cm: number | null;
    zodiac_sign: string | null;
    religion: string | null;
    lifestyle: string | null;
    drinking: string | null;
    smoking: string | null;
    pets: string | null;
    city: string | null;
    country: string | null;
    looking_for: string[] | null;
    soundtrack_url: string | null;
    soundtrack_source: string | null;
    soundtrack_title: string | null;
    soundtrack_artist: string | null;
    travel_mode_active: boolean;
    travel_city: string | null;
    distance_km: number | null;
  };
}

interface ProfileData {
  id: string;
  full_name: string;
  age: number;
  city: string;
  country: string;
  bio: string | null;
  interests: string[];
  profile_image_url: string | null;
}

interface LikeData {
  id: string;
  profiles: ProfileData;
}

const WhoLikedYou = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<LikeWithProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<LikeWithProfile | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [streakCredits, setStreakCredits] = useState(0);
  const [revealedProfileIds, setRevealedProfileIds] = useState<Set<string>>(new Set());

  const checkPremiumAndFetchLikes = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if user is premium (from profiles table)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      const userIsPremium = profileData?.is_premium || false;
      setIsPremium(userIsPremium);
      logger.log("Premium status:", userIsPremium);

      // Update daily streak and get credits
      const { data: streakData } = (await supabase.rpc("update_daily_streak", {
        p_user_id: user.id,
      })) as {
        data: {
          streak_count: number;
          streak_free_likes_credits: number;
          reward_earned: boolean;
          already_checked_in: boolean;
        } | null;
        error: unknown;
      };

      if (streakData) {
        setStreakCount(streakData.streak_count);
        setStreakCredits(streakData.streak_free_likes_credits);
        if (streakData.reward_earned) {
          toast.success(`🔥 7-day streak! You earned 2 free like reveals!`);
        }
      }

      // Get likes from users who are NOT already matched
      const { data: likesData, error } = await supabase
        .from("likes")
        .select("id, liker_id, is_superlike")
        .eq("liked_id", user.id);

      if (error) throw error;

      // Get all existing matches to exclude them
      const { data: matchesData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      // Extract matched user IDs
      const matchedUserIds = new Set(
        (matchesData || []).map((match) =>
          match.user1_id === user.id ? match.user2_id : match.user1_id
        )
      );

      // Filter out likes from already matched users
      const unMatchedLikes = (likesData || []).filter((like) => !matchedUserIds.has(like.liker_id));

      // Fetch profiles for each unmatched liker
      const likesWithProfiles = await Promise.all(
        unMatchedLikes.map(async (like) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select(
              "id, full_name, age, city, country, bio, interests, profile_image_url, profile_images, verified, is_premium, video_intro_url, work, education, height, height_cm, zodiac_sign, religion, lifestyle, drinking, smoking, pets, looking_for, soundtrack_url, soundtrack_source, soundtrack_title, soundtrack_artist, travel_mode_active, travel_city"
            )
            .eq("id", like.liker_id)
            .single();

          return {
            id: like.id,
            is_superlike:
              (like as { id: string; liker_id: string; is_superlike: boolean }).is_superlike ||
              false,
            profile: profile
              ? {
                  id: profile.id,
                  full_name: profile.full_name,
                  age: profile.age,
                  location: `${profile.city || ""}, ${profile.country || ""}`.replace(
                    /^, |, $/,
                    ""
                  ),
                  bio: profile.bio,
                  interests: profile.interests || [],
                  profile_image_url: profile.profile_image_url,
                  profile_images: profile.profile_images || null,
                  verified: profile.verified || false,
                  is_premium: profile.is_premium || false,
                  video_intro_url: profile.video_intro_url || null,
                  work: profile.work || null,
                  education: profile.education || null,
                  height: profile.height || null,
                  height_cm: profile.height_cm || null,
                  zodiac_sign: profile.zodiac_sign || null,
                  religion: profile.religion || null,
                  lifestyle: profile.lifestyle || null,
                  drinking: profile.drinking || null,
                  smoking: profile.smoking || null,
                  pets: profile.pets || null,
                  city: profile.city || null,
                  country: profile.country || null,
                  looking_for: profile.looking_for || null,
                  soundtrack_url: profile.soundtrack_url || null,
                  soundtrack_source: profile.soundtrack_source || null,
                  soundtrack_title: profile.soundtrack_title || null,
                  soundtrack_artist: profile.soundtrack_artist || null,
                  travel_mode_active: profile.travel_mode_active || false,
                  travel_city: profile.travel_city || null,
                  distance_km: null,
                }
              : {
                  id: like.liker_id,
                  full_name: "Unknown User",
                  age: 0,
                  location: "Unknown",
                  bio: null,
                  interests: [],
                  profile_image_url: null,
                  profile_images: null,
                  verified: false,
                  is_premium: false,
                  video_intro_url: null,
                  work: null,
                  education: null,
                  height: null,
                  height_cm: null,
                  zodiac_sign: null,
                  religion: null,
                  lifestyle: null,
                  drinking: null,
                  smoking: null,
                  pets: null,
                  city: null,
                  country: null,
                  looking_for: null,
                  soundtrack_url: null,
                  soundtrack_source: null,
                  soundtrack_title: null,
                  soundtrack_artist: null,
                  travel_mode_active: false,
                  travel_city: null,
                  distance_km: null,
                },
          };
        })
      );

      setLikes(likesWithProfiles);
    } catch (error) {
      logger.error("Error fetching likes:", error);
      toast.error("Failed to load likes");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkPremiumAndFetchLikes();

    // Fetch current user's interests for Shared Interests section
    const fetchMyInterests = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user.id)
        .single();
      setMyInterests((data?.interests || []) as string[]);
    };
    fetchMyInterests();

    // Real-time subscription: refresh when someone likes us
    const likesChannel = supabase
      .channel(`who-liked-you:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `liked_id=eq.${user.id}`,
        },
        () => {
          checkPremiumAndFetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [user, navigate, checkPremiumAndFetchLikes]);

  const handleViewProfile = (like: LikeWithProfile) => {
    if (isPremium || revealedProfileIds.has(like.profile.id)) {
      setSelectedProfile(like);
      return;
    }
    handleUpgradeToPremium();
  };

  const handleRevealWithCredit = async (e: React.MouseEvent, like: LikeWithProfile) => {
    e.stopPropagation();
    if (!user || streakCredits <= 0) return;

    const { data, error } = (await supabase.rpc("use_streak_like_credit", {
      p_user_id: user.id,
    })) as {
      data: { success: boolean; credits_remaining: number; error?: string } | null;
      error: unknown;
    };

    if (error || !data?.success) {
      toast.error("Failed to use streak credit");
      return;
    }

    setStreakCredits(data.credits_remaining);
    setRevealedProfileIds((prev) => new Set([...prev, like.profile.id]));
    toast.success(
      `Profile revealed! ${data.credits_remaining} credit${data.credits_remaining !== 1 ? "s" : ""} remaining`
    );
  };

  const handleLike = async (profileId: string) => {
    if (!user) return;

    try {
      // Use like_user RPC — creates matches row automatically on mutual like
      const { data: likeResult, error: likeError } = await supabase.rpc("like_user", {
        p_liked_id: profileId,
      });

      if (likeError) throw likeError;

      if (likeResult?.match_created) {
        // Show match animation
        const likedProfile = likes.find((like) => like.profile.id === profileId);
        if (likedProfile) {
          setMatchedProfile(likedProfile);
          setShowMatchAnimation(true);
        }
        // Notify matched person (fire-and-forget)
        supabase.functions.invoke("send-push", {
          body: {
            user_id: profileId,
            title: "It's a match! 💜",
            body: "You matched on Shqiponja — say hello!",
            url: "/matches",
          },
        });
      } else {
        toast.success("Like sent! ❤️");
        // Notify liked person (fire-and-forget)
        supabase.functions.invoke("send-push", {
          body: {
            user_id: profileId,
            title: "Someone liked your profile! 🦅",
            body: "You have a new like on Shqiponja — tap to see who",
            url: "/who-liked-you",
          },
        });
      }

      // Remove from list
      setLikes(likes.filter((like) => like.profile.id !== profileId));
    } catch (error) {
      logger.error("Like error:", error);
      toast.error("Failed to like profile");
    }
  };

  const handleUpgradeToPremium = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to start checkout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show page with blurred profiles for non-premium users

  return (
    <div className="min-h-dvh pb-24 page-bg">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-primary">Shqiponja</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/discover")}
              className="hover:bg-muted rounded-full"
            >
              <ArrowLeft className="h-6 w-6 text-primary/80" />
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
              Who Liked You
              {isPremium && (
                <Badge className="bg-gradient-to-r from-primary to-primary/90 text-white border-none">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {likes.length} {likes.length === 1 ? "person has" : "people have"} liked you
              {!isPremium && streakCredits === 0 && " · Upgrade to see who"}
            </p>
          </div>
        </div>

        {/* Streak Banner */}
        {!isPremium && (
          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    {streakCount} day streak {streakCount >= 6 ? "🔥" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {streakCount < 7
                      ? `${7 - streakCount} more day${7 - streakCount !== 1 ? "s" : ""} for 2 free reveals`
                      : streakCredits > 0
                        ? `${streakCredits} free reveal${streakCredits !== 1 ? "s" : ""} available!`
                        : "Keep going for more rewards!"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      i < streakCount ? "bg-orange-500" : "bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paywall banner for non-premium users with pending likes */}
        {!isPremium && likes.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-primary/15 to-purple-500/15 border border-primary/30 rounded-2xl p-5 text-center">
            <p className="text-5xl font-black text-primary mb-1 tabular-nums">{likes.length}</p>
            <p className="text-lg font-semibold text-foreground mb-1">
              {likes.length === 1 ? "person is" : "people are"} waiting for you 💜
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to see who liked you and match instantly
            </p>
            <ul className="text-left inline-block space-y-1.5 text-sm text-foreground mb-5">
              <li className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span> See full names &amp; photos
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span> Like back to match instantly
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400 font-bold">✓</span> Unlimited daily swipes
              </li>
            </ul>
            <Button
              className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-base py-3 rounded-xl shadow-lg hover:opacity-90"
              onClick={handleUpgradeToPremium}
            >
              <Crown className="h-5 w-5 mr-2" />
              Unlock All {likes.length} {likes.length === 1 ? "Profile" : "Profiles"}
            </Button>
          </div>
        )}

        {likes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likes.map((like, index) => (
              <Card
                key={like.id}
                className={`overflow-hidden transition-all duration-300 cursor-pointer rounded-3xl border-0 ${
                  like.is_superlike
                    ? "shadow-[0_20px_60px_rgba(250,204,21,0.35)] hover:shadow-[0_25px_70px_rgba(250,204,21,0.5)]"
                    : "shadow-[0_20px_60px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_70px_rgba(0,0,0,0.3)]"
                }`}
                onClick={() => handleViewProfile(like)}
              >
                <div className="relative aspect-[3/4] bg-gradient-to-br from-background via-muted to-primary/20">
                  {like.profile.profile_image_url ? (
                    <img
                      src={like.profile.profile_image_url}
                      alt={
                        isPremium || revealedProfileIds.has(like.profile.id)
                          ? like.profile.full_name
                          : "Premium Feature"
                      }
                      loading={index < 2 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${!(isPremium || revealedProfileIds.has(like.profile.id)) ? "blur-2xl" : ""}`}
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br from-primary to-[hsl(18,72%,55%)] flex items-center justify-center ${!(isPremium || revealedProfileIds.has(like.profile.id)) ? "blur-2xl" : ""}`}
                    >
                      <span className="text-6xl text-white font-serif">
                        {like.profile.full_name[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Super Like badge */}
                  {like.is_superlike && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-yellow-400/90 backdrop-blur-sm text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      <Sparkles className="h-3 w-3" />
                      Super Like
                    </div>
                  )}

                  {/* Blur overlay for non-premium and non-revealed */}
                  {!(isPremium || revealedProfileIds.has(like.profile.id)) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 backdrop-blur-sm gap-2 px-4">
                      <div className="flex gap-1">
                        <span className="text-2xl animate-bounce [animation-delay:0ms]">❤️</span>
                        <span className="text-2xl animate-bounce [animation-delay:150ms]">💜</span>
                        <span className="text-2xl animate-bounce [animation-delay:300ms]">🧡</span>
                      </div>
                      <p className="font-semibold text-white text-sm leading-tight text-center">
                        They liked you!
                      </p>
                      <p className="text-white/60 text-xs text-center">
                        Upgrade to see their full profile
                      </p>
                    </div>
                  )}

                  <div
                    className={`absolute bottom-0 left-0 right-0 p-6 text-white ${!(isPremium || revealedProfileIds.has(like.profile.id)) ? "blur-md" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                        {isPremium || revealedProfileIds.has(like.profile.id)
                          ? like.profile.full_name
                          : "Someone"}
                      </h3>
                      {(isPremium || revealedProfileIds.has(like.profile.id)) &&
                        like.profile.age && (
                          <span className="text-2xl font-light opacity-90">{like.profile.age}</span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-white/75 mb-2">
                      {isPremium || revealedProfileIds.has(like.profile.id)
                        ? like.profile.location
                        : "Nearby"}
                    </p>
                    {(isPremium || revealedProfileIds.has(like.profile.id)) &&
                      like.profile.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {like.profile.interests.slice(0, 3).map((interest) => (
                            <Badge
                              key={interest}
                              variant="secondary"
                              className="rounded-full px-3 py-1.5 bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                            >
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                <div className="px-4 py-3 bg-card border-t border-border/30">
                  {isPremium || revealedProfileIds.has(like.profile.id) ? (
                    <Button
                      className="w-full rounded-2xl bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white border-0 shadow-[0_4px_14px_hsl(350,65%,60%,0.3)] hover:brightness-110 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(like.profile.id);
                      }}
                    >
                      <Heart className="h-4 w-4 mr-2 fill-current" />
                      Like Back
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {streakCredits > 0 && (
                        <Button
                          className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 text-xs"
                          onClick={(e) => handleRevealWithCredit(e, like)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Reveal ({streakCredits})
                        </Button>
                      )}
                      <Button
                        className={`${streakCredits > 0 ? "flex-1" : "w-full"} rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold hover:brightness-110 text-xs`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpgradeToPremium();
                        }}
                      >
                        <Crown className="h-4 w-4 mr-1.5" />
                        Reveal &amp; Match
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center shadow-[0_16px_48px_rgba(0,0,0,0.3)] border border-white/6 rounded-3xl bg-card">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-2xl font-bold mb-2">No likes yet</h3>
            <p className="text-muted-foreground">Keep swiping to find your perfect match!</p>
          </Card>
        )}
      </div>

      {/* Match Animation */}
      {showMatchAnimation && matchedProfile && (
        <MatchAnimation
          show={showMatchAnimation}
          matchName={matchedProfile.profile.full_name}
          onComplete={() => {
            setShowMatchAnimation(false);
            setMatchedProfile(null);
            // Navigate to matches page after animation
            navigate("/matches");
          }}
        />
      )}

      {/* Profile View Dialog */}
      {selectedProfile && (
        <Dialog
          open={!!selectedProfile}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProfile(null);
              setSelectedImageIndex(0);
            }
          }}
        >
          <DialogContent
            className="max-w-3xl max-h-[90vh] overflow-y-auto"
            aria-describedby={undefined}
          >
            {(() => {
              const p = selectedProfile.profile;
              const allImages = [p.profile_image_url, ...(p.profile_images || [])].filter(
                Boolean
              ) as string[];

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      {p.full_name}, {p.age}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2">
                      {p.verified && (
                        <Badge className="bg-primary text-white border-none">Verified</Badge>
                      )}
                      {p.is_premium && (
                        <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                          Premium
                        </Badge>
                      )}
                      {p.video_intro_url && (
                        <Badge className="bg-background/80 text-white border-none">
                          Video Intro
                        </Badge>
                      )}
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Image Carousel */}
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                      {allImages.length > 0 ? (
                        <>
                          <img
                            src={allImages[selectedImageIndex]}
                            alt={`${p.full_name} - Photo ${selectedImageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {allImages.length > 1 && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                                onClick={() =>
                                  setSelectedImageIndex((prev) =>
                                    prev === 0 ? allImages.length - 1 : prev - 1
                                  )
                                }
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                                onClick={() =>
                                  setSelectedImageIndex((prev) =>
                                    prev === allImages.length - 1 ? 0 : prev + 1
                                  )
                                }
                              >
                                <ChevronRight className="h-6 w-6" />
                              </Button>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {allImages.map((_, idx) => (
                                  <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${idx === selectedImageIndex ? "bg-card" : "bg-card/50"}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Video Intro */}
                    {p.video_intro_url && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Video intro</h4>
                        <div className="rounded-lg overflow-hidden border border-primary/20">
                          <video
                            src={p.video_intro_url}
                            controls
                            className="w-full max-h-[420px] object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {p.travel_mode_active && p.travel_city ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="text-lg">✈️</span>
                        <span className="font-medium">Traveling in {p.travel_city}</span>
                        {p.distance_km && (
                          <span className="text-muted-foreground">
                            • {Math.round(p.distance_km)} km away
                          </span>
                        )}
                      </div>
                    ) : p.city || p.location ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-5 w-5 text-primary" />
                        <span className="font-medium">{p.city || p.location}</span>
                        {p.distance_km && (
                          <span className="text-muted-foreground">
                            • {Math.round(p.distance_km)} km away
                          </span>
                        )}
                      </div>
                    ) : null}

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {p.work && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                          <p className="font-semibold text-sm text-foreground">{p.work}</p>
                        </Card>
                      )}
                      {p.education && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                          <p className="font-semibold text-sm text-foreground">{p.education}</p>
                        </Card>
                      )}
                      {(p.height_cm || p.height) && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                          <p className="font-semibold text-sm text-foreground">
                            {p.height_cm ? `${p.height_cm} cm` : p.height}
                          </p>
                        </Card>
                      )}
                      {p.zodiac_sign && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                          <p className="font-semibold text-sm text-foreground">{p.zodiac_sign}</p>
                        </Card>
                      )}
                      {p.religion && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                          <p className="font-semibold text-sm text-foreground">{p.religion}</p>
                        </Card>
                      )}
                      {p.lifestyle && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                          <p className="font-semibold text-sm text-foreground">{p.lifestyle}</p>
                        </Card>
                      )}
                      {p.drinking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                          <p className="font-semibold text-sm text-foreground">{p.drinking}</p>
                        </Card>
                      )}
                      {p.smoking && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                          <p className="font-semibold text-sm text-foreground">{p.smoking}</p>
                        </Card>
                      )}
                      {p.pets && (
                        <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                          <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                          <p className="font-semibold text-sm text-foreground">{p.pets}</p>
                        </Card>
                      )}
                    </div>

                    {/* Bio */}
                    {p.bio && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💬</span> About
                        </h3>
                        <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                          {sanitizeText(p.bio)}
                        </p>
                      </div>
                    )}

                    {/* Shared Interests */}
                    {p.interests && p.interests.length > 0 && myInterests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">✨</span> Shared Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.interests
                            .filter((interest) =>
                              myInterests.some(
                                (mine) => mine.toLowerCase() === interest.toLowerCase()
                              )
                            )
                            .slice(0, 3)
                            .map((interest) => (
                              <Badge key={interest} variant="secondary" className="rounded-full">
                                {interest}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Looking For */}
                    {p.looking_for && p.looking_for.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">💕</span> Looking For
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.looking_for.map((item, idx) => (
                            <Badge
                              key={idx}
                              className="text-sm py-1.5 px-4 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 border-none"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interests */}
                    {p.interests && p.interests.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <span className="text-2xl">✨</span> Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {p.interests.map((interest, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-sm py-1.5 px-4 rounded-full bg-primary/10 text-primary border-border"
                            >
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Soundtrack */}
                    {p.soundtrack_url &&
                      p.soundtrack_source &&
                      (() => {
                        const ytMatch =
                          p.soundtrack_source === "youtube"
                            ? p.soundtrack_url?.match(
                                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
                              )
                            : null;
                        const spMatch =
                          p.soundtrack_source === "spotify"
                            ? p.soundtrack_url?.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/)
                            : null;
                        const ytId = ytMatch?.[1] || null;
                        const spId = spMatch?.[1] || null;
                        if (!ytId && !spId) return null;
                        return (
                          <div className="space-y-2">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <span className="text-2xl">🎵</span> Soundtrack
                            </h3>
                            {(p.soundtrack_title || p.soundtrack_artist) && (
                              <p className="text-sm text-muted-foreground">
                                {p.soundtrack_title}
                                {p.soundtrack_artist ? ` — ${p.soundtrack_artist}` : ""}
                              </p>
                            )}
                            {ytId && (
                              <div className="rounded-xl overflow-hidden aspect-video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}`}
                                  title="Profile soundtrack"
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {spId && (
                              <div className="rounded-xl overflow-hidden">
                                <iframe
                                  src={`https://open.spotify.com/embed/track/${spId}?theme=0`}
                                  title="Profile soundtrack"
                                  className="w-full"
                                  height="152"
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        size="lg"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setLikes(
                            likes.filter((like) => like.profile.id !== selectedProfile.profile.id)
                          );
                          setSelectedProfile(null);
                        }}
                      >
                        <X className="h-5 w-5 mr-2" />
                        Pass
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
                        onClick={() => {
                          handleLike(selectedProfile.profile.id);
                          setSelectedProfile(null);
                        }}
                      >
                        <Heart className="h-5 w-5 mr-2" />
                        Like Back
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      <BottomNav />
    </div>
  );
};

export default WhoLikedYou;

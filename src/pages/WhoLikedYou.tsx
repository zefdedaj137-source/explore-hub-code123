import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, ArrowLeft, Crown, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { MatchAnimation } from "@/components/MatchAnimation";
import ProfileCard from "@/components/ProfileCard";
import BottomNav from "@/components/BottomNav";

interface LikeWithProfile {
  id: string;
  profile: {
    id: string;
    full_name: string;
    age: number;
    location: string;
    bio: string | null;
    interests: string[];
    profile_image_url: string | null;
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
      console.log("Premium status:", userIsPremium);

      // Get likes from users who are NOT already matched
      const { data: likesData, error } = await supabase
        .from("likes")
        .select("id, liker_id")
        .eq("liked_id", user.id);

      if (error) throw error;

      // Get all existing matches to exclude them
      const { data: matchesData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      // Extract matched user IDs
      const matchedUserIds = new Set(
        (matchesData || []).map(match => 
          match.user1_id === user.id ? match.user2_id : match.user1_id
        )
      );

      // Filter out likes from already matched users
      const unMatchedLikes = (likesData || []).filter(like => 
        !matchedUserIds.has(like.liker_id)
      );

      // Fetch profiles for each unmatched liker
      const likesWithProfiles = await Promise.all(
        unMatchedLikes.map(async (like) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, age, city, country, bio, interests, profile_image_url")
            .eq("id", like.liker_id)
            .single();

          return {
            id: like.id,
            profile: profile ? {
              id: profile.id,
              full_name: profile.full_name,
              age: profile.age,
              location: `${profile.city || ''}, ${profile.country || ''}`.replace(/^, |, $/, ''),
              bio: profile.bio,
              interests: profile.interests || [],
              profile_image_url: profile.profile_image_url
            } : {
              id: like.liker_id,
              full_name: "Unknown User", 
              age: 0,
              location: "Unknown",
              bio: null,
              interests: [],
              profile_image_url: null
            }
          };
        })
      );

      setLikes(likesWithProfiles);
    } catch (error) {
      console.error("Error fetching likes:", error);
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
  }, [user, navigate, checkPremiumAndFetchLikes]);

  const handleViewProfile = (like: LikeWithProfile) => {
    if (!isPremium) {
      handleUpgradeToPremium();
      return;
    }
    setSelectedProfile(like);
  };

  const handleLike = async (profileId: string) => {
    if (!user) return;

    try {
      // Insert like 
      const { error: likeError } = await supabase.from("likes").insert({
        liker_id: user.id,
        liked_id: profileId,
      }).select();

      if (likeError && !likeError.message.includes("duplicate")) {
        throw likeError;
      }

      // Check if they also liked us (mutual like = match)
      const { data: mutualLike } = await supabase
        .from("likes")
        .select("id")
        .eq("liker_id", profileId)
        .eq("liked_id", user.id)
        .maybeSingle();

      if (mutualLike) {
        // Create match
        const { error: matchError } = await supabase.from("matches").insert({
          user1_id: user.id < profileId ? user.id : profileId,
          user2_id: user.id < profileId ? profileId : user.id,
        }).select();

        if (matchError && !matchError.message.includes("duplicate")) {
          console.warn("Match creation error:", matchError);
        }

        // Show match animation
        const likedProfile = likes.find((like) => like.profile.id === profileId);
        if (likedProfile) {
          setMatchedProfile(likedProfile);
          setShowMatchAnimation(true);
        }
      } else {
        toast.success("Like sent! ❤️");
      }

      // Remove from list
      setLikes(likes.filter((like) => like.profile.id !== profileId));
    } catch (error) {
      console.error("Like error:", error);
      toast.error("Failed to like profile");
    }
  };

  const handleUpgradeToPremium = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to start checkout");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show page with blurred profiles for non-premium users

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-yellow-500 font-serif">Shqiponja</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/discover")}
              className="hover:bg-gray-700/50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-yellow-500" />
            </Button>
          </div>
          
          <div className="mt-6">
            <h1 className="font-serif text-3xl font-bold flex items-center gap-2 text-white">
              Who Liked You
              {isPremium && (
                <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white border-none">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              )}
            </h1>
            <p className="text-gray-400 mt-1">
              {likes.length} {likes.length === 1 ? "person has" : "people have"} liked you
              {!isPremium && " · Upgrade to see who"}
            </p>
          </div>
        </div>

        {likes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likes.map((like) => (
              <Card
                key={like.id}
                className="overflow-hidden shadow-elegant hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => handleViewProfile(like)}
              >
                <div className="relative aspect-[3/4]">
                  {like.profile.profile_image_url ? (
                    <img
                      src={like.profile.profile_image_url}
                      alt={isPremium ? like.profile.full_name : "Premium Feature"}
                      className={`w-full h-full object-cover ${!isPremium ? 'blur-2xl' : ''}`}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center ${!isPremium ? 'blur-2xl' : ''}`}>
                      <span className="text-6xl font-serif text-white">
                        {like.profile.full_name[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Blur overlay and lock icon for non-premium */}
                  {!isPremium && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="text-center text-white">
                        <Lock className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                        <p className="font-semibold">Premium Feature</p>
                      </div>
                    </div>
                  )}

                  <div className={`absolute bottom-0 left-0 right-0 p-4 text-white ${!isPremium ? 'blur-md' : ''}`}>
                    <h3 className="font-serif text-2xl font-bold mb-1">
                      {isPremium ? `${like.profile.full_name}, ${like.profile.age}` : 'Someone'}
                    </h3>
                    <p className="text-sm mb-2 text-gray-300">
                      {isPremium ? like.profile.location : 'Nearby'}
                    </p>
                    {isPremium && like.profile.bio && (
                      <p className="text-sm text-white/90 mb-3 line-clamp-2">
                        {like.profile.bio}
                      </p>
                    )}
                    {isPremium && like.profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {like.profile.interests.slice(0, 3).map((interest, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-card">
                  {isPremium ? (
                    <Button
                      className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(like.profile.id);
                      }}
                    >
                      <Heart className="h-5 w-5 mr-2 fill-current" />
                      Like Back
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-gradient-gold text-accent-foreground hover:opacity-90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgradeToPremium();
                      }}
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Upgrade to See
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center shadow-elegant">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-serif text-2xl font-bold mb-2">No likes yet</h3>
            <p className="text-muted-foreground">
              Keep swiping to find your perfect match!
            </p>
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
            navigate('/matches');
          }}
        />
      )}

      {/* Profile Card Dialog */}
      {selectedProfile && (
        <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            <div className="relative">
              <ProfileCard
                name={selectedProfile.profile.full_name}
                age={selectedProfile.profile.age}
                location={selectedProfile.profile.location}
                city={selectedProfile.profile.location.split(",")[0] || ""}
                country={selectedProfile.profile.location.split(",")[1]?.trim() || ""}
                bio={selectedProfile.profile.bio || ""}
                interests={selectedProfile.profile.interests}
                image={selectedProfile.profile.profile_image_url || ""}
                verified={true}
              />
              <div className="p-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setLikes(likes.filter((like) => like.profile.id !== selectedProfile.profile.id));
                    setSelectedProfile(null);
                  }}
                >
                  <X className="h-5 w-5 mr-2" />
                  Pass
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
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
          </DialogContent>
        </Dialog>
      )}

      <BottomNav />
    </div>
  );
};

export default WhoLikedYou;

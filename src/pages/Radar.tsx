import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Navigation, Heart, Users, Settings, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistance } from "@/lib/distance";
import BottomNav from "@/components/BottomNav";
import "./Radar.css";

interface NearbyUser {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string;
  profile_images?: string[];
  bio: string;
  distance: number;
  latitude: number;
  longitude: number;
  interests?: string[];
  city?: string;
  country?: string;
  work?: string;
  education?: string;
  height?: string;
  zodiac_sign?: string;
  religion?: string;
  lifestyle?: string;
  drinking?: string;
  smoking?: string;
  pets?: string;
  looking_for?: string[];
}

export default function Radar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Update user's location in database
  const updateUserLocation = useCallback(async (lat: number, lng: number) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        latitude: lat,
        longitude: lng,
        location: `${lat},${lng}`,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating location:", error);
    }
  }, [user]);

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        updateUserLocation(latitude, longitude);
      },
      (error) => {
        setLocationError("Unable to retrieve your location. Please enable location services.");
        setLoading(false);
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateUserLocation]);

  // Fetch nearby users within 100 meters
  const fetchNearbyUsers = useCallback(async () => {
    if (!user || !userLocation) return;

    try {
      // Get users who have liked each other (matches) - exclude them
      const { data: matchedUsers } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const matchedUserIds = new Set(
        matchedUsers?.flatMap(match => 
          [match.user1_id, match.user2_id].filter(id => id !== user.id)
        ) || []
      );

      // Calculate distance using RPC function (within 0.1 km = 100 meters)
      const { data, error } = await supabase
        .rpc('calculate_distance', {
          user_lat: userLocation.lat,
          user_long: userLocation.lng,
          max_distance: 0.1 // 100 meters in kilometers
        });

      if (error) {
        console.error("Error fetching nearby users:", error);
        toast.error("Failed to load nearby users");
        return;
      }

      // Filter out matched users and current user
      const filteredUsers = (data || [])
        .filter((u: NearbyUser) => u.id !== user.id && !matchedUserIds.has(u.id))
        .map((u: NearbyUser) => ({
          id: u.id,
          full_name: u.full_name,
          age: u.age,
          profile_image_url: u.profile_image_url,
          profile_images: u.profile_images,
          bio: u.bio,
          distance: u.distance,
          latitude: u.latitude,
          longitude: u.longitude,
          interests: u.interests,
          city: u.city,
          country: u.country,
          work: u.work,
          education: u.education,
          height: u.height,
          zodiac_sign: u.zodiac_sign,
          religion: u.religion,
          lifestyle: u.lifestyle,
          drinking: u.drinking,
          smoking: u.smoking,
          pets: u.pets,
          looking_for: u.looking_for,
        }));

      setNearbyUsers(filteredUsers);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load nearby users");
    } finally {
      setLoading(false);
    }
  }, [user, userLocation]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyUsers();
    }
  }, [userLocation, fetchNearbyUsers]);

  // Send superlike
  const handleSuperlike = async (targetUserId: string) => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from("likes")
        .select("*")
        .eq("liker_id", user.id)
        .eq("liked_id", targetUserId)
        .single();

      if (existingLike) {
        toast.info("You've already liked this user!");
        return;
      }

      // Create superlike
      const { error: likeError } = await supabase
        .from("likes")
        .insert({
          liker_id: user.id,
          liked_id: targetUserId,
          is_superlike: true,
        });

      if (likeError) throw likeError;

      // Check if they liked us back
      const { data: reciprocalLike } = await supabase
        .from("likes")
        .select("*")
        .eq("liker_id", targetUserId)
        .eq("liked_id", user.id)
        .single();

      if (reciprocalLike) {
        // Create match
        const { error: matchError } = await supabase
          .from("matches")
          .insert({
            user1_id: user.id,
            user2_id: targetUserId,
          });

        if (matchError) throw matchError;

        toast.success("🎉 It's a match! You can now chat with them!");
        // Remove from nearby users
        setNearbyUsers(prev => prev.filter(u => u.id !== targetUserId));
        setSelectedUser(null);
      } else {
        toast.success("⚡ Superlike sent!");
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Error sending superlike:", error);
      toast.error("Failed to send superlike");
    }
  };

  // Calculate position on radar (relative to center)
  const getRadarPosition = (targetLat: number, targetLng: number) => {
    if (!userLocation) return { x: 50, y: 50 };

    const maxDistance = 0.1; // 100 meters in km
    const dx = (targetLng - userLocation.lng) * 111.32 * Math.cos(userLocation.lat * Math.PI / 180);
    const dy = (targetLat - userLocation.lat) * 110.574;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    // Normalize to radar size (percentage)
    const normalizedDistance = Math.min(distance / maxDistance, 1) * 40; // 40% radius max
    
    const x = 50 + normalizedDistance * Math.cos(angle);
    const y = 50 - normalizedDistance * Math.sin(angle); // Inverted Y for screen coordinates
    
    return { x, y };
  };

  if (locationError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Navigation className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-xl font-semibold">Location Required</h2>
              <p className="text-muted-foreground">{locationError}</p>
              <Button onClick={getUserLocation}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <Navigation className="h-12 w-12 mx-auto text-primary" />
          </div>
          <p className="text-muted-foreground">Scanning for nearby users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/eagle-logo.png" alt="Shqiponja" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold text-yellow-500 font-serif">Shqiponja</span>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2 text-white">
              <Navigation className="h-8 w-8 text-yellow-500" />
              Radar
            </h1>
            <p className="text-gray-400">
              {nearbyUsers.length} {nearbyUsers.length === 1 ? 'person' : 'people'} nearby (within 100m)
            </p>
          </div>
        </div>

        {/* Radar Display */}
        <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700">
          <CardContent className="p-6">
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              {/* Radar background glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 blur-2xl" />
              
              {/* Radar circles with animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-full h-full rounded-full border-4 border-yellow-500/30 radar-circle-1" />
                <div className="absolute w-3/4 h-3/4 rounded-full border-2 border-yellow-500/25 radar-circle-2" />
                <div className="absolute w-2/4 h-2/4 rounded-full border-2 border-yellow-500/20 radar-circle-3" />
                <div className="absolute w-1/4 h-1/4 rounded-full border-2 border-yellow-500/15 radar-circle-4" />
              </div>

              {/* Scanning beam effect */}
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50 radar-beam" />
                
              {/* Center point (current user) */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center shadow-lg border-4 border-gray-900">
                    <Navigation className="h-6 w-6 text-white" />
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-500 animate-ping opacity-75" />
                </div>
              </div>

              {/* Nearby users as dots */}
              {nearbyUsers.length > 0 ? (
                nearbyUsers.map((nearbyUser) => {
                  const { x, y } = getRadarPosition(nearbyUser.latitude, nearbyUser.longitude);
                  return (
                    // Dynamic positioning requires inline styles
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    <button
                      key={nearbyUser.id}
                      onClick={() => setSelectedUser(nearbyUser)}
                      className="radar-dot"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                      }}
                    >
                      <div className="relative">
                        <img
                          src={nearbyUser.profile_image_url || "/placeholder.svg"}
                          alt={nearbyUser.full_name}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-lg object-cover"
                        />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2 text-muted-foreground">
                    <Navigation className="h-12 w-12 mx-auto opacity-50" />
                    <p className="text-sm">No one nearby</p>
                    <p className="text-xs">Try moving to a different location</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Profile Modal */}
        <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedUser && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {selectedUser.full_name}, {selectedUser.age}
                    </span>
                    <Badge variant="default" className="bg-blue-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      {Math.round(selectedUser.distance * 1000)}m away
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Image Carousel */}
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {selectedUser.profile_images && selectedUser.profile_images.length > 0 ? (
                      <>
                        <img
                          src={selectedUser.profile_images[selectedImageIndex] || selectedUser.profile_image_url || "/placeholder.svg"}
                          alt={`${selectedUser.full_name} - Photo ${selectedImageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {selectedUser.profile_images.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                              onClick={() => setSelectedImageIndex((prev) => 
                                prev === 0 ? selectedUser.profile_images!.length - 1 : prev - 1
                              )}
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                              onClick={() => setSelectedImageIndex((prev) => 
                                prev === selectedUser.profile_images!.length - 1 ? 0 : prev + 1
                              )}
                            >
                              <ChevronRight className="h-6 w-6" />
                            </Button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                              {selectedUser.profile_images.map((_, idx) => (
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
                        src={selectedUser.profile_image_url || "/placeholder.svg"}
                        alt={selectedUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                        Nearby
                      </Badge>
                    </div>
                  </div>

                  {/* Location */}
                  {selectedUser.city && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="h-5 w-5 text-pink-500" />
                      <span className="font-medium">{selectedUser.city}</span>
                      {selectedUser.distance && (
                        <span className="text-muted-foreground">• {formatDistance(selectedUser.distance)} away</span>
                      )}
                    </div>
                  )}

                  {/* Profile Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedUser.work && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.work}</p>
                      </Card>
                    )}
                    {selectedUser.education && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.education}</p>
                      </Card>
                    )}
                    {selectedUser.height && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.height}</p>
                      </Card>
                    )}
                    {selectedUser.zodiac_sign && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.zodiac_sign}</p>
                      </Card>
                    )}
                    {selectedUser.religion && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.religion}</p>
                      </Card>
                    )}
                    {selectedUser.lifestyle && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.lifestyle}</p>
                      </Card>
                    )}
                    {selectedUser.drinking && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.drinking}</p>
                      </Card>
                    )}
                    {selectedUser.smoking && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.smoking}</p>
                      </Card>
                    )}
                    {selectedUser.pets && (
                      <Card className="p-4 border-pink-100 hover:border-pink-300 transition-colors">
                        <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                        <p className="font-semibold text-sm text-gray-800">{selectedUser.pets}</p>
                      </Card>
                    )}
                  </div>

                  {/* Bio */}
                  {selectedUser.bio && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">💬</span> About
                      </h3>
                      <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">{selectedUser.bio}</p>
                    </div>
                  )}

                  {/* Looking For */}
                  {selectedUser.looking_for && selectedUser.looking_for.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">💕</span> Looking For
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.looking_for.map((item, idx) => (
                          <Badge key={idx} className="text-sm py-1.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-none">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {selectedUser.interests && selectedUser.interests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">✨</span> Interests
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.interests.map((interest, idx) => (
                          <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-4 rounded-full bg-pink-50 text-pink-700 border-pink-200">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Distance Info */}
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Navigation className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{formatDistance(selectedUser.distance)} away</p>
                          <p className="text-sm text-gray-600">
                            This person is very close to you right now!
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Info Banner */}
                  <Card className="bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-950 dark:to-violet-950 border-pink-200 dark:border-pink-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm space-y-1">
                          <p className="font-semibold text-pink-700 dark:text-pink-300">
                            ⚡ Radar Exclusive
                          </p>
                          <p className="text-muted-foreground">
                            You can only send a <strong>Superlike</strong> to users on the Radar. 
                            Superlikes help you stand out! They'll also appear in Discover where you can send regular likes.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleSuperlike(selectedUser.id)}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white h-12 text-lg"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Send Superlike
                    </Button>
                    <Button
                      onClick={() => setSelectedUser(null)}
                      variant="outline"
                      className="h-12"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="text-sm space-y-2">
              <p className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                Green dot = Online and nearby
              </p>
              <p>
                📍 Radar shows users within 100 meters of your current location
              </p>
              <p>
                ⚡ Send superlikes to stand out and get noticed!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-pink-400 hover:bg-gray-800"
              onClick={() => navigate("/discover")}
            >
              <Heart className="h-6 w-6 text-pink-500" />
              <span className="text-xs">Discover</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-blue-400 hover:text-blue-400 hover:bg-gray-800"
              onClick={() => navigate("/radar")}
            >
              <Navigation className="h-6 w-6 text-blue-400" />
              <span className="text-xs">Radar</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-purple-400 hover:bg-gray-800"
              onClick={() => navigate("/matches")}
            >
              <Users className="h-6 w-6 text-purple-400" />
              <span className="text-xs">Matches</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="flex flex-col items-center gap-1 text-white hover:text-green-400 hover:bg-gray-800"
              onClick={() => navigate("/edit-profile")}
            >
              <Settings className="h-6 w-6 text-green-400" />
              <span className="text-xs">Profile</span>
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

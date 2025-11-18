import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  MapPin, 
  Crown,
  Heart,
  Zap,
  Phone,
  Eye,
  Users,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  age: number;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  profile_images?: string[];
  is_premium: boolean;
}

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate, fetchProfile]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    setUploading(true);

    try {
      // First, fetch current profile_images array
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('profile_images')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const existingImages = profileData?.profile_images || [];

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add new image to the beginning of the array (as main photo)
      const updatedImages = [urlData.publicUrl, ...existingImages];

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_image_url: urlData.publicUrl,
          // Keep existing images and add new one as first
          profile_images: updatedImages
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success("Profile photo updated!");
      // Refetch to get the updated profile
      await fetchProfile();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-6 w-6 text-yellow-500" />
          </button>
          <h1 className="text-xl font-serif font-bold text-white">My Profile</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-gray-700 shadow-xl">
              <AvatarImage src={profile.profile_image_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-500 text-white text-4xl font-bold">
                {profile.full_name[0]}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload Button */}
            <label
              htmlFor="profile-upload"
              className="absolute bottom-0 right-0 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-full p-2 cursor-pointer hover:from-yellow-700 hover:to-yellow-600 shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
                aria-label="Upload profile picture"
              />
            </label>
          </div>

          {/* Name and Age */}
          <h2 className="text-2xl font-bold text-white mt-4">
            {profile.full_name}, {profile.age}
          </h2>

          {/* Location */}
          {(profile.city || profile.country) && (
            <div className="flex items-center gap-1 text-gray-400 mt-1">
              <MapPin className="h-4 w-4" />
              <span>
                {profile.city}
                {profile.city && profile.country && ", "}
                {profile.country}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => navigate("/edit-profile")}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8"
            >
              Edit Profile
            </Button>
            <Button
              onClick={() => navigate("/settings")}
              variant="outline"
              className="px-8"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Premium Features Card */}
        {!profile.is_premium && (
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="h-6 w-6 text-yellow-600 animate-pulse" />
                <h3 className="text-xl font-bold text-gray-900">
                  Get More with Shqiponja Premium
                </h3>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-full p-2">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">See Who Liked You</h4>
                    <p className="text-sm text-gray-600">No more guessing - know exactly who's interested</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full p-2">
                    <Zap className="h-5 w-5 text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">5 Free Boosts Monthly</h4>
                    <p className="text-sm text-gray-600">Get 10x more profile views with booster</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-2">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Unlimited Video & Voice Calls</h4>
                    <p className="text-sm text-gray-600">Connect deeper with unlimited calling</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-full p-2">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Advanced Filters</h4>
                    <p className="text-sm text-gray-600">Filter by height, education, lifestyle & more</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-full p-2">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Unlimited Swipes</h4>
                    <p className="text-sm text-gray-600">Never run out of potential matches</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/premium")}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white text-lg py-6 shadow-xl font-bold"
                size="lg"
              >
                <Crown className="h-6 w-6 mr-2" fill="currentColor" />
                Go Premium!
              </Button>
            </div>
          </Card>
        )}

        {/* Premium Badge for Premium Users */}
        {profile.is_premium && (
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400">
            <div className="p-6 text-center">
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none text-lg px-6 py-2">
                <Crown className="h-5 w-5 mr-2" fill="currentColor" />
                Premium Member
              </Badge>
              <p className="text-sm text-gray-600 mt-3">
                You're enjoying all premium features! ✨
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MyProfile;

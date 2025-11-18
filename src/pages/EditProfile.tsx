import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Upload, X, MoveLeft, MoveRight, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import BottomNav from "@/components/BottomNav";

// What are you looking for?
const LOOKING_FOR = [
  "💕 Dating",
  "👫 Looking for Friends",
  "🎉 Fun & Casual",
  "💍 Long-term Relationship",
];

// Interests with emojis (100+ activities like Tinder)
const INTERESTS = [
  // Sports & Fitness
  "🏃 Running", "🚴 Cycling", "🏊 Swimming", "⚽ Football", "🏀 Basketball",
  "🎾 Tennis", "🏐 Volleyball", "⛷️ Skiing", "🏂 Snowboarding", "🧗 Climbing",
  "🏋️ Gym", "🧘 Yoga", "💃 Dancing", "🥊 Boxing", "🥋 Martial Arts",
  "🏄 Surfing", "⛸️ Ice Skating", "🤸 Gymnastics", "🏒 Hockey", "⚾ Baseball",
  // Arts & Entertainment
  "🎵 Music", "🎸 Guitar", "🎹 Piano", "🎤 Singing", "🎨 Art", "📸 Photography", "🎬 Movies",
  "📚 Reading", "✍️ Writing", "🎮 Gaming", "🎯 Darts", "🎱 Billiards",
  "♟️ Chess", "🃏 Card Games", "🎲 Board Games", "🧩 Puzzles", "🎭 Theater",
  "🎺 Jazz", "🎧 EDM", "🎸 Rock Music", "🎤 Karaoke", "🎬 Netflix", "📺 TV Shows",
  "🎬 Film Buff", "🍿 Binge Watching", "🎮 Video Games", "👾 Retro Gaming",
  // Food & Drink
  "🍳 Cooking", "🍰 Baking", "☕ Coffee", "🍷 Wine", "🍺 Beer", "🍵 Tea",
  "🍕 Pizza", "🍔 Burgers", "🍣 Sushi", "🍜 Ramen", "🍝 Pasta", "🌮 Tacos",
  "🥗 Healthy Eating", "🍧 Desserts", "🥘 Home Cooking", "🍱 Meal Prep",
  "🍹 Cocktails", "🥂 Brunch", "🍩 Donuts", "🧀 Cheese", "🍫 Chocolate",
  "🌭 Street Food", "🥙 Kebabs", "🥐 Pastries", "🍛 Curry", "🥟 Dumplings",
  // Travel & Adventure
  "✈️ Travel", "🏕️ Camping", "🥾 Hiking", "🚗 Road Trips", "🏖️ Beach",
  "🏔️ Mountains", "🌆 City Life", "🌲 Nature", "🗺️ Backpacking", "🏝️ Island Life",
  "🎒 Adventure", "🌍 Exploring", "📷 Travel Photos",
  // Animals & Nature
  "🐕 Dogs", "🐈 Cats", "🐴 Horses", "🦜 Birds", "🌱 Gardening",
  "🐠 Aquariums", "🦁 Wildlife", "🌻 Plants", "🌺 Flowers",
  // Learning & Career
  "🔬 Science", "💻 Technology", "📱 Social Media", "🎓 Learning", "💼 Business", "📈 Investing",
  "📖 Podcasts", "🎙️ Public Speaking", "🚀 Startups", "💡 Innovation",
  // Personality & Vibes
  "😄 Outgoing", "🤗 Friendly", "😌 Chill", "🎊 Spontaneous", "🧠 Deep Thinker",
  "😂 Sense of Humor", "🤓 Nerdy", "🌟 Ambitious", "💭 Philosophical", "🎭 Creative",
  // Date Ideas
  "🍿 Movie Night", "🎳 Bowling", "🎢 Amusement Parks", "🎨 Art Museums", 
  "🌃 Night Out", "🌅 Sunset Walks", "🍽️ Dinner Dates", "☕ Coffee Dates",
  "🎪 Live Events", "🎵 Concerts", "🎤 Stand-up Comedy", "🏛️ Museums",
  // Lifestyle
  "🛍️ Shopping", "💄 Beauty", "👗 Fashion", "💪 Fitness", "🧘‍♀️ Meditation", "🎪 Festivals",
  "🌱 Sustainability", "♻️ Eco-Friendly", "🧖 Self-Care", "🏠 Homebody",
  "🦉 Night Owl", "🌅 Early Bird", "🔨 DIY Projects"
];

// Major world languages
const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi",
  "Turkish", "Polish", "Dutch", "Swedish", "Norwegian", "Danish",
  "Finnish", "Greek", "Czech", "Hungarian", "Romanian", "Bulgarian",
  "Serbian", "Croatian", "Albanian", "Macedonian", "Ukrainian", "Vietnamese",
  "Thai", "Indonesian", "Malay", "Tagalog", "Hebrew", "Persian",
  "Urdu", "Bengali", "Tamil", "Telugu", "Swahili", "Zulu"
];

interface Profile {
  full_name?: string;
  age?: number;
  city?: string;
  country?: string;
  bio?: string;
  looking_for?: string[];
  interests?: string[];
  zodiac_sign?: string;
  religion?: string;
  profile_image_url?: string;
  profile_images?: string[];
  lifestyle?: string;
  education?: string;
  work?: string;
  height?: string;
  height_cm?: string | number;
  body_type?: string;
  smoking?: string;
  drinking?: string;
  kids?: string;
  pets?: string;
  languages?: string[];
  hometown?: string;
  home_country?: string;
  has_kids?: string;
  wants_kids?: string;
}

const profileUpdateSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  age: z.number()
    .int()
    .min(18, { message: "You must be at least 18 years old" })
    .max(100, { message: "Age must be less than 100" }),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  bio: z.string()
    .max(500, { message: "Bio must be less than 500 characters" })
    .optional()
    .nullable(),
  looking_for: z.array(z.string()).optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  languages: z.array(z.string()).optional().nullable(),
  hometown: z.string().trim().optional().nullable(),
  home_country: z.string().trim().optional().nullable(),
  zodiac_sign: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  lifestyle: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  work: z.string().optional().nullable(),
  height: z.string().optional().nullable(),
  height_cm: z.number().int().positive().optional().nullable(),
  body_type: z.string().optional().nullable(),
  smoking: z.string().optional().nullable(),
  drinking: z.string().optional().nullable(),
  kids: z.string().optional().nullable(),
  has_kids: z.string().optional().nullable(),
  wants_kids: z.string().optional().nullable(),
  pets: z.string().optional().nullable(),
});

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    city: "",
    country: "",
    location: "",
    bio: "",
    looking_for: [] as string[],
    interests: [] as string[],
    zodiac_sign: "",
    religion: "",
    min_age_preference: "18",
    max_age_preference: "100",
    education: "",
    work: "",
    languages: [] as string[],
    hometown: "",
    home_country: "",
    height_cm: "",
    smoking: "",
    pets: "",
    has_kids: "",
    wants_kids: "",
    lifestyle: "",
    height: "",
    body_type: "",
    drinking: "",
    kids: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Profile doesn't exist, show message and redirect to setup
          toast.error("No profile found. Please complete your profile setup first.");
          navigate("/profile-setup");
          return;
        }
        throw error;
      }

      if (data) {
        // Update all form fields with the profile data
        setProfile(data);
        setFormData({
          full_name: data.full_name || "",
          age: data.age ? String(data.age) : "18",
          city: data.city || "",
          country: data.country || "",
          location: "",
          bio: data.bio || "",
          looking_for: Array.isArray(data.looking_for) ? data.looking_for : [],
          interests: Array.isArray(data.interests) ? data.interests : [],
          languages: Array.isArray(data.languages) ? data.languages : [],
          hometown: data.hometown || "",
          home_country: data.home_country || "",
          zodiac_sign: data.zodiac_sign || "",
          religion: data.religion || "",
          min_age_preference: "18",
          max_age_preference: "100",
          lifestyle: data.lifestyle || "",
          education: data.education || "",
          work: data.work || "",
          height: data.height || "",
          body_type: data.body_type || "",
          smoking: data.smoking || "",
          drinking: data.drinking || "",
          kids: data.kids || "",
          pets: data.pets || "",
          has_kids: data.has_kids || "",
          wants_kids: data.wants_kids || "",
          height_cm: data.height_cm?.toString() || "",
        });
        setProfileImage(data.profile_image_url);
        setProfileImages(data.profile_images || []);
        // Calculate profile completion
        calculateProfileCompletion(data);
      } else {
        // No profile data, redirect to setup
        toast.error("Profile not found. Redirecting to setup...");
        navigate("/profile-setup");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      const errorMessage = (error as Error).message;
      
      // More specific error messages
      if (errorMessage.includes("JWT")) {
        toast.error("Session expired. Please log in again.");
        navigate("/auth");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please check your account status.");
      } else {
        toast.error(`Failed to load profile: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate, fetchProfile]);

  // Auto-update location on page load/login
  useEffect(() => {
    if (!user || !navigator.geolocation) return;

    const updateLocationSilently = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Use Nominatim (OpenStreetMap) reverse geocoding API
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

            // Extract city and country
            const city = address.city || address.town || address.village || address.municipality || "";
            const country = address.country || "";

            if (city && country) {
              // Save coordinates to database silently in the background
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
            // Fail silently - don't show error to user
          }
        },
        (error) => {
          console.log("Geolocation not available or denied:", error.message);
          // Fail silently - don't interrupt user experience
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    };

    // Update location after profile is loaded
    const timer = setTimeout(updateLocationSilently, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const calculateProfileCompletion = (profile: Profile) => {
    const fields = [
      profile.full_name,
      profile.age, // Age is always set (minimum 18)
      profile.city,
      profile.country,
      profile.bio,
      profile.interests && profile.interests.length > 0, // Check if interests array has items
      profile.zodiac_sign,
      profile.religion,
      profile.profile_image_url,
      profile.education,
      profile.work,
      profile.languages && profile.languages.length > 0, // Check if languages array has items
      profile.hometown,
      profile.home_country,
      profile.height_cm,
      profile.smoking,
      profile.pets,
      profile.has_kids,
      profile.wants_kids,
    ];
    
    // Count filled fields (null, undefined, empty string, or false = not filled)
    const filledFields = fields.filter(field => {
      if (field === null || field === undefined || field === "") return false;
      if (field === false) return false; // false means no data for arrays
      return true;
    }).length;
    
    const percentage = Math.round((filledFields / fields.length) * 100);
    console.log('📢 Profile completion:', percentage, '% (', filledFields, '/', fields.length, 'fields filled)');
    setProfileCompletion(percentage);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Check if adding these files would exceed 10 images
    if (profileImages.length + files.length > 10) {
      toast.error(`You can only upload up to 10 photos. You currently have ${profileImages.length}.`);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      // Upload all selected files
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Update profile with new image URLs
      const newProfileImages = [...profileImages, ...uploadedUrls];
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_images: newProfileImages,
          profile_image_url: newProfileImages[0] // First image is the main profile photo
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfileImages(newProfileImages);
      setProfileImage(newProfileImages[0]);
      setProfile(prev => prev ? { 
        ...prev, 
        profile_images: newProfileImages,
        profile_image_url: newProfileImages[0] 
      } : null);
      
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully!`);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageUrl: string, index: number) => {
    if (!user) return;

    try {
      setUploading(true);

      // Extract the file path from the URL
      const urlParts = imageUrl.split('/profile-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from storage
        await supabase.storage
          .from('profile-photos')
          .remove([filePath]);
      }

      // Update the profile_images array
      const newProfileImages = profileImages.filter((_, i) => i !== index);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_images: newProfileImages,
          profile_image_url: newProfileImages[0] || null
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfileImages(newProfileImages);
      setProfileImage(newProfileImages[0] || null);
      setProfile(prev => prev ? { 
        ...prev, 
        profile_images: newProfileImages,
        profile_image_url: newProfileImages[0] || null
      } : null);
      
      toast.success("Photo deleted successfully!");
      
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setUploading(false);
    }
  };

  const handleReorderImages = async (fromIndex: number, toIndex: number) => {
    if (!user) return;

    const newImages = [...profileImages];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          profile_images: newImages,
          profile_image_url: newImages[0]
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfileImages(newImages);
      setProfileImage(newImages[0]);
      toast.success("Photos reordered!");
    } catch (error) {
      console.error("Error reordering photos:", error);
      toast.error("Failed to reorder photos");
    }
  };

  const handleAutoDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    toast.info("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Use Nominatim (OpenStreetMap) reverse geocoding API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'ShqiponjaApp/1.0'
              }
            }
          );

          if (!response.ok) throw new Error("Failed to fetch location data");

          const data = await response.json();
          const address = data.address;

          // Extract city and country
          const city = address.city || address.town || address.village || address.municipality || "";
          const country = address.country || "";

          if (city && country) {
            // Update form data
            setFormData({ 
              ...formData, 
              city: city,
              country: country,
              location: `${city}, ${country}`
            });

            // Also save coordinates to database immediately for location-based features
            if (user) {
              try {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({
                    city: city,
                    country: country,
                    location: `${city}, ${country}`,
                    latitude: latitude,
                    longitude: longitude
                  })
                  .eq('id', user.id);

                if (updateError) {
                  console.error("Error saving location to database:", updateError);
                }
              } catch (dbError) {
                console.error("Database update error:", dbError);
              }
            }

            toast.success(`Location detected: ${city}, ${country}`);
          } else {
            toast.error("Could not determine city from your location");
          }
        } catch (error) {
          console.error("Error fetching location:", error);
          toast.error("Failed to detect city. Please enter manually.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("Failed to get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Use formData state directly instead of FormData API
      // Check required fields first
      if (!formData.full_name || formData.full_name.trim().length < 2) {
        toast.error("Please enter your full name (at least 2 characters)");
        setLoading(false);
        return;
      }
      
      if (!formData.age || isNaN(parseInt(formData.age))) {
        toast.error("Please enter a valid age");
        setLoading(false);
        return;
      }
      
      const profileData = {
        full_name: formData.full_name?.trim() || null,
        age: parseInt(formData.age),
        city: formData.city?.trim() || null,
        country: formData.country?.trim() || null,
        bio: formData.bio?.trim() || null,
        looking_for: formData.looking_for || [],
        interests: formData.interests || [],
        languages: formData.languages || [],
        hometown: formData.hometown?.trim() || null,
        home_country: formData.home_country?.trim() || null,
        zodiac_sign: formData.zodiac_sign || null,
        religion: formData.religion || null,
        lifestyle: formData.lifestyle || null,
        education: formData.education?.trim() || null,
        work: formData.work?.trim() || null,
        height: formData.height?.trim() || null,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        body_type: formData.body_type || null,
        smoking: formData.smoking || null,
        drinking: formData.drinking || null,
        has_kids: formData.has_kids || null,
        wants_kids: formData.wants_kids || null,
        pets: formData.pets || null,
      };

      // Validate required fields
      const validation = profileUpdateSchema.safeParse(profileData);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map(err => err.message);
        toast.error(errorMessages.join(", "));
        console.error("Validation errors:", validation.error.errors);
        return;
      }

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      // Fetch updated profile to recalculate completion
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (updatedProfile) {
        calculateProfileCompletion(updatedProfile);
      }

      toast.success("Profile updated successfully!");
      navigate("/discover");

    } catch (error) {
      toast.error((error as Error).message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/discover")}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Discover
        </Button>

        <Card className="p-8 shadow-elegant">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your profile...</p>
            </div>
          ) : (
            <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-3xl font-bold">Edit Profile</h1>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <div className="text-sm text-muted-foreground">
                Profile: <span className="font-bold text-primary">{profileCompletion}%</span>
              </div>
              {isPremium && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
                  â­ Premium
                </Badge>
              )}
            </div>
          </div>

          {/* Profile Photos Gallery */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Profile Photos ({profileImages.length}/10)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload up to 10 photos. The first photo will be your main profile picture.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {profileImages.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={image}
                    alt={`Profile ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  
                  {/* Image overlay with controls */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {index > 0 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => handleReorderImages(index, index - 1)}
                        disabled={uploading}
                      >
                        <MoveLeft className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDeleteImage(image, index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    {index < profileImages.length - 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => handleReorderImages(index, index + 1)}
                        disabled={uploading}
                      >
                        <MoveRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Main photo badge */}
                  {index === 0 && (
                    <Badge className="absolute top-2 left-2 bg-gradient-primary">
                      Main
                    </Badge>
                  )}
                </div>
              ))}
              
              {/* Add photo button */}
              {profileImages.length < 10 && (
                <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    id="photo-upload"
                  />
                  <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground text-center px-2">
                    {uploading ? "Uploading..." : "Add Photos"}
                  </span>
                </label>
              )}
            </div>
            
            {profileImages.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto flex items-center justify-center mb-4">
                  <span className="text-3xl font-serif text-primary-foreground">
                    {formData.full_name[0] || "?"}
                  </span>
                </div>
                <p className="text-muted-foreground mb-3">No photos uploaded yet</p>
                <label className="inline-block cursor-pointer">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    id="photo-upload-empty"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => (document.getElementById('photo-upload-empty') as HTMLInputElement)?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Photos"}
                  </Button>
                </label>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">More Details</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="city">City</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoDetectLocation}
                        disabled={loading}
                        className="h-7 text-xs gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Auto-detect
                      </Button>
                    </div>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g., Pristina, Tirana"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      placeholder="e.g., Kosovo, Albania"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="education">Education</Label>
                    <Input
                      id="education"
                      name="education"
                      placeholder="e.g., Bachelor's in Computer Science"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work">Work</Label>
                    <Input
                      id="work"
                      name="work"
                      placeholder="e.g., Software Engineer"
                      value={formData.work}
                      onChange={(e) => setFormData({ ...formData, work: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hometown">Hometown</Label>
                    <Input
                      id="hometown"
                      name="hometown"
                      placeholder="e.g., Pristina"
                      value={formData.hometown}
                      onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home_country">Home Country</Label>
                    <Input
                      id="home_country"
                      name="home_country"
                      placeholder="e.g., Kosovo"
                      value={formData.home_country}
                      onChange={(e) => setFormData({ ...formData, home_country: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="looking_for">Looking For</Label>
                  <div className="space-y-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.looking_for.includes(value)) {
                          setFormData({ ...formData, looking_for: [...formData.looking_for, value] });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="What are you looking for?" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOOKING_FOR.map((option) => (
                          <SelectItem 
                            key={option} 
                            value={option}
                            disabled={formData.looking_for.includes(option)}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.looking_for.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.looking_for.map((item) => (
                          <Badge key={item} variant="default" className="gap-1">
                            {item}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                looking_for: formData.looking_for.filter(i => i !== item) 
                              })}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Interests (choose up to 5)</Label>
                  <div className="space-y-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (formData.interests.length < 5 && !formData.interests.includes(value)) {
                          setFormData({ ...formData, interests: [...formData.interests, value] });
                        } else if (formData.interests.length >= 5) {
                          toast.error("You can only select up to 5 interests");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add interests..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {INTERESTS.map((interest) => (
                          <SelectItem 
                            key={interest} 
                            value={interest}
                            disabled={formData.interests.includes(interest)}
                          >
                            {interest}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="gap-1">
                            {interest}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                interests: formData.interests.filter(i => i !== interest) 
                              })}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formData.interests.length}/5 selected
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languages">Languages</Label>
                  <div className="space-y-3">
                    <Select
                      value=""
                      onValueChange={(value) => {
                        if (!formData.languages.includes(value)) {
                          setFormData({ ...formData, languages: [...formData.languages, value] });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add languages..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {LANGUAGES.map((language) => (
                          <SelectItem 
                            key={language} 
                            value={language}
                            disabled={formData.languages.includes(language)}
                          >
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.languages.map((language) => (
                          <Badge key={language} variant="secondary" className="gap-1">
                            {language}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => setFormData({ 
                                ...formData, 
                                languages: formData.languages.filter(l => l !== language) 
                              })}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="height_cm">Height (cm)</Label>
                    <Input
                      id="height_cm"
                      type="number"
                      placeholder="e.g., 175"
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smoking">Smoking</Label>
                    <Select
                      value={formData.smoking}
                      onValueChange={(value) => setFormData({ ...formData, smoking: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select smoking status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non-smoker">Non-smoker</SelectItem>
                        <SelectItem value="occasional">Occasional</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pets">Pets/Animals</Label>
                    <Select
                      value={formData.pets}
                      onValueChange={(value) => setFormData({ ...formData, pets: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Do you have pets?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-pets">No pets</SelectItem>
                        <SelectItem value="have-dog">Have dog(s)</SelectItem>
                        <SelectItem value="have-cat">Have cat(s)</SelectItem>
                        <SelectItem value="have-other">Have other pets</SelectItem>
                        <SelectItem value="love-pets">Love pets but don't have</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zodiac_sign">Zodiac Sign</Label>
                    <Select
                      value={formData.zodiac_sign}
                      onValueChange={(value) => setFormData({ ...formData, zodiac_sign: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select zodiac sign" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"].map((sign) => (
                          <SelectItem key={sign} value={sign.toLowerCase()}>{sign}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <Select
                      value={formData.religion}
                      onValueChange={(value) => setFormData({ ...formData, religion: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Muslim", "Christian", "Catholic", "Orthodox", "Jewish", "Hindu", "Buddhist", "Atheist", "Agnostic", "Spiritual", "Other", "Prefer not to say"].map((religion) => (
                          <SelectItem key={religion} value={religion.toLowerCase()}>{religion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="has_kids">I have kids</Label>
                    <Select
                      value={formData.has_kids}
                      onValueChange={(value) => setFormData({ ...formData, has_kids: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Do you have kids?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes-living-with-me">Yes, living with me</SelectItem>
                        <SelectItem value="yes-not-living-with-me">Yes, not living with me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wants_kids">I want kids</Label>
                  <Select
                    value={formData.wants_kids}
                    onValueChange={(value) => setFormData({ ...formData, wants_kids: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Do you want kids?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="maybe">Maybe</SelectItem>
                      <SelectItem value="open-to-discussion">Open to discussion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              type="submit"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? "Updating..." : "Save Changes"}
            </Button>
          </form>
          </>
          )}
        </Card>
      </div>

      {/* Preview Profile Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profile Preview</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This is how your profile appears to others
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Profile Card Preview - Main Image */}
            <Card className="overflow-hidden">
              <div className="relative h-96">
                {profileImages.length > 0 ? (
                  <img
                    src={profileImages[0]}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-6xl font-bold">
                      {formData.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                
                {/* Overlay with basic info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 text-white">
                  <h3 className="text-2xl font-bold mb-1">
                    {formData.full_name || "Your Name"}, {formData.age || "Age"}
                  </h3>
                  <p className="text-sm text-white/90">
                                        📍 {formData.city || "City"}, {formData.country || "Country"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Detailed Profile Information */}
            <Card className="p-6 space-y-4">
              {/* Bio */}
              {formData.bio && (
                <div>
                  <h4 className="font-semibold mb-2">About Me</h4>
                  <p className="text-sm text-muted-foreground">{formData.bio}</p>
                </div>
              )}

              {/* Looking For */}
              {formData.looking_for.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">💕 Looking For</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.looking_for.map((item, idx) => (
                      <Badge key={idx} variant="default">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {formData.interests.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.interests.map((interest, idx) => (
                      <Badge key={idx} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {formData.languages.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((language, idx) => (
                      <Badge key={idx} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Work & Education */}
              {(formData.work || formData.education) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {formData.work && (
                    <div>
                                            <h4 className="font-semibold mb-1 text-sm">💼 Work</h4>
                      <p className="text-sm text-muted-foreground">{formData.work}</p>
                    </div>
                  )}
                  {formData.education && (
                    <div>
                                            <h4 className="font-semibold mb-1 text-sm">🎓 Education</h4>
                      <p className="text-sm text-muted-foreground">{formData.education}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hometown & Home Country */}
              {(formData.hometown || formData.home_country) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {formData.hometown && (
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">🏠 Hometown</h4>
                      <p className="text-sm text-muted-foreground">{formData.hometown}</p>
                    </div>
                  )}
                  {formData.home_country && (
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">🌍 Home Country</h4>
                      <p className="text-sm text-muted-foreground">{formData.home_country}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Lifestyle Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {formData.height_cm && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">📏 Height:</span>
                    <p className="font-medium">{formData.height_cm} cm</p>
                  </div>
                )}
                {formData.zodiac_sign && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">♈ Zodiac:</span>
                    <p className="font-medium capitalize">{formData.zodiac_sign}</p>
                  </div>
                )}
                {formData.religion && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">🙏 Religion:</span>
                    <p className="font-medium capitalize">{formData.religion}</p>
                  </div>
                )}
                {formData.smoking && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">🚬 Smoking:</span>
                    <p className="font-medium capitalize">{formData.smoking.replace('-', ' ')}</p>
                  </div>
                )}
                {formData.drinking && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">🍷 Drinking:</span>
                    <p className="font-medium capitalize">{formData.drinking.replace('-', ' ')}</p>
                  </div>
                )}
                {formData.pets && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">🐾 Pets:</span>
                    <p className="font-medium capitalize">{formData.pets.replace('-', ' ')}</p>
                  </div>
                )}
                {formData.has_kids && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">👶 Has Kids:</span>
                    <p className="font-medium capitalize">{formData.has_kids.replace('-', ' ')}</p>
                  </div>
                )}
                {formData.wants_kids && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">💕 Wants Kids:</span>
                    <p className="font-medium capitalize">{formData.wants_kids.replace('-', ' ')}</p>
                  </div>
                )}
                {formData.body_type && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">💪 Body Type:</span>
                    <p className="font-medium capitalize">{formData.body_type}</p>
                  </div>
                )}
                {formData.lifestyle && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">🌟 Lifestyle:</span>
                    <p className="font-medium capitalize">{formData.lifestyle}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default EditProfile;

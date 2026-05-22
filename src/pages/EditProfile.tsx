import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageCompress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Upload,
  X,
  MoveLeft,
  MoveRight,
  Eye,
  MapPin,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight,
  Music2,
  Trash2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { z } from "zod";
import BottomNav from "@/components/BottomNav";
import { containsProfanity } from "@/lib/profanityFilter";

// What are you looking for?
const LOOKING_FOR = [
  "?? Dating",
  "?? Looking for Friends",
  "?? Fun & Casual",
  "?? Long-term Relationship",
];

// Interests with emojis (100+ activities like Tinder)
const INTERESTS = [
  // Sports & Fitness
  "?? Running",
  "?? Cycling",
  "?? Swimming",
  "? Football",
  "?? Basketball",
  "?? Tennis",
  "?? Volleyball",
  "?? Skiing",
  "?? Snowboarding",
  "?? Climbing",
  "??? Gym",
  "?? Yoga",
  "?? Dancing",
  "?? Boxing",
  "?? Martial Arts",
  "?? Surfing",
  "?? Ice Skating",
  "?? Gymnastics",
  "?? Hockey",
  "? Baseball",
  // Arts & Entertainment
  "?? Music",
  "?? Guitar",
  "?? Piano",
  "?? Singing",
  "?? Art",
  "?? Photography",
  "?? Movies",
  "?? Reading",
  "?? Writing",
  "?? Gaming",
  "?? Darts",
  "?? Billiards",
  "?? Chess",
  "?? Card Games",
  "?? Board Games",
  "?? Puzzles",
  "?? Theater",
  "?? Jazz",
  "?? EDM",
  "?? Rock Music",
  "?? Karaoke",
  "?? Netflix",
  "?? TV Shows",
  "?? Film Buff",
  "?? Binge Watching",
  "?? Video Games",
  "?? Retro Gaming",
  // Food & Drink
  "?? Cooking",
  "?? Baking",
  "? Coffee",
  "?? Wine",
  "?? Beer",
  "?? Tea",
  "?? Pizza",
  "?? Burgers",
  "?? Sushi",
  "?? Ramen",
  "?? Pasta",
  "?? Tacos",
  "?? Healthy Eating",
  "?? Desserts",
  "?? Home Cooking",
  "?? Meal Prep",
  "?? Cocktails",
  "?? Brunch",
  "?? Donuts",
  "?? Cheese",
  "?? Chocolate",
  "?? Street Food",
  "?? Kebabs",
  "?? Pastries",
  "?? Curry",
  "?? Dumplings",
  // Travel & Adventure
  "?? Travel",
  "??? Camping",
  "?? Hiking",
  "?? Road Trips",
  "??? Beach",
  "??? Mountains",
  "?? City Life",
  "?? Nature",
  "??? Backpacking",
  "??? Island Life",
  "?? Adventure",
  "?? Exploring",
  "?? Travel Photos",
  // Animals & Nature
  "?? Dogs",
  "?? Cats",
  "?? Horses",
  "?? Birds",
  "?? Gardening",
  "?? Aquariums",
  "?? Wildlife",
  "?? Plants",
  "?? Flowers",
  // Learning & Career
  "?? Science",
  "?? Technology",
  "?? Social Media",
  "?? Learning",
  "?? Business",
  "?? Investing",
  "?? Podcasts",
  "??? Public Speaking",
  "?? Startups",
  "?? Innovation",
  // Personality & Vibes
  "?? Outgoing",
  "?? Friendly",
  "?? Chill",
  "?? Spontaneous",
  "?? Deep Thinker",
  "?? Sense of Humor",
  "?? Nerdy",
  "?? Ambitious",
  "?? Philosophical",
  "?? Creative",
  // Date Ideas
  "?? Movie Night",
  "?? Bowling",
  "?? Amusement Parks",
  "?? Art Museums",
  "?? Night Out",
  "?? Sunset Walks",
  "??? Dinner Dates",
  "? Coffee Dates",
  "?? Live Events",
  "?? Concerts",
  "?? Stand-up Comedy",
  "??? Museums",
  // Lifestyle
  "??? Shopping",
  "?? Beauty",
  "?? Fashion",
  "?? Fitness",
  "????? Meditation",
  "?? Festivals",
  "?? Sustainability",
  "?? Eco-Friendly",
  "?? Self-Care",
  "?? Homebody",
  "?? Night Owl",
  "?? Early Bird",
  "?? DIY Projects",
];

// Major world languages
const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Chinese",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Turkish",
  "Polish",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Czech",
  "Hungarian",
  "Romanian",
  "Bulgarian",
  "Serbian",
  "Croatian",
  "Albanian",
  "Macedonian",
  "Ukrainian",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Tagalog",
  "Hebrew",
  "Persian",
  "Urdu",
  "Bengali",
  "Tamil",
  "Telugu",
  "Swahili",
  "Zulu",
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
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  age: z
    .number()
    .int()
    .min(18, { message: "You must be at least 18 years old" })
    .max(100, { message: "Age must be less than 100" }),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  bio: z
    .string()
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

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

const extractSpotifyTrackId = (url: string): string | null => {
  const m = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
};

const EditProfile = () => {
  const { t } = useTranslation();
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
    gender: "",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [soundtrackUrl, setSoundtrackUrl] = useState("");
  const [soundtrackTitle, setSoundtrackTitle] = useState("");
  const [soundtrackArtist, setSoundtrackArtist] = useState("");
  const [soundtrackSource, setSoundtrackSource] = useState<"youtube" | "spotify" | null>(null);
  const [soundtrackEmbedId, setSoundtrackEmbedId] = useState<string | null>(null);

  // Profile prompts (Hinge-style Q&A)
  const PROMPT_OPTIONS = [
    "A life goal of mine",
    "My simple pleasures",
    "I'm known for",
    "My most irrational fear",
    "The way to win me over is",
    "I go crazy for",
    "Typical Sunday",
    "I bet you can't",
    "Two truths and a lie",
    "Believe it or not, I",
    "My love language is",
    "First round is on me if",
  ];
  const [prompts, setPrompts] = useState<{ prompt: string; answer: string }[]>([]);
  const [editingPromptIdx, setEditingPromptIdx] = useState<number | null>(null);
  const [newPromptQuestion, setNewPromptQuestion] = useState("");
  const [newPromptAnswer, setNewPromptAnswer] = useState("");

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
        setIsPremium(!!data.is_premium);
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
          gender: data.gender || "",
        });
        setProfileImage(data.profile_image_url);
        setProfileImages(data.profile_images || []);
        // Load soundtrack data
        setSoundtrackUrl(data.soundtrack_url || "");
        setSoundtrackTitle(data.soundtrack_title || "");
        setSoundtrackArtist(data.soundtrack_artist || "");
        setSoundtrackSource((data.soundtrack_source as "youtube" | "spotify" | null) || null);
        if (data.soundtrack_url) {
          const ytId = extractYouTubeId(data.soundtrack_url);
          const spId = extractSpotifyTrackId(data.soundtrack_url);
          setSoundtrackEmbedId(ytId || spId || null);
        }
        // Calculate profile completion
        calculateProfileCompletion(data);

        // Load prompts (table may not exist if migration not applied)
        const promptsTableMissing = (() => {
          try {
            const v = localStorage.getItem("__prompts_table_missing");
            return !!v && Date.now() - Number(v) < 24 * 60 * 60 * 1000;
          } catch {
            return false;
          }
        })();
        if (!promptsTableMissing) {
          const { data: promptsData, error: promptsErr } = await supabase
            .from("profile_prompts")
            .select("prompt, answer")
            .eq("user_id", user.id)
            .order("display_order");
          if (promptsErr) {
            try {
              localStorage.setItem("__prompts_table_missing", String(Date.now()));
            } catch {
              /* */
            }
          } else if (promptsData) {
            setPrompts(promptsData);
          }
        }
      } else {
        // No profile data, redirect to setup
        toast.error("Profile not found. Redirecting to setup...");
        navigate("/profile-setup");
      }
    } catch (error) {
      logger.error("Error fetching profile:", error);
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
  }, [user, navigate]);
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate, fetchProfile]);

  const savePrompt = async (prompt: string, answer: string) => {
    if (!user || !answer.trim()) return;
    const { error } = await supabase
      .from("profile_prompts")
      .upsert(
        { user_id: user.id, prompt, answer: answer.trim(), display_order: prompts.length },
        { onConflict: "user_id,prompt" }
      );
    if (error) {
      toast.error("Failed to save prompt");
      return;
    }
    const updated = [
      ...prompts.filter((p) => p.prompt !== prompt),
      { prompt, answer: answer.trim() },
    ];
    setPrompts(updated);
    setNewPromptQuestion("");
    setNewPromptAnswer("");
    setEditingPromptIdx(null);
    toast.success("Prompt saved!");
  };

  const deletePrompt = async (prompt: string) => {
    if (!user) return;
    await supabase.from("profile_prompts").delete().eq("user_id", user.id).eq("prompt", prompt);
    setPrompts(prompts.filter((p) => p.prompt !== prompt));
  };

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
                  "User-Agent": "ShqiponjaApp/1.0",
                },
              }
            );

            if (!response.ok) return;

            const data = await response.json();
            const address = data.address;

            // Extract city and country
            const city =
              address.city || address.town || address.village || address.municipality || "";
            const country = address.country || "";

            if (city && country) {
              // Save coordinates to database silently in the background
              await supabase
                .from("profiles")
                .update({
                  city: city,
                  country: country,
                  location: `${city}, ${country}`,
                  latitude: latitude,
                  longitude: longitude,
                })
                .eq("id", user.id);

              logger.log("Location updated automatically:", city, country);
            }
          } catch (error) {
            logger.error("Silent location update failed:", error);
            // Fail silently - don't show error to user
          }
        },
        (error) => {
          logger.log("Geolocation not available or denied:", error.message);
          // Fail silently - don't interrupt user experience
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
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
    const filledFields = fields.filter((field) => {
      if (field === null || field === undefined || field === "") return false;
      if (field === false) return false; // false means no data for arrays
      return true;
    }).length;

    const percentage = Math.round((filledFields / fields.length) * 100);
    logger.log(
      "?? Profile completion:",
      percentage,
      "% (",
      filledFields,
      "/",
      fields.length,
      "fields filled)"
    );
    setProfileCompletion(percentage);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    // Check if adding these files would exceed 10 images
    if (profileImages.length + files.length > 10) {
      toast.error(
        `You can only upload up to 10 photos. You currently have ${profileImages.length}.`
      );
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      // Upload all selected files
      for (const rawFile of Array.from(files)) {
        if (rawFile.size > 15 * 1024 * 1024) {
          toast.error(`"${rawFile.name}" is too large (max 15 MB). Please choose a smaller photo.`);
          continue;
        }
        const file = await compressImage(rawFile);
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-photos").getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Update profile with new image URLs
      const newProfileImages = [...profileImages, ...uploadedUrls];

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_images: newProfileImages,
          profile_image_url: newProfileImages[0], // First image is the main profile photo
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfileImages(newProfileImages);
      setProfileImage(newProfileImages[0]);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_images: newProfileImages,
              profile_image_url: newProfileImages[0],
            }
          : null
      );

      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully!`);
    } catch (error) {
      logger.error("Error uploading file:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (imageUrl: string, index: number) => {
    if (!user) return;

    try {
      setUploading(true);

      // Extract the file path from the URL
      const urlParts = imageUrl.split("/profile-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];

        // Delete from storage
        await supabase.storage.from("profile-photos").remove([filePath]);
      }

      // Update the profile_images array
      const newProfileImages = profileImages.filter((_, i) => i !== index);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          profile_images: newProfileImages,
          profile_image_url: newProfileImages[0] || null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfileImages(newProfileImages);
      setProfileImage(newProfileImages[0] || null);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_images: newProfileImages,
              profile_image_url: newProfileImages[0] || null,
            }
          : null
      );

      toast.success("Photo deleted successfully!");
    } catch (error) {
      logger.error("Error deleting photo:", error);
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
        .from("profiles")
        .update({
          profile_images: newImages,
          profile_image_url: newImages[0],
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfileImages(newImages);
      setProfileImage(newImages[0]);
      toast.success("Photos reordered!");
    } catch (error) {
      logger.error("Error reordering photos:", error);
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
                "User-Agent": "ShqiponjaApp/1.0",
              },
            }
          );

          if (!response.ok) throw new Error("Failed to fetch location data");

          const data = await response.json();
          const address = data.address;

          // Extract city and country
          const city =
            address.city || address.town || address.village || address.municipality || "";
          const country = address.country || "";

          if (city && country) {
            // Update form data using functional updater to avoid stale closure
            setFormData((prev) => ({
              ...prev,
              city: city,
              country: country,
              location: `${city}, ${country}`,
            }));

            // Also save coordinates to database immediately for location-based features
            if (user) {
              try {
                const { error: updateError } = await supabase
                  .from("profiles")
                  .update({
                    city: city,
                    country: country,
                    location: `${city}, ${country}`,
                    latitude: latitude,
                    longitude: longitude,
                  })
                  .eq("id", user.id);

                if (updateError) {
                  logger.error("Error saving location to database:", updateError);
                }
              } catch (dbError) {
                logger.error("Database update error:", dbError);
              }
            }

            toast.success(`Location detected: ${city}, ${country}`);
          } else {
            toast.error("Could not determine city from your location");
          }
        } catch (error) {
          logger.error("Error fetching location:", error);
          toast.error("Failed to detect city. Please enter manually.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        logger.error("Geolocation error:", error);
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
        maximumAge: 0,
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

      // Check for profanity in bio
      if (formData.bio && containsProfanity(formData.bio)) {
        toast.error("Your bio contains inappropriate language. Please revise it.");
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
        gender: formData.gender || null,
        soundtrack_url: soundtrackUrl || null,
        soundtrack_title: soundtrackTitle || null,
        soundtrack_artist: soundtrackArtist || null,
        soundtrack_source: soundtrackSource || null,
      };

      // Validate required fields
      const validation = profileUpdateSchema.safeParse(profileData);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map((err) => err.message);
        toast.error(errorMessages.join(", "));
        logger.error("Validation errors:", validation.error.errors);
        return;
      }

      // Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
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
    <div className="min-h-dvh py-8 px-4 page-bg">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/discover")}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          {t("editProfile.backToDiscover")}
        </Button>

        <Card className="p-8 shadow-elegant">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("editProfile.loading")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">{t("editProfile.heading")}</h1>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {t("editProfile.preview")}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Profile: <span className="font-bold text-primary">{profileCompletion}%</span>
                  </div>
                  {isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
                      ⭐ Premium
                    </Badge>
                  )}
                </div>
              </div>

              {/* Profile Photos Gallery */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  {t("editProfile.profilePhotos", { count: profileImages.length })}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("editProfile.uploadUpTo10")}
                </p>

                <p className="text-xs text-muted-foreground mb-3">
                  {t("editProfile.dragToReorder")}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {profileImages.map((image, index) => (
                    <div
                      key={image}
                      draggable
                      onDragStart={() => setDraggedPhotoIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverPhotoIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedPhotoIndex !== null && draggedPhotoIndex !== index) {
                          handleReorderImages(draggedPhotoIndex, index);
                        }
                        setDraggedPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedPhotoIndex(null);
                        setDragOverPhotoIndex(null);
                      }}
                      className={`relative group aspect-square cursor-grab active:cursor-grabbing transition-all duration-150 ${
                        draggedPhotoIndex === index ? "opacity-40 scale-95" : ""
                      } ${
                        dragOverPhotoIndex === index && draggedPhotoIndex !== index
                          ? "ring-2 ring-primary ring-offset-1 rounded-lg"
                          : ""
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Profile ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg pointer-events-none"
                      />

                      {/* Delete button (always visible on mobile, hover on desktop) */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7 shadow-md"
                          onClick={() => handleDeleteImage(image, index)}
                          disabled={uploading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Main photo badge */}
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2 bg-gradient-primary text-[10px]">
                          {t("editProfile.mainBadge")}
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
                        {uploading ? t("editProfile.uploading") : t("editProfile.addPhotos")}
                      </span>
                    </label>
                  )}
                </div>

                {profileImages.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto flex items-center justify-center mb-4">
                      <span className="text-3xl text-primary-foreground">
                        {formData.full_name[0] || "?"}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-3">{t("editProfile.noPhotosYet")}</p>
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
                        onClick={() =>
                          (
                            document.getElementById("photo-upload-empty") as HTMLInputElement
                          )?.click()
                        }
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? t("editProfile.uploading") : t("editProfile.uploadPhotos")}
                      </Button>
                    </label>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">{t("editProfile.basicInfo")}</TabsTrigger>
                    <TabsTrigger value="details">{t("editProfile.moreDetails")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">{t("editProfile.fullName")}</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="age">{t("editProfile.age")}</Label>
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

                    <div className="space-y-2">
                      <Label htmlFor="gender">{t("editProfile.sex")}</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="other">Diverse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="city">{t("editProfile.city")}</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoDetectLocation}
                            disabled={loading}
                            className="h-7 text-xs gap-1"
                          >
                            <MapPin className="h-3 w-3" />
                            {t("editProfile.autoDetect")}
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
                        <Label htmlFor="country">{t("editProfile.country")}</Label>
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
                        <Label htmlFor="education">{t("editProfile.education")}</Label>
                        <Input
                          id="education"
                          name="education"
                          placeholder="e.g., Bachelor's in Computer Science"
                          value={formData.education}
                          onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="work">{t("editProfile.work")}</Label>
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
                        <Label htmlFor="hometown">{t("editProfile.hometown")}</Label>
                        <Input
                          id="hometown"
                          name="hometown"
                          placeholder="e.g., Pristina"
                          value={formData.hometown}
                          onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="home_country">{t("editProfile.homeCountry")}</Label>
                        <Input
                          id="home_country"
                          name="home_country"
                          placeholder="e.g., Kosovo"
                          value={formData.home_country}
                          onChange={(e) =>
                            setFormData({ ...formData, home_country: e.target.value })
                          }
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

                    {/* Profile Prompts (Hinge-style Q&A) */}
                    <div className="space-y-3">
                      <Label>{t("editProfile.profilePrompts")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("editProfile.profilePromptsDesc")}
                      </p>
                      {prompts.map((p, i) => (
                        <div key={p.prompt} className="bg-muted rounded-lg p-3 space-y-1">
                          <p className="text-xs font-semibold text-primary">{p.prompt}</p>
                          {editingPromptIdx === i ? (
                            <div className="flex gap-2">
                              <Input
                                value={newPromptAnswer}
                                onChange={(e) => setNewPromptAnswer(e.target.value)}
                                placeholder="Your answer..."
                                maxLength={200}
                              />
                              <Button
                                size="sm"
                                onClick={() => savePrompt(p.prompt, newPromptAnswer)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingPromptIdx(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm">{p.answer}</p>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPromptIdx(i);
                                    setNewPromptAnswer(p.answer);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => deletePrompt(p.prompt)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {prompts.length < 3 && (
                        <div className="space-y-2 border border-dashed border-border rounded-lg p-3">
                          <Select value={newPromptQuestion} onValueChange={setNewPromptQuestion}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a prompt..." />
                            </SelectTrigger>
                            <SelectContent>
                              {PROMPT_OPTIONS.filter(
                                (o) => !prompts.some((p) => p.prompt === o)
                              ).map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {newPromptQuestion && (
                            <>
                              <Input
                                value={newPromptAnswer}
                                onChange={(e) => setNewPromptAnswer(e.target.value)}
                                placeholder="Your answer..."
                                maxLength={200}
                              />
                              <Button
                                size="sm"
                                onClick={() => savePrompt(newPromptQuestion, newPromptAnswer)}
                                disabled={!newPromptAnswer.trim()}
                              >
                                {t("editProfile.addPrompt")}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="looking_for">{t("editProfile.lookingFor")}</Label>
                      <div className="space-y-3">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (!formData.looking_for.includes(value)) {
                              setFormData({
                                ...formData,
                                looking_for: [...formData.looking_for, value],
                              });
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
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      looking_for: formData.looking_for.filter((i) => i !== item),
                                    })
                                  }
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interests">{t("editProfile.interestsUpTo5")}</Label>
                      <div className="space-y-3">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (
                              formData.interests.length < 5 &&
                              !formData.interests.includes(value)
                            ) {
                              setFormData({
                                ...formData,
                                interests: [...formData.interests, value],
                              });
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
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      interests: formData.interests.filter((i) => i !== interest),
                                    })
                                  }
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
                      <Label htmlFor="languages">{t("editProfile.languages")}</Label>
                      <div className="space-y-3">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            if (!formData.languages.includes(value)) {
                              setFormData({
                                ...formData,
                                languages: [...formData.languages, value],
                              });
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
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      languages: formData.languages.filter((l) => l !== language),
                                    })
                                  }
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
                        <Label htmlFor="height_cm">{t("editProfile.heightCm")}</Label>
                        <Input
                          id="height_cm"
                          type="number"
                          placeholder="e.g., 175"
                          value={formData.height_cm}
                          onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smoking">{t("editProfile.smoking")}</Label>
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
                        <Label htmlFor="pets">{t("editProfile.pets")}</Label>
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
                        <Label htmlFor="zodiac_sign">{t("editProfile.zodiacSign")}</Label>
                        <Select
                          value={formData.zodiac_sign}
                          onValueChange={(value) =>
                            setFormData({ ...formData, zodiac_sign: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select zodiac sign" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "Aries",
                              "Taurus",
                              "Gemini",
                              "Cancer",
                              "Leo",
                              "Virgo",
                              "Libra",
                              "Scorpio",
                              "Sagittarius",
                              "Capricorn",
                              "Aquarius",
                              "Pisces",
                            ].map((sign) => (
                              <SelectItem key={sign} value={sign.toLowerCase()}>
                                {sign}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="religion">{t("editProfile.religion")}</Label>
                        <Select
                          value={formData.religion}
                          onValueChange={(value) => setFormData({ ...formData, religion: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select religion" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "Muslim",
                              "Christian",
                              "Catholic",
                              "Orthodox",
                              "Jewish",
                              "Hindu",
                              "Buddhist",
                              "Atheist",
                              "Agnostic",
                              "Spiritual",
                              "Other",
                              "Prefer not to say",
                            ].map((religion) => (
                              <SelectItem key={religion} value={religion.toLowerCase()}>
                                {religion}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="has_kids">{t("editProfile.haveKids")}</Label>
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
                            <SelectItem value="yes-not-living-with-me">
                              Yes, not living with me
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wants_kids">{t("editProfile.wantKids")}</Label>
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

                {/* Profile Soundtrack Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Music2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{t("editProfile.profileSoundtrack")}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("editProfile.soundtrackDesc")}</p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" /> {t("editProfile.pasteLink")}
                      </Label>
                      <Input
                        placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/track/..."
                        value={soundtrackUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          setSoundtrackUrl(url);
                          const ytId = extractYouTubeId(url);
                          const spId = extractSpotifyTrackId(url);
                          if (ytId) {
                            setSoundtrackSource("youtube");
                            setSoundtrackEmbedId(ytId);
                          } else if (spId) {
                            setSoundtrackSource("spotify");
                            setSoundtrackEmbedId(spId);
                          } else {
                            setSoundtrackSource(null);
                            setSoundtrackEmbedId(null);
                          }
                        }}
                      />
                      {soundtrackSource === "youtube" && (
                        <p className="text-sm text-red-500 font-medium flex items-center gap-1">
                          YouTube detected
                        </p>
                      )}
                      {soundtrackSource === "spotify" && (
                        <p className="text-sm text-green-500 font-medium flex items-center gap-1">
                          Spotify detected
                        </p>
                      )}
                      {soundtrackUrl && !soundtrackSource && soundtrackUrl.length > 10 && (
                        <p className="text-sm text-destructive">
                          Could not detect YouTube or Spotify link
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>{t("editProfile.songTitle")}</Label>
                        <Input
                          placeholder="Song title"
                          value={soundtrackTitle}
                          onChange={(e) => setSoundtrackTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("editProfile.artist")}</Label>
                        <Input
                          placeholder="Artist"
                          value={soundtrackArtist}
                          onChange={(e) => setSoundtrackArtist(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Preview */}
                    {soundtrackEmbedId && soundtrackSource && (
                      <div className="space-y-2 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Preview</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSoundtrackUrl("");
                              setSoundtrackTitle("");
                              setSoundtrackArtist("");
                              setSoundtrackSource(null);
                              setSoundtrackEmbedId(null);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Remove soundtrack"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {soundtrackSource === "youtube" && (
                          <div className="rounded-xl overflow-hidden aspect-video">
                            <iframe
                              src={`https://www.youtube.com/embed/${soundtrackEmbedId}`}
                              title="YouTube player"
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        )}
                        {soundtrackSource === "spotify" && (
                          <div className="rounded-xl overflow-hidden">
                            <iframe
                              src={`https://open.spotify.com/embed/track/${soundtrackEmbedId}?theme=0`}
                              title="Spotify player"
                              className="w-full"
                              height="152"
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                            />
                          </div>
                        )}
                        {(soundtrackTitle || soundtrackArtist) && (
                          <p className="text-sm text-muted-foreground">
                            {soundtrackTitle}
                            {soundtrackArtist ? ` — ${soundtrackArtist}` : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? t("editProfile.saving") : t("editProfile.saveChanges")}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>

      {/* Preview Profile Dialog - Matching Discover Full Profile style */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => {
          setShowPreview(open);
          if (!open) setPreviewImageIndex(0);
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {formData.full_name || "Your Name"}, {formData.age || "Age"}
            </DialogTitle>
            <div className="flex flex-wrap gap-2">
              {profile?.verified && (
                <Badge className="bg-primary text-white border-none">Verified</Badge>
              )}
              {isPremium && (
                <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
                  Premium
                </Badge>
              )}
              {profile?.video_intro_url && (
                <Badge className="bg-background/80 text-white border-none">Video Intro</Badge>
              )}
              {profile?.mood_emoji && (
                <Badge
                  className="bg-primary/80 text-white border-none backdrop-blur-sm"
                  title={profile.mood_text || undefined}
                >
                  {profile.mood_emoji} {profile.mood_text ? profile.mood_text.slice(0, 15) : ""}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Carousel */}
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
              {profileImages.length > 0 ? (
                <>
                  <img
                    src={profileImages[previewImageIndex] || profileImages[0]}
                    alt={`${formData.full_name} - Photo ${previewImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {profileImages.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary/70 hover:bg-primary/80 text-white rounded-full"
                        onClick={() =>
                          setPreviewImageIndex((prev) =>
                            prev === 0 ? profileImages.length - 1 : prev - 1
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
                          setPreviewImageIndex((prev) =>
                            prev === profileImages.length - 1 ? 0 : prev + 1
                          )
                        }
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {profileImages.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full ${
                              idx === previewImageIndex ? "bg-card" : "bg-card/50"
                            }`}
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
            {profile?.video_intro_url && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Video intro</h4>
                <div className="rounded-lg overflow-hidden border border-primary/20">
                  <video
                    src={profile.video_intro_url}
                    controls
                    className="w-full max-h-[420px] object-cover"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            {(formData.city || formData.country) && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {formData.city}
                  {formData.country ? `, ${formData.country}` : ""}
                </span>
              </div>
            )}

            {/* Profile Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {formData.work && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">💼 Work</p>
                  <p className="font-semibold text-sm text-foreground">{formData.work}</p>
                </Card>
              )}
              {formData.education && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🎓 Education</p>
                  <p className="font-semibold text-sm text-foreground">{formData.education}</p>
                </Card>
              )}
              {formData.height_cm && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">📏 Height</p>
                  <p className="font-semibold text-sm text-foreground">{formData.height_cm} cm</p>
                </Card>
              )}
              {formData.zodiac_sign && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">♈ Zodiac</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.zodiac_sign}
                  </p>
                </Card>
              )}
              {formData.religion && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🙏 Religion</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.religion}
                  </p>
                </Card>
              )}
              {formData.lifestyle && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🌟 Lifestyle</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.lifestyle}
                  </p>
                </Card>
              )}
              {formData.drinking && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🍷 Drinking</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.drinking.replace("-", " ")}
                  </p>
                </Card>
              )}
              {formData.smoking && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🚬 Smoking</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.smoking.replace("-", " ")}
                  </p>
                </Card>
              )}
              {formData.pets && (
                <Card className="p-4 border-primary/20 hover:border-border transition-colors">
                  <p className="text-xs text-muted-foreground mb-1.5">🐾 Pets</p>
                  <p className="font-semibold text-sm text-foreground capitalize">
                    {formData.pets.replace("-", " ")}
                  </p>
                </Card>
              )}
            </div>

            {/* Bio */}
            {formData.bio && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">💬</span> About
                </h3>
                <p className="text-foreground leading-relaxed bg-background p-4 rounded-lg">
                  {formData.bio}
                </p>
              </div>
            )}

            {/* Looking For */}
            {formData.looking_for.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">💕</span> Looking For
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.looking_for.map((item, idx) => (
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
            {formData.interests.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">✨</span> Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, idx) => (
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

            {/* Languages */}
            {formData.languages.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">🌍</span> Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.languages.map((language, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-sm py-1.5 px-4 rounded-full bg-primary/10 text-primary border-border"
                    >
                      {language}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Soundtrack player */}
            {profile?.soundtrack_url &&
              profile?.soundtrack_source &&
              (() => {
                const ytId =
                  profile.soundtrack_source === "youtube"
                    ? extractYouTubeId(profile.soundtrack_url!)
                    : null;
                const spId =
                  profile.soundtrack_source === "spotify"
                    ? extractSpotifyTrackId(profile.soundtrack_url!)
                    : null;
                if (!ytId && !spId) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <span className="text-2xl">🎵</span> Soundtrack
                    </h3>
                    {(profile.soundtrack_title || profile.soundtrack_artist) && (
                      <p className="text-sm text-muted-foreground">
                        {profile.soundtrack_title}
                        {profile.soundtrack_artist ? ` — ${profile.soundtrack_artist}` : ""}
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
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default EditProfile;

import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/imageCompress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// card imports removed - unused
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Upload, Camera, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { getOrCreateVariant, Variant } from "@/lib/experiments";
import { containsProfanity } from "@/lib/profanityFilter";

// Exact age (in whole years) from an ISO yyyy-mm-dd date string
const yearsSince = (isoDate: string): number => {
  const dob = new Date(isoDate + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return years;
};

const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  date_of_birth: z
    .string()
    .min(1, { message: "Please enter your date of birth" })
    .refine((d) => yearsSince(d) >= 18, { message: "You must be at least 18 years old" })
    .refine((d) => yearsSince(d) <= 120, { message: "Please enter a valid date of birth" }),
  city: z
    .string()
    .trim()
    .min(2, { message: "City is required" })
    .max(100, { message: "City name is too long" }),
  country: z
    .string()
    .trim()
    .min(2, { message: "Country is required" })
    .max(100, { message: "Country name is too long" }),
  bio: z.string().max(500, { message: "Bio must be less than 500 characters" }).optional(),
  interests: z.string().max(500, { message: "Interests must be less than 500 characters" }),
});

const ProfileSetup = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    looking_for: "",
    city: "",
    country: "",
    bio: "",
    interests: "",
    zodiac_sign: "",
    religion: "",
  });

  // Latest date that still makes the user 18 today (used as the date input's max)
  const maxBirthDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [variant, setVariant] = useState<Variant>("A");

  useEffect(() => {
    if (!user) return;
    getOrCreateVariant(user.id, "onboarding_prompt").then(setVariant);
  }, [user]);

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      toast.error(t("profileSetup.geolocationNotSupported"));
      return;
    }

    setGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setUserCoordinates({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      toast.success(t("profileSetup.locationDetected"));
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === 1) {
        toast.error(
          "Location permission denied. You can still use the app but distance won't be shown."
        );
      } else if (geoError.code === 2) {
        toast.error(t("profileSetup.locationUnavailable"));
      } else {
        toast.error(t("profileSetup.failedGetLocation"));
      }
    } finally {
      setGettingLocation(false);
    }
  };

  const uploadToStorage = async (file: File, bucket: string, userId: string) => {
    try {
      logger.log("Starting upload...", { fileName: file.name, size: file.size, bucket, userId });

      // Test authentication before upload
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();
      logger.log("🔍 Current authenticated user:", {
        hasUser: !!currentUser,
        userIdMatch: currentUser?.id === userId,
        userError,
      });

      if (!currentUser) {
        throw new Error("User not authenticated for upload");
      }

      const compressed = await compressImage(file);
      const fileExt = compressed.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      logger.log("Uploading to:", fileName, `(${(compressed.size / 1024).toFixed(0)}KB)`);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressed);

      if (uploadError) {
        logger.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      logger.log("Upload successful:", uploadData);

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      logger.log("Public URL:", publicUrl);
      return publicUrl;
    } catch (error) {
      logger.error("Storage upload error:", error);
      throw error;
    }
  };

  const handleProfilePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    logger.log("🚀 handleProfilePhotoUpload called");
    logger.log("📥 Event target:", event.target);
    logger.log("📁 All files:", event.target.files);
    const file = event.target.files?.[0];
    logger.log("📁 Selected file:", file);
    logger.log(
      "📊 File details:",
      file ? { name: file.name, size: file.size, type: file.type } : "No file"
    );

    if (!file) {
      logger.log("❌ No file selected");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      logger.log("❌ File too large:", file.size);
      toast.error(t("profileSetup.imageTooLarge"));
      return;
    }

    if (authLoading) {
      logger.log("⏳ Authentication still loading...");
      toast.error(t("profileSetup.waitForAuth"));
      return;
    }

    logger.log("📤 Starting upload process...");
    setUploading(true);

    try {
      logger.log("🔐 Current user:", user);
      logger.log("🆔 User ID:", user?.id);
      logger.log("🔄 Auth loading:", authLoading);

      // Wait for auth to load if it's still loading
      if (authLoading) {
        logger.log("⏳ Still loading, waiting...");
        toast.error(t("profileSetup.waitForAuth"));
        return;
      }

      // Check current session directly
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      logger.log("📋 Direct session check:", {
        hasSession: !!session,
        userId: session?.user?.id,
        contextUserId: user?.id,
        sessionError,
      });

      const userId = session?.user?.id || user?.id;

      if (!userId) {
        logger.log("❌ No user ID available");
        toast.error(t("profileSetup.authRequired"));
        return;
      }

      logger.log("✅ Using user ID:", userId);

      logger.log("💾 Uploading to storage...");
      logger.log("👤 Using user ID for upload:", userId);

      if (!userId) {
        toast.error(t("profileSetup.cannotUpload"));
        return;
      }

      const publicUrl = await uploadToStorage(file, "profile-photos", userId);
      logger.log("✅ Upload successful, URL:", publicUrl);

      setProfilePhoto(publicUrl);
      toast.success(t("profileSetup.photoUploaded"));
    } catch (error) {
      logger.error("❌ Upload failed:", error);
      logger.error("❌ Error details:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name,
      });

      const errorMessage = (error as Error).message || "Failed to upload photo";

      if (errorMessage.includes("bucket")) {
        toast.error(t("profileSetup.bucketNotConfigured"));
      } else if (errorMessage.includes("policy") || errorMessage.includes("permission")) {
        toast.error(t("profileSetup.storagePermissions"));
      } else if (errorMessage.includes("file")) {
        toast.error(t("profileSetup.invalidFormat"));
      } else {
        toast.error(t("profileSetup.uploadFailed", { error: errorMessage }));
      }
    } finally {
      logger.log("🏁 Upload process finished");
      setUploading(false);
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profileSetup.imageTooLarge"));
      return;
    }

    setVerifying(true);
    try {
      const publicUrl = await uploadToStorage(file, "profile-photos", user.id);
      setSelfiePhoto(publicUrl);
      setVerified(true);
      toast.success(t("profileSetup.selfieUploaded"));
    } catch (error) {
      toast.error((error as Error).message || "Failed to upload selfie");
    } finally {
      setVerifying(false);
    }
  };

  const zodiacSigns = [
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
  ];

  const religions = [
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
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("profileSetup.mustBeLoggedIn"));
      return;
    }

    if (!profilePhoto) {
      toast.error(t("profileSetup.uploadPhotoRequired"));
      return;
    }

    setLoading(true);

    try {
      // Check for profanity in bio
      if (formData.bio && containsProfanity(formData.bio)) {
        toast.error(t("profileSetup.inappropriateBio"));
        setLoading(false);
        return;
      }

      // Validate profile data
      const validationResult = profileSchema.safeParse({
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        city: formData.city,
        country: formData.country,
        bio: formData.bio,
        interests: formData.interests,
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      const interestsArray = validationResult.data.interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      // Store the exact date of birth the user entered and derive the age from it
      const dateOfBirthString = validationResult.data.date_of_birth;
      const computedAge = yearsSince(dateOfBirthString);

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: validationResult.data.full_name,
        age: computedAge,
        date_of_birth: dateOfBirthString,
        age_verified_at: new Date().toISOString(),
        age_verification_method: "profile_setup",
        gender: formData.gender,
        looking_for: formData.looking_for ? [formData.looking_for] : [],
        gender_preference: formData.looking_for || "everyone",
        location: `${validationResult.data.city}, ${validationResult.data.country}`,
        city: validationResult.data.city,
        country: validationResult.data.country,
        bio: validationResult.data.bio || null,
        interests: interestsArray,
        profile_image_url: profilePhoto,
        verification_selfie_url: selfiePhoto,
        verified: verified,
        zodiac_sign: formData.zodiac_sign || null,
        religion: formData.religion || null,
        latitude: userCoordinates?.lat || null,
        longitude: userCoordinates?.lng || null,
      });

      if (error) throw error;

      toast.success(t("profileSetup.profileCreated"));
      navigate("/discover");
    } catch (error) {
      toast.error((error as Error).message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 py-12 page-bg">
      <div className="w-full max-w-3xl rounded-3xl p-8 glass-card">
        <h1 className="text-4xl font-bold mb-2 font-serif text-gradient-fire">
          {t("profileSetup.heading")}
        </h1>
        <p className="text-muted-foreground mb-8">{t("profileSetup.subtitle")}</p>

        {variant === "A" ? (
          <div className="p-4 mb-6 rounded-2xl glass">
            <p className="text-sm text-white/50">{t("profileSetup.profileTip")}</p>
          </div>
        ) : (
          <div className="p-4 mb-6 rounded-2xl glass">
            <p className="text-sm text-white/50">{t("profileSetup.altTip")}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Uploads */}
          <div className="grid md:grid-cols-2 gap-6 p-6 bg-muted/30 rounded-xl border border-border">
            <div className="space-y-3">
              <Label className="text-lg font-semibold">{t("profileSetup.profilePhoto")}</Label>
              <div className="relative">
                {profilePhoto ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-4 border-primary/30">
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => profilePhotoRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t("profileSetup.clickToUpload")}
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={profilePhotoRef}
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  aria-label={t("profileSetup.uploadPhoto")}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={async () => {
                    logger.log("Upload button clicked!");
                    logger.log("Current user state:", user);
                    logger.log("Auth loading state:", authLoading);

                    // Test authentication
                    try {
                      const {
                        data: { session },
                        error,
                      } = await supabase.auth.getSession();
                      logger.log("Session test:", {
                        hasSession: !!session,
                        userId: session?.user?.id,
                        error: error?.message,
                      });
                    } catch (err) {
                      logger.error("Session check failed:", err);
                    }

                    profilePhotoRef.current?.click();
                  }}
                  disabled={uploading || authLoading}
                >
                  {authLoading
                    ? t("profileSetup.authLoading")
                    : uploading
                      ? t("profileSetup.uploadingButton")
                      : profilePhoto
                        ? t("profileSetup.changePhotoButton")
                        : t("profileSetup.uploadButton")}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                {t("profileSetup.verificationSelfie")}
                {verified && <CheckCircle2 className="h-5 w-5 text-accent" />}
              </Label>
              <div className="relative">
                {selfiePhoto ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden border-4 border-accent/30">
                    <img
                      src={selfiePhoto}
                      alt="Verification"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-square rounded-xl border-2 border-dashed border-accent/50 flex items-center justify-center bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => selfieRef.current?.click()}
                  >
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-accent" />
                      <p className="text-sm text-muted-foreground">
                        {t("profileSetup.verifyIdentity")}
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={selfieRef}
                  id="verification-selfie-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSelfieUpload}
                  aria-label={t("profileSetup.uploadSelfie")}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selfieRef.current?.click()}
                  disabled={verifying}
                >
                  {verifying
                    ? t("profileSetup.verifying")
                    : selfiePhoto
                      ? t("profileSetup.updateSelfie")
                      : t("profileSetup.takeSelfie")}
                </Button>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("profileSetup.fullNameLabel")}</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">{t("profileSetup.dobLabel") || "Date of Birth"}</Label>
              <Input
                id="date_of_birth"
                type="date"
                max={maxBirthDate}
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("profileSetup.dobHint") || "You must be 18 or older to use Shqiponja"}
              </p>
            </div>
          </div>

          {/* Gender & Preference */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("profileSetup.genderLabel")}</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profileSetup.genderPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("profileSetup.male")}</SelectItem>
                  <SelectItem value="female">{t("profileSetup.female")}</SelectItem>
                  <SelectItem value="other">{t("profileSetup.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("profileSetup.whoDateLabel")}</Label>
              <Select
                value={formData.looking_for}
                onValueChange={(value) => setFormData({ ...formData, looking_for: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profileSetup.searchingForPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t("profileSetup.men")}</SelectItem>
                  <SelectItem value="female">{t("profileSetup.women")}</SelectItem>
                  <SelectItem value="everyone">{t("profileSetup.everyone")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">{t("profileSetup.cityLabel")}</Label>
              <Input
                id="city"
                placeholder={t("profileSetup.cityHint")}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t("profileSetup.countryLabel")}</Label>
              <Input
                id="country"
                placeholder={t("profileSetup.countryHint")}
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Location Permission */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
            <Label className="text-base font-semibold">{t("profileSetup.locationAccess")}</Label>
            <p className="text-sm text-muted-foreground">{t("profileSetup.locationAccessDesc")}</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={requestLocation}
              disabled={gettingLocation || !!userCoordinates}
            >
              {gettingLocation
                ? t("profileSetup.gettingLocation")
                : userCoordinates
                  ? t("profileSetup.locationEnabled")
                  : t("profileSetup.enableLocation")}
            </Button>
          </div>

          {/* Zodiac & Religion */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("profileSetup.zodiacSign")}</Label>
              <Select
                value={formData.zodiac_sign}
                onValueChange={(value) => setFormData({ ...formData, zodiac_sign: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profileSetup.zodiacPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {zodiacSigns.map((sign) => (
                    <SelectItem key={sign} value={sign.toLowerCase()}>
                      {sign}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("profileSetup.religion")}</Label>
              <Select
                value={formData.religion}
                onValueChange={(value) => setFormData({ ...formData, religion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profileSetup.religionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {religions.map((religion) => (
                    <SelectItem key={religion} value={religion.toLowerCase()}>
                      {religion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">{t("profileSetup.bioLabel")}</Label>
            <Textarea
              id="bio"
              placeholder={t("profileSetup.bioPlaceholder")}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
            />
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <Label htmlFor="interests">{t("profileSetup.interestsLabel")}</Label>
            <Input
              id="interests"
              placeholder={t("profileSetup.interestsHint")}
              value={formData.interests}
              onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant text-lg py-6 rounded-xl border-2 border-accent/20"
            disabled={loading}
          >
            {loading ? t("profileSetup.loadingProfile") : t("profileSetup.submitButton")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;

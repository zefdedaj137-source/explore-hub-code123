import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { TravelMode } from "@/components/TravelMode";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Shield,
  Bell,
  Palette,
  UserX,
  User,
  Lock,
  Users,
  Star,
  Share2,
  HelpCircle,
  FileText,
  Scale,
  AlertTriangle,
  Info,
  Mail,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  ChevronDown,
  LogOut,
  Sparkles,
  Crown,
  Zap,
  BarChart3,
  PhoneCall,
  Bookmark,
  Activity,
  CalendarCheck,
  ShieldCheck,
  Calendar,
  CalendarDays,
  MapPin,
  Video,
  Camera,
  Target,
  Smile,
  Music,
  Ghost,
  Music2,
  Download,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { exportUserData, downloadBlob } from "@/lib/gdpr";

type ProfileData = {
  is_premium?: boolean;
  booster_active?: boolean;
  booster_expires_at?: string | null;
  travel_mode_active?: boolean;
  travel_city?: string | null;
  min_age_preference?: number;
  max_age_preference?: number;
  max_distance_km?: number;
  gender_preference?: string;
  incognito_mode?: boolean;
  notify_matches?: boolean;
  notify_messages?: boolean;
  notify_likes?: boolean;
  dnd_start?: string | null;
  dnd_end?: string | null;
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sq", label: "Shqip (Albanian)" },
] as const;

const LanguagePicker = () => {
  const { t, i18n } = useTranslation();
  return (
    <RadioGroup
      value={i18n.language?.startsWith("sq") ? "sq" : "en"}
      onValueChange={(v) => i18n.changeLanguage(v)}
      className="space-y-2"
    >
      {LANGUAGES.map((lang) => (
        <div
          key={lang.code}
          className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} />
          <Label htmlFor={`lang-${lang.code}`} className="cursor-pointer font-normal">
            {lang.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
};

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "white" | "dark" | "blue">("dark");
  const [notifications, setNotifications] = useState({
    newMatches: true,
    messages: true,
    likes: true,
    promotions: false,
  });
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [saveData, setSaveData] = useState(true);
  const [emailForVerification, setEmailForVerification] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showVerificationSection, setShowVerificationSection] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [boosterActive, setBoosterActive] = useState(false);
  const [boosterExpiresAt, setBoosterExpiresAt] = useState<string | null>(null);
  const [travelModeActive, setTravelModeActive] = useState(false);
  const [travelCity, setTravelCity] = useState<string | null>(null);

  // Discovery Settings
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(99);
  const [maxDistance, setMaxDistance] = useState(100);
  const [genderPreference, setGenderPreference] = useState<string>("everyone");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivateDays, setDeactivateDays] = useState(7);
  const [dndStart, setDndStart] = useState("");
  const [dndEnd, setDndEnd] = useState("");

  // Collapsible sections - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      // Verify old password by re-authenticating
      const email = user?.email;
      if (!email) {
        toast.error("Unable to verify account");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setShowPasswordDialog(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }

    // Initialize theme state from localStorage (theme is already applied by main.tsx)
    const savedTheme = localStorage.getItem("app-theme");
    if (
      savedTheme === "light" ||
      savedTheme === "white" ||
      savedTheme === "dark" ||
      savedTheme === "blue"
    ) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }

    // Fetch premium, booster status, travel mode, and discovery settings
    const fetchUserStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Handle JWT errors by refreshing session
        if (error) {
          if (error.message?.includes("JWT") || error.code === "PGRST301") {
            console.log("JWT expired, refreshing session...");
            const {
              data: { session },
              error: refreshError,
            } = await supabase.auth.refreshSession();

            if (refreshError || !session) {
              console.error("Session refresh failed:", refreshError);
              toast.error("Session expired. Please log in again.");
              navigate("/auth");
              return;
            }

            // Retry the query after refresh
            const { data: retryData, error: retryError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .single();

            if (retryError) throw retryError;

            if (retryData) {
              const typedData = retryData as ProfileData;
              setIsPremium(typedData.is_premium || false);
              const isBoosterValid =
                typedData.booster_active &&
                typedData.booster_expires_at &&
                new Date(typedData.booster_expires_at) > new Date();
              setBoosterActive(isBoosterValid);
              setBoosterExpiresAt(typedData.booster_expires_at);
              setTravelModeActive(typedData.travel_mode_active || false);
              setTravelCity(typedData.travel_city);
              setMinAge(typedData.min_age_preference || 18);
              setMaxAge(typedData.max_age_preference || 99);
              setMaxDistance(typedData.max_distance_km || 100);
              setGenderPreference(typedData.gender_preference || "everyone");
            }
            return;
          }
          throw error;
        }

        if (data) {
          const typedData = data as ProfileData;
          setIsPremium(typedData.is_premium || false);

          // Check if booster is active AND not expired
          const isBoosterValid =
            typedData.booster_active &&
            typedData.booster_expires_at &&
            new Date(typedData.booster_expires_at) > new Date();

          setBoosterActive(isBoosterValid);
          setBoosterExpiresAt(typedData.booster_expires_at);
          setTravelModeActive(typedData.travel_mode_active || false);
          setTravelCity(typedData.travel_city);

          // Set discovery settings
          setMinAge(typedData.min_age_preference || 18);
          setMaxAge(typedData.max_age_preference || 99);
          setMaxDistance(typedData.max_distance_km || 100);
          setGenderPreference(typedData.gender_preference || "everyone");
          setIncognitoMode(typedData.incognito_mode || false);
          setSaveData(typedData.save_data !== false);
          setNotifications((prev) => ({
            ...prev,
            matches: typedData.notify_matches ?? true,
            messages: typedData.notify_messages ?? true,
            likes: typedData.notify_likes ?? true,
          }));
          setDndStart(typedData.dnd_start || "");
          setDndEnd(typedData.dnd_end || "");
        }

        const adminRes = await supabase
          .from("admin_users")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        setIsAdmin(!!adminRes.data);

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        setPushSubscribed(!!subs?.length);
      } catch (error) {
        console.error("Error fetching user status:", error);
        toast.error("Failed to load settings. Please try refreshing the page.");
      }
    };

    fetchUserStatus();
  }, [user, navigate]);

  const applyTheme = (themeValue: "light" | "white" | "dark" | "blue") => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("light", "white", "dark", "blue");
    // Add the selected theme class
    root.classList.add(themeValue);
  };

  const handleSendVerificationEmail = async () => {
    if (!emailForVerification) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailForVerification,
      });

      if (error) throw error;
      toast.success("Verification code sent to your email!");
    } catch (error) {
      toast.error((error as Error).message || "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!emailForVerification || !otpCode) {
      toast.error("Please enter both email and OTP code");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: emailForVerification,
        token: otpCode,
        type: "email",
      });

      if (error) throw error;
      toast.success("Email verified successfully!");
      setShowVerificationSection(false);
    } catch (error) {
      toast.error((error as Error).message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAdmin = async () => {
    if (!user?.id) {
      toast.error("Please sign in first.");
      return;
    }
    try {
      const { error } = await supabase.from("admin_users").insert({ user_id: user.id });
      if (error) throw error;
      setIsAdmin(true);
      toast.success("Admin mode enabled.");
    } catch (error) {
      console.error("Error enabling admin:", error);
      toast.error("Failed to enable admin mode.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Call RPC to delete all user data (messages, matches, likes, reports,
      // profile) and the auth account itself.
      const { error } = await supabase.rpc("delete_user_account", { p_user_id: user.id });
      if (error) throw error;

      // Best-effort sign-out: the auth user no longer exists, so this may fail.
      // A failure here must not mask the successful deletion.
      try {
        await supabase.auth.signOut();
      } catch {
        /* session already invalid after account deletion */
      }
      toast.success("Account permanently deleted");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error((error as Error).message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.rpc("deactivate_account", {
        p_user_id: user.id,
        p_days: deactivateDays,
      });
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success(
        `Account deactivated. It will be permanently deleted in ${deactivateDays} days if you don't log back in.`
      );
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Deactivate account error:", error);
      toast.error((error as Error).message || "Failed to deactivate account");
    } finally {
      setLoading(false);
      setShowDeactivateDialog(false);
    }
  };

  const handleActivateBooster = async (duration: number = 3) => {
    if (!user) return;

    if (!isPremium) {
      toast.error("Premium subscription required to activate booster");
      return;
    }

    if (boosterActive) {
      toast.info("Booster is already active!");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = (await supabase.rpc("activate_booster", {
        user_id: user.id,
        duration_hours: duration,
      })) as {
        data: { success: boolean; error?: string; expires_at?: string } | null;
        error: unknown;
      };

      if (error) throw error;

      if (data?.success) {
        setBoosterActive(true);
        setBoosterExpiresAt(data.expires_at || null);
        toast.success(`Booster activated for ${duration} hours! You're now in the spotlight!`);
      } else {
        toast.error(data?.error || "Failed to activate booster");
      }
    } catch (error) {
      console.error("Error activating booster:", error);
      toast.error("Failed to activate booster");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (value: "light" | "white" | "dark" | "blue") => {
    setTheme(value);
    applyTheme(value);
    localStorage.setItem("app-theme", value);

    const themeNames = {
      light: "Light",
      white: "White",
      dark: "Dark",
      blue: "Blue",
    };

    toast.success(`${themeNames[value]} theme activated`);
  };

  const handleUpdateDiscoverySettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          min_age_preference: minAge,
          max_age_preference: maxAge,
          max_distance_km: maxDistance,
          gender_preference: genderPreference,
        })
        .eq("id", user.id);

      // Handle JWT errors by refreshing session
      if (error) {
        if (error.message?.includes("JWT") || error.code === "PGRST301") {
          console.log("JWT expired, refreshing session...");
          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError || !session) {
            toast.error("Session expired. Please log in again.");
            navigate("/auth");
            return;
          }

          // Retry the update after refresh
          const { error: retryError } = await supabase
            .from("profiles")
            .update({
              min_age_preference: minAge,
              max_age_preference: maxAge,
              max_distance_km: maxDistance,
              gender_preference: genderPreference,
            })
            .eq("id", user.id);

          if (retryError) throw retryError;

          toast.success("Discovery settings updated successfully!");
          return;
        }
        throw error;
      }

      toast.success("Discovery settings updated successfully!");
    } catch (error) {
      console.error("Error updating discovery settings:", error);
      toast.error("Failed to update discovery settings");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriends = () => {
    const shareText = "Join me on Shqiponja - The Albanian Dating App!";
    const shareUrl = window.location.origin;

    if (navigator.share) {
      navigator.share({
        title: "Shqiponja",
        text: shareText,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("Invite link copied to clipboard!");
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission === "granted") {
      toast.success("Push notifications enabled.");
    } else {
      toast.info("Push notifications not enabled.");
    }
  };

  const handlePushSubscribe = async () => {
    if (!user) return;
    try {
      await subscribeToPush(user.id);
      setPushSubscribed(true);
      toast.success("Push subscription saved.");
    } catch (error) {
      console.error("Push subscribe error", error);
      toast.error("Failed to enable push.");
    }
  };

  const handlePushUnsubscribe = async () => {
    if (!user) return;
    try {
      await unsubscribeFromPush(user.id);
      setPushSubscribed(false);
      toast.success("Push subscription removed.");
    } catch (error) {
      console.error("Push unsubscribe error", error);
      toast.error("Failed to disable push.");
    }
  };

  const handleDataRequest = async (requestType: "export" | "delete") => {
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("data_requests")
        .insert({ user_id: user.id, request_type: requestType });

      if (error) throw error;
      toast.success(
        requestType === "export" ? "Data export requested." : "Account deletion requested."
      );
    } catch (error) {
      console.error("Data request error:", error);
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const SettingsSection = ({
    icon: Icon,
    title,
    description,
    onClick,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  );

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="bg-card rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/discover")}
              className="hover:bg-muted rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t("settings.title")}</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Premium Booster Section - Only show when booster is active */}
          {boosterActive && boosterExpiresAt && (
            <Card className="shadow-elegant bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  Spotlight Booster
                  {isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Be featured in "Last Active" and get up to 10x more profile views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-card/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Zap className="h-5 w-5" />
                    Booster Active!
                  </div>
                  <p className="text-sm text-foreground">
                    Your profile is in the spotlight. Expires at:{" "}
                    {new Date(boosterExpiresAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    You're visible to everyone in "Last Active"
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Management Section */}
          {isPremium && (
            <Card className="shadow-elegant bg-gradient-to-br from-background via-yellow-900/20 to-background border-2 border-yellow-600/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-100">
                  <Crown className="h-5 w-5 text-primary" />
                  Premium Membership
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none ml-2 font-bold">
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage your premium subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4 space-y-3 border border-yellow-500/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-2">Premium Benefits</h4>
                      <ul className="space-y-1.5 text-sm text-foreground">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Unlimited swipes
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          See who liked you
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Advanced filters
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          Spotlight booster access
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          No ads
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator className="bg-yellow-600/30" />

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full bg-yellow-600/10 border-yellow-600/50 text-yellow-100 hover:bg-yellow-600/20 hover:text-yellow-50"
                    onClick={async () => {
                      toast.info("Opening subscription management...");
                      const isNative =
                        Capacitor.isNativePlatform() || Capacitor.getPlatform() === "ios";
                      if (isNative) {
                        // Apple requires subscriptions to be managed through iOS Settings
                        await Browser.open({ url: "https://apps.apple.com/account/subscriptions" });
                      } else {
                        window.open(
                          import.meta.env.VITE_STRIPE_PORTAL_URL || "https://billing.stripe.com",
                          "_blank"
                        );
                      }
                    }}
                  >
                    Manage Subscription
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-primary/50 border-primary/50 text-primary/80 hover:bg-primary hover:text-primary/60"
                      >
                        Cancel Membership
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Premium Membership?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="text-sm text-muted-foreground">
                            Are you sure you want to cancel your premium membership? You'll lose
                            access to:
                            <ul className="mt-2 space-y-1 text-sm">
                              <li>• Unlimited swipes</li>
                              <li>• See who liked you</li>
                              <li>• Advanced filters</li>
                              <li>• Spotlight booster</li>
                            </ul>
                            <div className="mt-2 font-semibold">
                              Your subscription will remain active until the end of the current
                              billing period.
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Premium</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            const isNative =
                              Capacitor.isNativePlatform() || Capacitor.getPlatform() === "ios";
                            if (isNative) {
                              // Apple does not allow cancelling subscriptions from inside the app
                              // Must redirect user to iOS subscription management
                              await Browser.open({
                                url: "https://apps.apple.com/account/subscriptions",
                              });
                              toast.info("To cancel, tap your subscription and select Cancel.");
                            } else {
                              try {
                                setLoading(true);
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ is_premium: false })
                                  .eq("id", user?.id);
                                if (error) throw error;
                                setIsPremium(false);
                                toast.success(
                                  "Premium membership cancelled. You'll have access until the end of your billing period."
                                );
                              } catch (error) {
                                toast.error("Failed to cancel membership. Please try again.");
                                console.error(error);
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          className="bg-primary hover:bg-primary"
                        >
                          Cancel Membership
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Travel Mode Section - Premium Feature */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("travel")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✈️ Travel Mode</span>
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    Premium
                  </Badge>
                )}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.travel ? "rotate-180" : ""}`}
                />
              </CardTitle>
              <CardDescription>
                Explore matches in different cities around the world
              </CardDescription>
            </CardHeader>
            {expandedSections.travel && (
              <CardContent>
                {user && (
                  <TravelMode
                    userId={user.id}
                    isPremium={isPremium}
                    travelModeActive={travelModeActive}
                    travelCity={travelCity}
                    onTravelModeChange={async () => {
                      // Refresh travel mode state
                      const { data } = await supabase
                        .from("profiles")
                        .select("travel_mode_active, travel_city")
                        .eq("id", user.id)
                        .single();
                      if (data) {
                        setTravelModeActive(data.travel_mode_active || false);
                        setTravelCity(data.travel_city);
                      }
                    }}
                  />
                )}
              </CardContent>
            )}
          </Card>

          {/* Account Section */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("account")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.account ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.account && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={Shield}
                  title="Verify Your Account"
                  description="Email or OTP verification"
                  onClick={() => setShowVerificationSection(!showVerificationSection)}
                />

                {showVerificationSection && (
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="verify-email">Email Address</Label>
                        <Input
                          id="verify-email"
                          type="email"
                          placeholder="your@email.com"
                          value={emailForVerification}
                          onChange={(e) => setEmailForVerification(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleSendVerificationEmail}
                        disabled={loading}
                        className="w-full"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Verification Code
                      </Button>

                      <Separator />

                      <div className="space-y-2">
                        <Label htmlFor="otp-code">Enter OTP Code</Label>
                        <Input
                          id="otp-code"
                          placeholder="6-digit code"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                        />
                      </div>
                      <Button
                        onClick={handleVerifyOTP}
                        disabled={loading}
                        variant="secondary"
                        className="w-full"
                      >
                        Verify Code
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <SettingsSection
                  icon={User}
                  title="Edit Profile"
                  description="Update your personal information"
                  onClick={() => navigate("/edit-profile")}
                />

                <SettingsSection
                  icon={Lock}
                  title="Login Information"
                  description="Manage your password and security"
                  onClick={() => setShowPasswordDialog(true)}
                />
              </CardContent>
            )}
          </Card>

          {/* Activity & History */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("activity")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity & History
                {!isPremium && <Lock className="h-4 w-4 text-muted-foreground" />}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.activity ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.activity &&
              (isPremium ? (
                <CardContent className="space-y-2">
                  <SettingsSection
                    icon={PhoneCall}
                    title="Call History"
                    description="Review your past voice & video calls"
                    onClick={() => navigate("/call-history")}
                  />
                  <SettingsSection
                    icon={Bookmark}
                    title="Saved Profiles"
                    description="View profiles you bookmarked"
                    onClick={() => navigate("/saved")}
                  />
                  <SettingsSection
                    icon={Eye}
                    title="Recently Viewed"
                    description="Profiles you viewed recently"
                    onClick={() => navigate("/recently-viewed")}
                  />
                  <SettingsSection
                    icon={Activity}
                    title="Activity Feed"
                    description="Likes, matches, and messages"
                    onClick={() => navigate("/activity")}
                  />
                  <SettingsSection
                    icon={Activity}
                    title="Profile Insights"
                    description="Views, likes, and matches"
                    onClick={() => navigate("/insights")}
                  />
                  <SettingsSection
                    icon={Sparkles}
                    title="Match Insights"
                    description="AI-powered compatibility snapshots"
                    onClick={() => navigate("/match-insights")}
                  />
                  <SettingsSection
                    icon={Target}
                    title="Match Goals"
                    description="Streaks and weekly targets"
                    onClick={() => navigate("/match-goals")}
                  />
                  <SettingsSection
                    icon={Camera}
                    title="Stories"
                    description="Share quick moments"
                    onClick={() => navigate("/stories")}
                  />
                </CardContent>
              ) : (
                <CardContent>
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Premium Feature</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Unlock Activity & History — including call logs, recently viewed profiles,
                      insights, and more — with a premium subscription.
                    </p>
                    <Button size="sm" onClick={() => navigate("/boost-bundles")}>
                      <Crown className="h-4 w-4 mr-1" />
                      Upgrade to Premium
                    </Button>
                  </div>
                </CardContent>
              ))}
          </Card>

          {/* Safety & Verification */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("safety")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Safety & Verification
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.safety ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.safety && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={ShieldCheck}
                  title="Get Verified"
                  description="Request a verified badge"
                  onClick={() => navigate("/verification")}
                />
                <SettingsSection
                  icon={ShieldCheck}
                  title="Safety Tips"
                  description="Meet safely and confidently"
                  onClick={() => navigate("/safety-tips")}
                />
                <SettingsSection
                  icon={ShieldCheck}
                  title="Safety Check-in"
                  description="Let someone know you're safe"
                  onClick={() => navigate("/safety-checkin")}
                />
                <SettingsSection
                  icon={UserX}
                  title="Blocked Users"
                  description="Manage your block list"
                  onClick={() => navigate("/blocked")}
                />
              </CardContent>
            )}
          </Card>

          {/* Discovery Settings */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("discovery")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Discovery Settings
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.discovery ? "rotate-180" : ""}`}
                />
              </CardTitle>
              <CardDescription>Customize your discovery preferences</CardDescription>
            </CardHeader>
            {expandedSections.discovery && (
              <CardContent className="space-y-6">
                {/* Looking For */}
                <div className="space-y-3">
                  <Label htmlFor="gender-preference">Interested In</Label>
                  <RadioGroup
                    value={genderPreference}
                    onValueChange={setGenderPreference}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="male" id="pref-male" />
                      <Label htmlFor="pref-male" className="flex-1 cursor-pointer font-normal">
                        Men
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="female" id="pref-female" />
                      <Label htmlFor="pref-female" className="flex-1 cursor-pointer font-normal">
                        Women
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="everyone" id="pref-everyone" />
                      <Label htmlFor="pref-everyone" className="flex-1 cursor-pointer font-normal">
                        Everyone
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Age Range */}
                <div className="space-y-3">
                  <Label>
                    Age Range: {minAge} - {maxAge}
                  </Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Age</span>
                        <span className="font-medium">{minAge}</span>
                      </div>
                      <Slider
                        value={[minAge]}
                        onValueChange={(value) => {
                          setMinAge(value[0]);
                          if (value[0] > maxAge) setMaxAge(value[0]);
                        }}
                        min={18}
                        max={99}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Age</span>
                        <span className="font-medium">{maxAge}</span>
                      </div>
                      <Slider
                        value={[maxAge]}
                        onValueChange={(value) => {
                          setMaxAge(value[0]);
                          if (value[0] < minAge) setMinAge(value[0]);
                        }}
                        min={18}
                        max={99}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Max Distance */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Maximum Distance</Label>
                    <span className="font-medium">{maxDistance} km</span>
                  </div>
                  <Slider
                    value={[maxDistance]}
                    onValueChange={(value) => setMaxDistance(value[0])}
                    min={1}
                    max={500}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Show profiles within {maxDistance} kilometers from your location
                  </p>
                </div>

                <Button
                  onClick={handleUpdateDiscoverySettings}
                  disabled={loading}
                  className="w-full"
                >
                  Save Discovery Settings
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Appearance Section */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("appearance")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance ({t("settings.theme")})
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.appearance ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.appearance && (
              <CardContent>
                <RadioGroup value={theme} onValueChange={handleThemeChange} className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex-1 cursor-pointer font-normal">
                      Dark Mode (Default)
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-card to-black border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex-1 cursor-pointer font-normal">
                      Light Mode (Brighter)
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="white" id="white" />
                    <Label htmlFor="white" className="flex-1 cursor-pointer font-normal">
                      White Mode (Brightest)
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-card border-2 border-border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="flex-1 cursor-pointer font-normal">
                      Blue Mode (Sky Blue)
                    </Label>
                    <div className="w-8 h-8 rounded-full border-2 border-border bg-[linear-gradient(135deg,hsl(210,100%,50%),hsl(196,100%,42%))]" />
                  </div>
                </RadioGroup>

                <Separator className="my-4" />
                <Label className="font-medium mb-2 block">Language / Gjuha</Label>
                <LanguagePicker />
              </CardContent>
            )}
          </Card>

          {/* Privacy Section */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("privacy")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy & Security
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.privacy ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.privacy && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {incognitoMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <div>
                      <Label className="font-normal">Incognito Mode</Label>
                      <p className="text-xs text-muted-foreground">Hide your profile</p>
                    </div>
                  </div>
                  <Switch
                    checked={incognitoMode}
                    onCheckedChange={async (checked) => {
                      setIncognitoMode(checked);
                      if (user) {
                        await supabase
                          .from("profiles")
                          .update({ incognito_mode: checked })
                          .eq("id", user.id);
                      }
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">Save Data</Label>
                    <p className="text-xs text-muted-foreground">Record profile view history</p>
                  </div>
                  <Switch
                    checked={saveData}
                    onCheckedChange={async (checked) => {
                      setSaveData(checked);
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ save_data: checked } as Record<string, unknown>)
                          .eq("id", user.id);
                    }}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Notifications Section */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("notifications")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.notifications ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.notifications && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">New Matches</Label>
                  <Switch
                    checked={notifications.newMatches}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, newMatches: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_matches: checked })
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Messages</Label>
                  <Switch
                    checked={notifications.messages}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, messages: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_messages: checked })
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Likes</Label>
                  <Switch
                    checked={notifications.likes}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, likes: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_likes: checked })
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">Promotions</Label>
                  <Switch
                    checked={notifications.promotions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, promotions: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">{t("settings.pushNotifications")}</Label>
                    <p className="text-xs text-muted-foreground">
                      Browser permission: {pushPermission}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={requestPushPermission}>
                      Permission
                    </Button>
                    {pushSubscribed ? (
                      <Button variant="outline" size="sm" onClick={handlePushUnsubscribe}>
                        Disable
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handlePushSubscribe}>
                        Subscribe
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Do Not Disturb Schedule */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Do Not Disturb
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Set quiet hours when you won't receive notifications
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Input
                        type="time"
                        value={dndStart}
                        onChange={async (e) => {
                          setDndStart(e.target.value);
                          if (user)
                            await supabase
                              .from("profiles")
                              .update({ dnd_start: e.target.value || null } as Record<
                                string,
                                unknown
                              >)
                              .eq("id", user.id);
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Input
                        type="time"
                        value={dndEnd}
                        onChange={async (e) => {
                          setDndEnd(e.target.value);
                          if (user)
                            await supabase
                              .from("profiles")
                              .update({ dnd_end: e.target.value || null } as Record<
                                string,
                                unknown
                              >)
                              .eq("id", user.id);
                        }}
                        className="h-9"
                      />
                    </div>
                    {(dndStart || dndEnd) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-4"
                        onClick={async () => {
                          setDndStart("");
                          setDndEnd("");
                          if (user)
                            await supabase
                              .from("profiles")
                              .update({ dnd_start: null, dnd_end: null } as Record<string, unknown>)
                              .eq("id", user.id);
                          toast.success("DND disabled");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {dndStart && dndEnd && (
                    <p className="text-xs text-muted-foreground">
                      Quiet hours: {dndStart} – {dndEnd}
                    </p>
                  )}
                </div>

                <Separator />

                <SettingsSection
                  icon={Bell}
                  title="Notification Center"
                  description="View likes and profile views"
                  onClick={() => navigate("/notifications")}
                />
              </CardContent>
            )}
          </Card>

          {/* Social & Community */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("social")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social & Community
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.social ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.social && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={Sparkles}
                  title="Wallet & Coins"
                  description="Buy boosts and roses"
                  onClick={() => navigate("/wallet")}
                />
                <SettingsSection
                  icon={Share2}
                  title="Invite Friends"
                  description="Share Shqiponja with friends"
                  onClick={handleInviteFriends}
                />
                <SettingsSection
                  icon={Star}
                  title="Review Us"
                  description="Rate our app"
                  onClick={() => toast.info("Thank you for your support! ❤️")}
                />
                <SettingsSection
                  icon={Users}
                  title="Social Media"
                  description="Follow us on social platforms"
                  onClick={() => toast.info("Follow us @shqiponja on social media!")}
                />
              </CardContent>
            )}
          </Card>

          {/* Help, Legal & Data */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("help")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help & Legal
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.help ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.help && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={HelpCircle}
                  title="Help Center"
                  description="Get help and support"
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={FileText}
                  title="Image Guidelines"
                  description="Image guidelines"
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={Lock}
                  title="Privacy Policy"
                  description="Privacy policy"
                  onClick={() => navigate("/privacy")}
                />
                <SettingsSection
                  icon={FileText}
                  title="Terms & Conditions"
                  description="Terms & conditions"
                  onClick={() => navigate("/terms")}
                />
                <SettingsSection
                  icon={AlertTriangle}
                  title="Safety Tips"
                  description="Stay safe while dating"
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={Info}
                  title="About Us"
                  description="Learn more about Shqiponja"
                  onClick={() => toast.info("Shqiponja — Where hearts connect. v1.0.0")}
                />

                <Separator className="my-2" />

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">Data Controls</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDataRequest("export")}
                    disabled={loading}
                  >
                    Request Data Export
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDataRequest("delete")}
                    disabled={loading}
                  >
                    Request Data Deletion
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-elegant border-destructive/50">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("danger")}
            >
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.danger ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.danger && (
              <CardContent className="space-y-4">
                {/* Data Export (GDPR) */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Export Your Data</p>
                  <p className="text-xs text-muted-foreground">
                    Download a copy of all your personal data (profile, matches, messages, likes) as
                    a JSON file.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        toast.info("Preparing your data export...");
                        const blob = await exportUserData(user.id);
                        downloadBlob(
                          blob,
                          `shqiponja-data-${new Date().toISOString().slice(0, 10)}.json`
                        );
                        toast.success("Data exported successfully!");
                      } catch {
                        toast.error("Failed to export data. Please try again.");
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download My Data
                  </Button>
                </div>

                <Separator />

                {/* Deactivate Account */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Deactivate Account</p>
                  <p className="text-xs text-muted-foreground">
                    Temporarily hide your profile. After the chosen period, your account will be
                    permanently deleted unless you log back in.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                    onClick={() => setShowDeactivateDialog(true)}
                  >
                    {t("settings.deactivate")}
                  </Button>
                </div>

                <Separator />

                {/* Permanent Delete */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Permanent Deletion</p>
                  <p className="text-xs text-muted-foreground">
                    Immediately and permanently delete your account, matches, messages, and all
                    data. This cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("settings.deleteAccount")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will <strong>permanently</strong> delete your account and remove all
                          your data from our servers — including matches, messages, likes, and your
                          profile. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={loading}
                        >
                          Delete Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sign Out & Version */}
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    // Sign out first
                    await supabase.auth.signOut();
                    // Then navigate to auth page
                    navigate("/auth", { replace: true });
                  } catch (error) {
                    console.error("Sign out error:", error);
                    // Navigate anyway even if sign out fails
                    navigate("/auth", { replace: true });
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("auth.signOut")}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">Version 1.0.0</p>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card className="shadow-elegant">
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => toggleSection("admin")}
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin
                  <ChevronDown
                    className={`h-4 w-4 ml-auto transition-transform ${expandedSections.admin ? "rotate-180" : ""}`}
                  />
                </CardTitle>
              </CardHeader>
              {expandedSections.admin && (
                <CardContent className="space-y-2">
                  <SettingsSection
                    icon={Shield}
                    title="Safety Console"
                    description="Review reports & data requests"
                    onClick={() => navigate("/admin/safety")}
                  />
                  <SettingsSection
                    icon={BarChart3}
                    title="Analytics Dashboard"
                    description="View key metrics"
                    onClick={() => navigate("/admin/analytics")}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* Admin self-escalation removed — admin access is granted via Supabase dashboard only */}
        </div>
      </div>

      {/* Deactivate Account Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <EyeOff className="h-5 w-5" />
              Deactivate Account
            </DialogTitle>
            <DialogDescription>
              Your profile will be hidden immediately. After the chosen period, your account and all
              data will be permanently deleted unless you log back in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Auto-delete after:</Label>
              <RadioGroup
                value={String(deactivateDays)}
                onValueChange={(v) => setDeactivateDays(Number(v))}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="3" id="deact-3" />
                  <Label htmlFor="deact-3" className="flex-1 cursor-pointer font-normal">
                    3 days
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="7" id="deact-7" />
                  <Label htmlFor="deact-7" className="flex-1 cursor-pointer font-normal">
                    1 week
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="14" id="deact-14" />
                  <Label htmlFor="deact-14" className="flex-1 cursor-pointer font-normal">
                    2 weeks
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="30" id="deact-30" />
                  <Label htmlFor="deact-30" className="flex-1 cursor-pointer font-normal">
                    1 month (max)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <Button
              onClick={handleDeactivateAccount}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              Deactivate for {deactivateDays} days
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={showPasswordDialog}
        onOpenChange={(open) => {
          setShowPasswordDialog(open);
          if (!open) {
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                placeholder="Enter current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-primary text-primary-foreground"
                onClick={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;

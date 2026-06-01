import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ShieldCheck,
  Camera,
  Target,
  Download,
  Moon,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import BottomNav from "@/components/BottomNav";
import { exportUserData, downloadBlob } from "@/lib/gdpr";

type ProfileData = {
  is_premium?: boolean;
  verified?: boolean;
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
  save_data?: boolean;
};

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sq", label: "Shqip (Albanian)", flag: "🇦🇱" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
] as const;

const LanguagePicker = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.split("-")[0] ?? "en";
  const isSupported = LANGUAGES.some((l) => l.code === current);
  return (
    <RadioGroup
      value={isSupported ? current : "en"}
      onValueChange={(v) => i18n.changeLanguage(v)}
      className="space-y-2"
    >
      {LANGUAGES.map((lang) => (
        <div
          key={lang.code}
          className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} />
          <Label
            htmlFor={`lang-${lang.code}`}
            className="cursor-pointer font-normal flex items-center gap-2"
          >
            <span>{lang.flag}</span>
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
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
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
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      toast.error(t("settings.fillAllFields"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("settings.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordsDoNotMatch"));
      return;
    }
    setPasswordLoading(true);
    try {
      // Verify old password by re-authenticating
      const email = user?.email;
      if (!email) {
        toast.error(t("settings.unableVerify"));
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (signInError) {
        toast.error(t("settings.wrongPassword"));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t("settings.passwordUpdated"));
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
            logger.log("JWT expired, refreshing session...");
            const {
              data: { session },
              error: refreshError,
            } = await supabase.auth.refreshSession();

            if (refreshError || !session) {
              logger.error("Session refresh failed:", refreshError);
              toast.error(t("settings.sessionExpired"));
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
              setBoosterActive(Boolean(isBoosterValid));
              setBoosterExpiresAt(typedData.booster_expires_at ?? null);
              setTravelModeActive(typedData.travel_mode_active || false);
              setTravelCity(typedData.travel_city ?? null);
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
          setIsVerified(typedData.verified || false);

          // Check if booster is active AND not expired
          const isBoosterValid =
            typedData.booster_active &&
            typedData.booster_expires_at &&
            new Date(typedData.booster_expires_at) > new Date();

          setBoosterActive(Boolean(isBoosterValid));
          setBoosterExpiresAt(typedData.booster_expires_at ?? null);
          setTravelModeActive(typedData.travel_mode_active || false);
          setTravelCity(typedData.travel_city ?? null);

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
        logger.error("Error fetching user status:", error);
        toast.error(t("settings.failedLoad"));
      }
    };

    fetchUserStatus();
  }, [user, navigate, t]);

  const applyTheme = (themeValue: "light" | "white" | "dark" | "blue") => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("light", "white", "dark", "blue");
    // Add the selected theme class
    root.classList.add(themeValue);
  };

  const handleSendVerificationEmail = async () => {
    const registeredEmail = user?.email;
    if (!registeredEmail) {
      toast.error(t("settings.noEmail"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: registeredEmail,
        options: { shouldCreateUser: false },
      });

      if (error) throw error;
      setOtpSent(true);
      toast.success(t("settings.verificationSent", { email: registeredEmail }));
    } catch (error) {
      toast.error((error as Error).message || "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const registeredEmail = user?.email;
    if (!registeredEmail || !otpCode) {
      toast.error(t("settings.enterOtpCode"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: registeredEmail,
        token: otpCode,
        type: "email",
      });

      if (error) throw error;

      // Mark profile as verified in the database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", user!.id);

      if (profileError) throw profileError;

      setIsVerified(true);
      setOtpSent(false);
      setOtpCode("");
      setShowVerificationSection(false);
      toast.success(t("settings.accountVerified"));
    } catch (error) {
      toast.error((error as Error).message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Call RPC to delete all user data (messages, matches, likes, reports, profile)
      const { error } = await supabase.rpc("delete_user_account", { p_user_id: user.id });
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success(t("settings.accountDeleted"));
      navigate("/", { replace: true });
    } catch (error) {
      logger.error("Delete account error:", error);
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
      logger.error("Deactivate account error:", error);
      toast.error((error as Error).message || "Failed to deactivate account");
    } finally {
      setLoading(false);
      setShowDeactivateDialog(false);
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
          logger.log("JWT expired, refreshing session...");
          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError || !session) {
            toast.error(t("settings.sessionExpired"));
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

          toast.success(t("settings.discoveryUpdated"));
          return;
        }
        throw error;
      }

      toast.success(t("settings.discoveryUpdated"));
    } catch (error) {
      logger.error("Error updating discovery settings:", error);
      toast.error(t("settings.failedDiscovery"));
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
      toast.success(t("settings.linkCopied"));
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast.error(t("settings.notificationsUnsupported"));
      return;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission === "granted") {
      toast.success(t("settings.pushEnabled"));
    } else {
      toast.info(t("settings.pushNotEnabled"));
    }
  };

  const handlePushSubscribe = async () => {
    if (!user) return;
    try {
      await subscribeToPush(user.id);
      setPushSubscribed(true);
      toast.success(t("settings.pushSaved"));
    } catch (error) {
      logger.error("Push subscribe error", error);
      toast.error(t("settings.failedPush"));
    }
  };

  const handlePushUnsubscribe = async () => {
    if (!user) return;
    try {
      await unsubscribeFromPush(user.id);
      setPushSubscribed(false);
      toast.success(t("settings.pushRemoved"));
    } catch (error) {
      logger.error("Push unsubscribe error", error);
      toast.error(t("settings.failedDisablePush"));
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
      logger.error("Data request error:", error);
      toast.error(t("settings.failedReport"));
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
    <div className="min-h-dvh pb-24 page-bg">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="rounded-2xl p-5 mb-4 glass-header">
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
            <Card
              className="shadow-elegant border"
              style={{
                background: "linear-gradient(135deg, rgba(232,39,75,0.12), rgba(255,107,53,0.08))",
                borderColor: "rgba(232,39,75,0.3)",
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  {t("settings.spotlightBooster")}
                  {isPremium && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none ml-2">
                      <Crown className="h-3 w-3 mr-1" />
                      {t("common.premium")}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{t("settings.boosterDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-card/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Zap className="h-5 w-5" />
                    {t("settings.boosterActive")}
                  </div>
                  <p className="text-sm text-foreground">
                    {t("settings.boosterExpires", {
                      time: new Date(boosterExpiresAt).toLocaleString(),
                    })}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    {t("settings.visibleInLastActive")}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Management Section */}
          {isPremium && (
            <Card
              className="shadow-elegant border"
              style={{
                background: "linear-gradient(135deg, rgba(180,120,20,0.12), rgba(255,200,50,0.06))",
                borderColor: "rgba(200,150,40,0.3)",
              }}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-100">
                  <Crown className="h-5 w-5 text-primary" />
                  {t("settings.premiumMembership")}
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none ml-2 font-bold">
                    {t("common.active")}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("settings.managePremiumDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4 space-y-3 border border-yellow-500/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary mb-2">
                        {t("settings.premiumBenefits")}
                      </h4>
                      <ul className="space-y-1.5 text-sm text-foreground">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.unlimitedSwipes")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.seeWhoLiked")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.advancedFiltersFeature")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.spotlightAccess")}
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full"></div>
                          {t("settings.noAds")}
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
                    onClick={() => {
                      toast.info(
                        t("settings.manageSubscriptionGooglePlay") ||
                          "Open Google Play → Subscriptions to manage your plan"
                      );
                    }}
                  >
                    {t("settings.manageSubscription")}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-primary/50 border-primary/50 text-primary/80 hover:bg-primary hover:text-primary/60"
                      >
                        {t("settings.cancelMembership")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("settings.cancelPremium")}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="text-sm text-muted-foreground">
                            {t("settings.cancelPremiumConfirmDesc")}
                            <ul className="mt-2 space-y-1 text-sm">
                              <li>{t("settings.unlimitedSwipes")}</li>
                              <li>{t("settings.seeWhoLiked")}</li>
                              <li>{t("settings.advancedFiltersFeature")}</li>
                              <li>{t("settings.spotlightAccess")}</li>
                            </ul>
                            <div className="mt-2 font-semibold">
                              {t("settings.subscriptionRemainActive")}
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("settings.keepPremium")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              setLoading(true);
                              // Update premium status in database
                              const { error } = await supabase
                                .from("profiles")
                                .update({ is_premium: false })
                                .eq("id", user!.id);
                              if (error) throw error;

                              setIsPremium(false);
                              toast.success(t("settings.premiumCancelledSuccess"));
                            } catch (error) {
                              toast.error(t("settings.failedCancelMembership"));
                              logger.error(error);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="bg-primary hover:bg-primary"
                        >
                          {t("settings.cancelMembership")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Section */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("account")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("settings.account")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.account ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.account && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={Shield}
                  title={t("settings.verifyAccount")}
                  description={
                    isVerified ? t("settings.accountVerified") : t("settings.getVerifiedBadge")
                  }
                  onClick={() =>
                    !isVerified && setShowVerificationSection(!showVerificationSection)
                  }
                />

                {!isVerified && showVerificationSection && (
                  <Card className="bg-muted/30 border border-border/40 rounded-xl">
                    <CardContent className="pt-5 space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/40">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
                            {t("settings.sendingCodeTo")}
                          </p>
                          <p className="text-sm font-medium truncate">{user?.email}</p>
                        </div>
                      </div>

                      {!otpSent ? (
                        <Button
                          onClick={handleSendVerificationEmail}
                          disabled={loading}
                          className="w-full"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {loading ? t("common.sending") : t("settings.sendVerificationCode")}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground text-center">
                            {t("settings.enterOtpCode")}
                          </p>
                          <Input
                            id="otp-code"
                            placeholder="000000"
                            value={otpCode}
                            onChange={(e) =>
                              setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                            maxLength={6}
                            className="text-center text-lg tracking-[0.5em] font-mono"
                            autoComplete="one-time-code"
                            inputMode="numeric"
                          />
                          <Button
                            onClick={handleVerifyOTP}
                            disabled={loading || otpCode.length !== 6}
                            className="w-full"
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            {loading ? t("settings.verifyingCode") : t("settings.verifyCode")}
                          </Button>
                          <button
                            className="text-xs text-muted-foreground underline w-full text-center"
                            onClick={() => {
                              setOtpSent(false);
                              setOtpCode("");
                            }}
                          >
                            {t("settings.resendCode")}
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <SettingsSection
                  icon={User}
                  title={t("settings.editProfile")}
                  description={t("settings.editProfileDesc")}
                  onClick={() => navigate("/edit-profile")}
                />

                <SettingsSection
                  icon={Lock}
                  title={t("settings.changePassword")}
                  description={t("settings.changePasswordDesc")}
                  onClick={() => setShowPasswordDialog(true)}
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
                {t("settings.discoverySettings")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.discovery ? "rotate-180" : ""}`}
                />
              </CardTitle>
              <CardDescription>{t("settings.discoveryDesc")}</CardDescription>
            </CardHeader>
            {expandedSections.discovery && (
              <CardContent className="space-y-6">
                {/* Looking For */}
                <div className="space-y-3">
                  <Label htmlFor="gender-preference">{t("settings.interestedIn")}</Label>
                  <RadioGroup
                    value={genderPreference}
                    onValueChange={setGenderPreference}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="male" id="pref-male" />
                      <Label htmlFor="pref-male" className="flex-1 cursor-pointer font-normal">
                        {t("settings.men")}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="female" id="pref-female" />
                      <Label htmlFor="pref-female" className="flex-1 cursor-pointer font-normal">
                        {t("settings.women")}
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="everyone" id="pref-everyone" />
                      <Label htmlFor="pref-everyone" className="flex-1 cursor-pointer font-normal">
                        {t("settings.everyone")}
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
                        <span className="text-muted-foreground">{t("settings.minAge")}</span>
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
                        <span className="text-muted-foreground">{t("settings.maxAge")}</span>
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
                    <Label>{t("settings.maxDistance")}</Label>
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
                    {t("settings.showProfilesWithin", { distance: maxDistance })}
                  </p>
                </div>

                <Button
                  onClick={handleUpdateDiscoverySettings}
                  disabled={loading}
                  className="w-full"
                >
                  {t("settings.saveDiscoverySettings")}
                </Button>
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
                {t("settings.activityHistory")}
                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    {t("common.premium")}
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
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
                    title={t("settings.callHistory")}
                    description={t("settings.callHistoryDesc")}
                    onClick={() => navigate("/call-history")}
                  />
                  <SettingsSection
                    icon={Bookmark}
                    title={t("settings.savedProfiles")}
                    description={t("settings.savedProfilesDesc")}
                    onClick={() => navigate("/saved")}
                  />
                  <SettingsSection
                    icon={Eye}
                    title={t("settings.recentlyViewed")}
                    description={t("settings.recentlyViewedDesc")}
                    onClick={() => navigate("/recently-viewed")}
                  />
                  <SettingsSection
                    icon={Activity}
                    title={t("settings.activityFeed")}
                    description={t("settings.activityFeedDesc")}
                    onClick={() => navigate("/activity")}
                  />
                  <SettingsSection
                    icon={Activity}
                    title={t("settings.profileInsights")}
                    description={t("settings.profileInsightsDesc")}
                    onClick={() => navigate("/insights")}
                  />
                  <SettingsSection
                    icon={Sparkles}
                    title={t("settings.matchInsights")}
                    description={t("settings.matchInsightsDesc")}
                    onClick={() => navigate("/match-insights")}
                  />
                  <SettingsSection
                    icon={Target}
                    title={t("settings.matchGoals")}
                    description={t("settings.matchGoalsDesc")}
                    onClick={() => navigate("/match-goals")}
                  />
                  <SettingsSection
                    icon={Camera}
                    title={t("settings.stories")}
                    description={t("settings.storiesDesc")}
                    onClick={() => navigate("/stories")}
                  />
                </CardContent>
              ) : (
                <CardContent>
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">{t("settings.premiumFeature")}</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {t("settings.unlockActivityHistory")}� including call logs, recently viewed
                      profiles, insights, and more � with a premium subscription.
                    </p>
                    <Button size="sm" onClick={() => navigate("/boost-bundles")}>
                      <Crown className="h-4 w-4 mr-1" />
                      {t("settings.upgradeToPremium")}
                    </Button>
                  </div>
                </CardContent>
              ))}
          </Card>

          {/* Travel Mode Section - Premium Feature */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("travel")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✈️ {t("settings.travelMode")}</span>
                {isPremium ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    {t("common.premium")}
                  </Badge>
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.travel ? "rotate-180" : ""}`}
                />
              </CardTitle>
              <CardDescription>{t("settings.travelModeDesc")}</CardDescription>
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

          {/* Safety & Verification */}
          <Card className="shadow-elegant">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => toggleSection("safety")}
            >
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {t("settings.safetyVerification")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.safety ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.safety && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={ShieldCheck}
                  title={t("settings.getVerified")}
                  description={t("settings.getVerifiedDesc")}
                  onClick={() => navigate("/verification")}
                />
                <SettingsSection
                  icon={ShieldCheck}
                  title={t("settings.safetyTips")}
                  description={t("settings.safetyTipsDesc")}
                  onClick={() => navigate("/safety-tips")}
                />
                <SettingsSection
                  icon={ShieldCheck}
                  title={t("settings.safetyCheckin")}
                  description={t("settings.safetyCheckinDesc")}
                  onClick={() => navigate("/safety-checkin")}
                />
                <SettingsSection
                  icon={UserX}
                  title={t("settings.blockedUsers")}
                  description={t("settings.blockedUsersDesc")}
                  onClick={() => navigate("/blocked")}
                />
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
                {t("settings.appearance")} ({t("settings.theme")})
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
                      {t("settings.darkMode")}
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-card to-black border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex-1 cursor-pointer font-normal">
                      {t("settings.lightMode")}
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-muted border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="white" id="white" />
                    <Label htmlFor="white" className="flex-1 cursor-pointer font-normal">
                      {t("settings.whiteMode")}
                    </Label>
                    <div className="w-8 h-8 rounded-full bg-card border-2 border-border" />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="flex-1 cursor-pointer font-normal">
                      {t("settings.blueMode")}
                    </Label>
                    <div className="w-8 h-8 rounded-full border-2 border-border bg-[linear-gradient(135deg,hsl(210,100%,50%),hsl(196,100%,42%))]" />
                  </div>
                </RadioGroup>

                <Separator className="my-4" />
                <Label className="font-medium mb-2 block">{t("settings.languageGjuha")}</Label>
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
                {t("settings.privacySecurity")}
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
                      <Label className="font-normal">{t("settings.incognitoMode")}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t("settings.incognitoModeDesc")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={incognitoMode}
                    onCheckedChange={async (checked) => {
                      setIncognitoMode(checked);
                      if (user) {
                        await supabase
                          .from("profiles")
                          .update({ incognito_mode: checked } as Record<string, unknown>)
                          .eq("id", user.id);
                      }
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-normal">{t("settings.saveData")}</Label>
                    <p className="text-xs text-muted-foreground">{t("settings.saveDataDesc")}</p>
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
                {t("settings.notifications")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.notifications ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.notifications && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">{t("settings.newMatches")}</Label>
                  <Switch
                    checked={notifications.newMatches}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, newMatches: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_matches: checked } as Record<string, unknown>)
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">{t("settings.messages")}</Label>
                  <Switch
                    checked={notifications.messages}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, messages: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_messages: checked } as Record<string, unknown>)
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">{t("settings.likes")}</Label>
                  <Switch
                    checked={notifications.likes}
                    onCheckedChange={async (checked) => {
                      setNotifications({ ...notifications, likes: checked });
                      if (user)
                        await supabase
                          .from("profiles")
                          .update({ notify_likes: checked } as Record<string, unknown>)
                          .eq("id", user.id);
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="font-normal">{t("settings.promotions")}</Label>
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
                      {t("settings.browserPermission")}: {pushPermission}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={requestPushPermission}>
                      {t("settings.permissionBtn")}
                    </Button>
                    {pushSubscribed ? (
                      <Button variant="outline" size="sm" onClick={handlePushUnsubscribe}>
                        {t("settings.disableBtn")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handlePushSubscribe}>
                        {t("settings.subscribeBtn")}
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Do Not Disturb Schedule */}
                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t("settings.doNotDisturb")}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("settings.dndDesc")}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">{t("settings.from")}</Label>
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
                      <Label className="text-xs text-muted-foreground">{t("settings.to")}</Label>
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
                          toast.success(t("settings.dndDisabled"));
                        }}
                      >
                        {t("settings.clear")}
                      </Button>
                    )}
                  </div>
                  {dndStart && dndEnd && (
                    <p className="text-xs text-muted-foreground">
                      {t("settings.quietHours", { start: dndStart, end: dndEnd })}� {dndEnd}
                    </p>
                  )}
                </div>

                <Separator />

                <SettingsSection
                  icon={Bell}
                  title={t("settings.notificationCenter")}
                  description={t("settings.notificationCenterDesc")}
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
                {t("settings.social")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.social ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.social && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={Sparkles}
                  title={t("settings.walletCoins")}
                  description={t("settings.walletCoinsDesc")}
                  onClick={() => navigate("/wallet")}
                />
                <SettingsSection
                  icon={Share2}
                  title={t("settings.inviteFriends")}
                  description={t("settings.inviteFriendsDesc")}
                  onClick={handleInviteFriends}
                />
                <SettingsSection
                  icon={Star}
                  title={t("settings.reviewUs")}
                  description={t("settings.reviewUsDesc")}
                  onClick={() => toast.info(t("settings.supportMsg"))}
                />
                <SettingsSection
                  icon={Users}
                  title={t("settings.socialMedia")}
                  description={t("settings.socialMediaDesc")}
                  onClick={() => toast.info(t("settings.followUs"))}
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
                {t("settings.helpLegal")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.help ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.help && (
              <CardContent className="space-y-2">
                <SettingsSection
                  icon={HelpCircle}
                  title={t("settings.helpCenter")}
                  description={t("settings.helpCenterDesc")}
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={FileText}
                  title={t("settings.imageGuidelines")}
                  description={t("settings.imageGuidelinesDesc")}
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={Lock}
                  title={t("settings.privacyPolicyTitle")}
                  description={t("settings.privacyPolicyDesc")}
                  onClick={() => navigate("/privacy")}
                />
                <SettingsSection
                  icon={FileText}
                  title={t("settings.termsTitle")}
                  description={t("settings.termsDesc")}
                  onClick={() => navigate("/terms")}
                />
                <SettingsSection
                  icon={AlertTriangle}
                  title={t("settings.safetyTips")}
                  description={t("settings.safetyTipsDesc")}
                  onClick={() => navigate("/safety")}
                />
                <SettingsSection
                  icon={Info}
                  title={t("settings.aboutUsTitle")}
                  description={t("settings.aboutUsDesc")}
                  onClick={() => toast.info(t("settings.aboutApp"))}
                />

                <Separator className="my-2" />

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("settings.dataControls")}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDataRequest("export")}
                    disabled={loading}
                  >
                    {t("settings.requestDataExport")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDataRequest("delete")}
                    disabled={loading}
                  >
                    {t("settings.requestDataDeletion")}
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
                {t("settings.dangerZone")}
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${expandedSections.danger ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            {expandedSections.danger && (
              <CardContent className="space-y-4">
                {/* Data Export (GDPR) */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("settings.exportData")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.downloadDataDesc")}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      if (!user) return;
                      try {
                        toast.info(t("settings.preparingExport"));
                        const blob = await exportUserData(user.id);
                        downloadBlob(
                          blob,
                          `shqiponja-data-${new Date().toISOString().slice(0, 10)}.json`
                        );
                        toast.success(t("settings.dataExported"));
                      } catch {
                        toast.error(t("settings.failedExport"));
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("settings.downloadMyData")}
                  </Button>
                </div>

                <Separator />

                {/* Deactivate Account */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("settings.deactivateAccount")}</p>
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
                  <p className="text-sm font-medium text-destructive">
                    {t("settings.permanentDeletion")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("settings.deleteAccountDesc")}</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("settings.deleteAccount")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("settings.areYouSure")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("settings.deleteDialogDesc")} This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={loading}
                        >
                          {t("settings.deleteEverything")}
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
                    logger.error("Sign out error:", error);
                    // Navigate anyway even if sign out fails
                    navigate("/auth", { replace: true });
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("auth.signOut")}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t("settings.versionLabel")}
              </p>
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
                  {t("settings.adminSection")}
                  <ChevronDown
                    className={`h-4 w-4 ml-auto transition-transform ${expandedSections.admin ? "rotate-180" : ""}`}
                  />
                </CardTitle>
              </CardHeader>
              {expandedSections.admin && (
                <CardContent className="space-y-2">
                  <SettingsSection
                    icon={Shield}
                    title={t("settings.safetyConsole")}
                    description={t("settings.safetyConsoleDesc")}
                    onClick={() => navigate("/admin/safety")}
                  />
                  <SettingsSection
                    icon={BarChart3}
                    title={t("settings.analyticsDashboard")}
                    description={t("settings.analyticsDashboardDesc")}
                    onClick={() => navigate("/admin/analytics")}
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* Admin self-escalation removed � admin access is granted via Supabase dashboard only */}
        </div>
      </div>

      {/* Deactivate Account Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <EyeOff className="h-5 w-5" />
              {t("settings.deactivateAccount")}
            </DialogTitle>
            <DialogDescription>{t("settings.deactivateDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("settings.autoDeleteAfter")}</Label>
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
              {t("settings.deactivateFor", { days: deactivateDays })}
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
            setShowOldPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t("settings.changePassword")}
            </DialogTitle>
            <DialogDescription>{t("settings.passwordDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">{t("settings.currentPassword")}</Label>
              <div className="relative">
                <Input
                  id="old-password"
                  type={showOldPassword ? "text" : "password"}
                  placeholder={t("settings.enterCurrentPasswordPlaceholder")}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowOldPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder={t("settings.atLeast6Placeholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive">{t("settings.passwordMinChars")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("settings.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("settings.repeatPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="text-xs text-destructive">{t("settings.passwordsNotMatch")}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-gradient-primary text-primary-foreground"
                onClick={handleChangePassword}
                disabled={
                  passwordLoading ||
                  !oldPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
              >
                {passwordLoading ? t("settings.updating") : t("settings.updatePassword")}
              </Button>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};

export default Settings;

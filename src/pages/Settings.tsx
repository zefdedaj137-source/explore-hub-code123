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
  LogOut,
  Sparkles,
  Crown,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
};

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "white" | "dark">("dark");
  const [notifications, setNotifications] = useState({
    newMatches: true,
    messages: true,
    likes: true,
    promotions: false,
  });
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [saveData, setSaveData] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Initialize theme from localStorage or set to dark as default
    const savedTheme = localStorage.getItem("app-theme") as "light" | "white" | "dark" || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Fetch premium, booster status, travel mode, and discovery settings
    const fetchUserStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_premium, booster_active, booster_expires_at, travel_mode_active, travel_city, min_age_preference, max_age_preference, max_distance_km, gender_preference")
          .eq("id", user.id)
          .single();

        // Handle JWT errors by refreshing session
        if (error) {
          if (error.message?.includes('JWT') || error.code === 'PGRST301') {
            console.log('JWT expired, refreshing session...');
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !session) {
              console.error('Session refresh failed:', refreshError);
              toast.error('Session expired. Please log in again.');
              navigate('/auth');
              return;
            }
            
            // Retry the query after refresh
            const { data: retryData, error: retryError } = await supabase
              .from("profiles")
              .select("is_premium, booster_active, booster_expires_at, travel_mode_active, travel_city, min_age_preference, max_age_preference, max_distance_km, gender_preference")
              .eq("id", user.id)
              .single();
              
            if (retryError) throw retryError;
            
            if (retryData) {
              const typedData = retryData as ProfileData;
              setIsPremium(typedData.is_premium || false);
              const isBoosterValid = typedData.booster_active && 
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
          const isBoosterValid = typedData.booster_active && 
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
        }
      } catch (error) {
        console.error("Error fetching user status:", error);
        toast.error("Failed to load settings. Please try refreshing the page.");
      }
    };

    fetchUserStatus();
  }, [user, navigate]);

  const applyTheme = (themeValue: "light" | "white" | "dark") => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("light", "white", "dark");
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

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user?.id);

      if (profileError) throw profileError;

      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      navigate("/");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateBooster = async (duration: number = 3) => {
    if (!user) return;

    if (!isPremium) {
      toast.error("Premium subscription required to activate booster");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('activate_booster', {
          user_id: user.id,
          duration_hours: duration
        }) as { data: { success: boolean; error?: string; expires_at?: string } | null; error: unknown };

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

  const handleThemeChange = (value: "light" | "white" | "dark") => {
    setTheme(value);
    applyTheme(value);
    localStorage.setItem("app-theme", value);
    
    const themeNames = {
      light: "Light",
      white: "White", 
      dark: "Dark"
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
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          console.log('JWT expired, refreshing session...');
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            toast.error('Session expired. Please log in again.');
            navigate('/auth');
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

  const SettingsSection = ({ 
    icon: Icon, 
    title, 
    description, 
    onClick 
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
    <div className="min-h-screen bg-black pb-24">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl border border-gray-700 p-6 mb-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/discover")}
              className="hover:bg-gray-700/50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-yellow-500" />
            </Button>
            <h1 className="text-2xl font-serif font-bold text-white">Settings</h1>
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
                <div className="bg-white/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <Zap className="h-5 w-5" />
                    Booster Active!
                  </div>
                  <p className="text-sm text-gray-700">
                    Your profile is in the spotlight. Expires at:{" "}
                    {new Date(boosterExpiresAt).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    You're visible to everyone in "Last Active"
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Management Section */}
          {isPremium && (
            <Card className="shadow-elegant bg-gradient-to-br from-gray-900 via-yellow-900/20 to-gray-900 border-2 border-yellow-600/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-100">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Premium Membership
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none ml-2 font-bold">
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage your premium subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/40 rounded-lg p-4 space-y-3 border border-yellow-600/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-100 mb-2">Premium Benefits</h4>
                      <ul className="space-y-1.5 text-sm text-gray-300">
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
                    onClick={() => {
                      toast.info("Opening subscription management...");
                      // This would typically open Stripe customer portal
                      window.open("https://billing.stripe.com/p/login/test_00000000000000", "_blank");
                    }}
                  >
                    Manage Subscription
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full bg-red-950/50 border-red-600/50 text-red-400 hover:bg-red-950 hover:text-red-300">
                        Cancel Membership
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Premium Membership?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel your premium membership? You'll lose access to:
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• Unlimited swipes</li>
                            <li>• See who liked you</li>
                            <li>• Advanced filters</li>
                            <li>• Spotlight booster</li>
                          </ul>
                          <p className="mt-2 font-semibold">Your subscription will remain active until the end of the current billing period.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Premium</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              setLoading(true);
                              // Update premium status in database
                              const { error } = await supabase
                                .from("profiles")
                                .update({ is_premium: false })
                                .eq("id", user?.id);

                              if (error) throw error;
                              
                              setIsPremium(false);
                              toast.success("Premium membership cancelled. You'll have access until the end of your billing period.");
                            } catch (error) {
                              toast.error("Failed to cancel membership. Please try again.");
                              console.error(error);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="bg-red-600 hover:bg-red-700"
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✈️ Travel Mode</span>
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-none">
                    Premium
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Explore matches in different cities around the world
              </CardDescription>
            </CardHeader>
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
          </Card>

          {/* Account Section */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
              </CardTitle>
            </CardHeader>
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
                    <Button onClick={handleSendVerificationEmail} disabled={loading} className="w-full">
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
                    <Button onClick={handleVerifyOTP} disabled={loading} variant="secondary" className="w-full">
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
                onClick={() => toast.info("Coming soon!")}
              />
            </CardContent>
          </Card>

          {/* Discovery Settings */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Discovery Settings
              </CardTitle>
              <CardDescription>
                Customize your discovery preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Looking For */}
              <div className="space-y-3">
                <Label htmlFor="gender-preference">Interested In</Label>
                <RadioGroup value={genderPreference} onValueChange={setGenderPreference} className="space-y-2">
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
                <Label>Age Range: {minAge} - {maxAge}</Label>
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
          </Card>

          {/* Appearance Section */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Erscheinungsbild (Appearance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={theme} onValueChange={handleThemeChange} className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="flex-1 cursor-pointer font-normal">
                    Dark Mode (Default)
                  </Label>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-black border" />
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="flex-1 cursor-pointer font-normal">
                    Light Mode (Brighter)
                  </Label>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border" />
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="white" id="white" />
                  <Label htmlFor="white" className="flex-1 cursor-pointer font-normal">
                    White Mode (Brightest)
                  </Label>
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300" />
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Privacy Section */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {incognitoMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <div>
                    <Label className="font-normal">Incognito Mode</Label>
                    <p className="text-xs text-muted-foreground">Hide your profile</p>
                  </div>
                </div>
                <Switch checked={incognitoMode} onCheckedChange={setIncognitoMode} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-normal">Show Profile to Others</Label>
                  <p className="text-xs text-muted-foreground">Be visible in discovery</p>
                </div>
                <Switch checked={showProfile} onCheckedChange={setShowProfile} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-normal">Save Data</Label>
                  <p className="text-xs text-muted-foreground">Keep your data locally</p>
                </div>
                <Switch checked={saveData} onCheckedChange={setSaveData} />
              </div>

              <Separator />

              <SettingsSection
                icon={UserX}
                title="Block Contacts"
                description="Manage blocked users"
                onClick={() => toast.info("Coming soon!")}
              />
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-normal">New Matches</Label>
                <Switch
                  checked={notifications.newMatches}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, newMatches: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="font-normal">Messages</Label>
                <Switch
                  checked={notifications.messages}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, messages: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="font-normal">Likes</Label>
                <Switch
                  checked={notifications.likes}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, likes: checked })
                  }
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
            </CardContent>
          </Card>

          {/* Social & Community */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social & Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
                onClick={() => toast.info("Coming soon!")}
              />

              <SettingsSection
                icon={Users}
                title="Social Media"
                description="Follow us on social platforms"
                onClick={() => toast.info("Coming soon!")}
              />
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingsSection
                icon={HelpCircle}
                title="Help Center"
                description="Get help and support"
                onClick={() => toast.info("Coming soon!")}
              />

              <SettingsSection
                icon={FileText}
                title="Bildrichtlinien"
                description="Image guidelines"
                onClick={() => toast.info("Coming soon!")}
              />
            </CardContent>
          </Card>

          {/* Legal */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Rechtliches (Legal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SettingsSection
                icon={Lock}
                title="Datenschutz"
                description="Privacy policy"
                onClick={() => toast.info("Coming soon!")}
              />

              <SettingsSection
                icon={FileText}
                title="AGB"
                description="Terms & conditions"
                onClick={() => toast.info("Coming soon!")}
              />

              <SettingsSection
                icon={AlertTriangle}
                title="Safety Tips"
                description="Stay safe while dating"
                onClick={() => toast.info("Coming soon!")}
              />

              <SettingsSection
                icon={Info}
                title="About Us"
                description="Learn more about Shqiponja"
                onClick={() => toast.info("Coming soon!")}
              />
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-elegant border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and remove all your data from our servers.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
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
                    console.error('Sign out error:', error);
                    // Navigate anyway even if sign out fails
                    navigate("/auth", { replace: true });
                  }
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">Version 1.0.0</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
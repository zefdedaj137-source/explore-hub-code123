import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Phone } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Browser } from "@capacitor/browser";

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

// Simple E.164 phone validation — replaces react-phone-number-input (saves ~80 KB)
function isValidPhoneNumber(phone: string) {
  return /^\+[1-9]\d{6,14}$/.test(phone.replace(/[\s()-]/g, ""));
}

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Email auth states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone auth states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Age verification
  const [birthDate, setBirthDate] = useState("");

  const [loading, setLoading] = useState(false);

  const maxBirthDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  })();

  const isAgeValid = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr <= maxBirthDate;
  };
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Redirect authenticated users - ONLY when on /auth page
  useEffect(() => {
    const checkUserProfile = async () => {
      if (import.meta.env.DEV)
        logger.log("🔄 useEffect triggered - user:", !!user, "authLoading:", authLoading);

      // If no user and not loading, stay on auth page (reset redirect flag)
      if (!user && !authLoading) {
        if (import.meta.env.DEV) logger.log("🔓 No user, staying on auth page");
        hasRedirected.current = false; // Reset redirect flag when logged out
        return;
      }

      // Only redirect if we're on the auth page and haven't redirected yet
      if (location.pathname !== "/auth" || hasRedirected.current) {
        return;
      }

      if (user && !authLoading) {
        if (import.meta.env.DEV)
          logger.log("👤 Authenticated user detected, checking profile for user:", user.id);
        hasRedirected.current = true;

        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (import.meta.env.DEV) logger.log("📋 Profile check result:", { profile, error });

          // Handle JWT expired - refresh session and redirect to discover
          if (
            error &&
            (error.code === "PGRST301" ||
              error.message?.includes("JWT expired") ||
              error.message?.includes("401"))
          ) {
            if (import.meta.env.DEV)
              logger.log("🔓 JWT expired or RLS blocking. Refreshing session...");

            // Try to refresh the session
            const {
              data: { session },
              error: refreshError,
            } = await supabase.auth.refreshSession();

            if (session) {
              if (import.meta.env.DEV)
                logger.log("✅ Session refreshed successfully. Redirecting to discover");
              navigate("/discover", { replace: true });
            } else {
              logger.error("❌ Session refresh failed:", refreshError);
              // Session can't be refreshed, redirect to discover anyway since user is authenticated
              navigate("/discover", { replace: true });
            }
            return;
          }

          if (error) {
            logger.error("❌ Profile check error:", error);
            // For other errors, assume new user
            if (import.meta.env.DEV) logger.log("📝 Profile check failed, redirecting to setup");
            navigate("/profile-setup", { replace: true });
            return;
          }

          // If profile exists with any data, consider it set up
          // A profile exists if we get a record back (even with minimal data)
          if (profile && profile.id) {
            if (import.meta.env.DEV) logger.log("✅ User has profile, redirecting to discover");
            navigate("/discover", { replace: true });
          } else {
            if (import.meta.env.DEV)
              logger.log("📝 User needs to complete profile, redirecting to setup");
            navigate("/profile-setup", { replace: true });
          }
        } catch (error) {
          logger.error("Error checking profile:", error);
          // If there's an error, assume they need to set up profile
          if (import.meta.env.DEV) logger.log("⚠️ Error occurred, redirecting to profile setup");
          navigate("/profile-setup", { replace: true });
        }
      }
    };

    checkUserProfile();
  }, [user, authLoading, navigate, location.pathname]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("auth.fillAllFields"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("auth.passwordMin"));
      return;
    }

    if (!isLogin) {
      if (!birthDate) {
        toast.error(t("auth.birthdateRequired") || "Please enter your date of birth");
        return;
      }
      if (!isAgeValid(birthDate)) {
        toast.error(t("auth.mustBe18") || "You must be 18 or older to use Shqiponja");
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          analytics.login("email");
          toast.success(t("auth.welcomeBackMsg"));
          // Navigation will be handled by useEffect based on profile status
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          logger.error("❌ Sign up error details:", error);
          throw error;
        }

        if (data.user) {
          analytics.signUp("email");
          if (import.meta.env.DEV) {
            logger.log("✅ Sign up successful:", data.user.id);
            logger.log("📧 Email confirmed:", data.user.email_confirmed_at);
            logger.log("👤 User object:", data.user);
          }

          // Send welcome email (fire-and-forget — don't block signup flow)
          supabase.functions
            .invoke("send-welcome", {
              body: { email: data.user.email },
            })
            .catch((err) => logger.error("Welcome email failed:", err));

          if (!data.user.email_confirmed_at) {
            toast.success(
              "✅ Account created! Please check your email and click the confirmation link to complete registration.",
              {
                duration: 6000,
              }
            );
            if (import.meta.env.DEV)
              logger.log("📧 Email confirmation required. Waiting for user to confirm email...");

            // Add a note about checking email
            toast.info(t("auth.emailTip"), {
              duration: 8000,
            });
            return;
          }

          toast.success(t("auth.accountCreated"));

          // Listen for session to be ready before navigating
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              if (import.meta.env.DEV) logger.log("✅ Session ready, navigating to profile setup");
              subscription.unsubscribe();
              navigate("/profile-setup");
            }
          });

          // Fallback: if no auth event fires within 5s, navigate anyway
          setTimeout(() => {
            subscription.unsubscribe();
            navigate("/profile-setup");
          }, 5000);
        } else {
          if (import.meta.env.DEV) logger.log("⚠️ Sign up returned no user");
          toast.error(t("auth.signupNoUser"));
        }
      }
    } catch (error) {
      logger.error("❌ Auth error:", error);
      const errorMessage = (error as Error).message || "An error occurred";

      if (errorMessage.includes("email") && errorMessage.includes("already")) {
        toast.error(t("auth.emailRegistered"));
      } else if (errorMessage.includes("rate limit")) {
        toast.error(t("auth.tooManyAttempts"));
      } else if (errorMessage.includes("invalid") && errorMessage.includes("email")) {
        toast.error(t("auth.invalidEmail"));
      } else {
        toast.error(t("auth.signupFailed", { error: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error(t("auth.enterEmail"));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(t("auth.resetLinkSent"));
      setIsForgotPassword(false);
    } catch (error) {
      logger.error("Forgot password error:", error);
      const errorMessage = (error as Error).message || "Failed to send reset email";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      toast.error(t("auth.enterPhone"));
      return;
    }

    setLoading(true);

    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        throw new Error("Enter a valid phone number in international format (e.g., +355…)");
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: { channel: "sms", shouldCreateUser: true },
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      toast.success(t("auth.otpSentPhone"));
    } catch (error) {
      const errorMsg = (error as Error).message || "Failed to send OTP";
      toast.error(errorMsg);

      // Show additional helpful message
      if (errorMsg.includes("SMS") || errorMsg.includes("phone")) {
        toast.error(t("auth.twilioError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.length !== 6) {
      toast.error(t("auth.enterOtpCode"));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: "sms",
      });

      if (error) throw error;

      if (data.user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          toast.success(t("auth.accountCreated"));
          // Send welcome SMS for new phone users (fire-and-forget)
          supabase.functions
            .invoke("send-welcome", {
              body: { phone: phoneNumber },
            })
            .catch((err) => logger.error("Welcome SMS failed:", err));
        } else {
          toast.success(t("auth.welcomeBackMsg"));
        }
        // Navigation will be handled by useEffect based on profile status
      }
    } catch (error) {
      toast.error((error as Error).message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const resetPhoneAuth = () => {
    setOtpSent(false);
    setOtpCode("");
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const isNative = !!(
        window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
      ).Capacitor?.isNativePlatform?.();
      const redirectTo = isNative
        ? "com.shqiponja.app://auth/callback"
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (isNative) {
          await Browser.open({ url: data.url, windowName: "_self" });
        } else {
          window.location.href = data.url;
        }
        return;
      }

      toast.error(t("auth.appleSignInError"));
    } catch (error) {
      toast.error((error as Error).message || "Failed to sign in with Apple");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center relative overflow-hidden p-4 page-bg">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full animate-float opacity-60 orb-rose" />
        <div className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full animate-float-slow opacity-50 orb-purple" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-grid-overlay" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center logo-rose">
              <img src="/eagle-logo.png" alt="Shqiponja" className="w-14 h-14 object-contain" />
            </div>
            <div className="absolute -inset-1 rounded-2xl opacity-30 blur-xl bg-gradient-to-br from-[#e8274b] to-[#ff6b35]" />
          </div>
          <h1 className="text-3xl font-bold mb-1 font-serif dark:text-white/95 text-foreground">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h1>
          <p className="text-sm dark:text-white/[0.38] text-muted-foreground">
            {t("auth.connectSubtitle")}
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-3xl p-7 animate-slide-up glass-panel">
          <Tabs
            value={authMethod}
            onValueChange={(v) => setAuthMethod(v as "email" | "phone")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 rounded-xl dark:bg-white/[0.06] bg-black/[0.04] dark:border-white/[0.08] border-black/[0.08] border">
              <TabsTrigger
                value="email"
                className="gap-2 rounded-lg dark:data-[state=active]:text-white data-[state=active]:text-foreground transition-all dark:text-white/50 text-muted-foreground"
              >
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger
                value="phone"
                className="gap-2 rounded-lg dark:data-[state=active]:text-white data-[state=active]:text-foreground transition-all dark:text-white/50 text-muted-foreground"
              >
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              {isForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="rounded-xl dark:border-0 dark:text-white dark:placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground placeholder:text-muted-foreground/50"
                    />
                    <p className="text-xs dark:text-white/35 text-muted-foreground">
                      {t("auth.resetLinkDesc")}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl border-0 text-white font-semibold py-5 transition-all hover:opacity-90 hover:scale-[1.01] btn-rose"
                    disabled={loading}
                  >
                    {loading ? t("auth.sending") : t("auth.sendResetLink")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl dark:text-white/50 text-muted-foreground"
                    onClick={() => setIsForgotPassword(false)}
                  >
                    {t("auth.backToSignIn")}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="rounded-xl dark:border-0 dark:text-white dark:placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                    >
                      <Lock className="h-4 w-4" />
                      {t("auth.password")}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      className="rounded-xl dark:border-0 dark:text-white dark:placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground placeholder:text-muted-foreground/50"
                    />
                    {isLogin && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-xs transition-colors hover:text-rose-300 text-[#e8274b]/80"
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                    )}
                  </div>
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="birthDate"
                        className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                      >
                        {t("auth.dateOfBirth") || "Date of Birth"}
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        max={maxBirthDate}
                        required
                        className="rounded-xl dark:border-0 dark:text-white focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground"
                      />
                      <p className="text-xs dark:text-white/35 text-muted-foreground">
                        {t("auth.mustBe18Hint") || "You must be 18 or older to use Shqiponja"}
                      </p>
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full rounded-xl border-0 text-white font-semibold py-5 transition-all hover:opacity-90 hover:scale-[1.01] btn-rose"
                    disabled={loading}
                  >
                    {loading ? t("common.loading") : isLogin ? t("auth.signIn") : t("auth.signUp")}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="phone">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                    >
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none">
                        +
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        value={phoneNumber.replace(/^\+/, "")}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d\s()-]/g, "");
                          setPhoneNumber("+" + raw);
                        }}
                        placeholder={t("auth.phonePlaceholder") || "355 69 123 4567"}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pl-7 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl border-0 text-white font-semibold py-5 transition-all hover:opacity-90 hover:scale-[1.01] btn-rose"
                    disabled={loading}
                  >
                    {loading ? t("auth.sending") : t("auth.continueWithPhone")}
                  </Button>
                  <p className="text-xs text-center dark:text-white/30 text-muted-foreground">
                    {t("auth.worksForBoth")}
                  </p>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="otp"
                      className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
                    >
                      <Lock className="h-4 w-4" />
                      {t("auth.enterOtp")}
                    </Label>
                    <p className="text-sm mb-2 dark:text-white/35 text-muted-foreground">
                      {t("auth.otpSent")} {phoneNumber}
                    </p>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      className="rounded-xl dark:border-0 dark:text-white dark:placeholder:text-white/25 text-center text-2xl tracking-widest focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl border-0 text-white font-semibold py-5 transition-all hover:opacity-90 btn-rose"
                    disabled={loading}
                  >
                    {loading ? t("auth.verifying") : t("auth.verifySignIn")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full rounded-xl dark:text-white/50 text-muted-foreground"
                    onClick={resetPhoneAuth}
                  >
                    {t("auth.useDifferentNumber")}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t dark:border-white/[0.08] border-black/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 text-xs tracking-widest bg-transparent dark:text-white/30 text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl py-5 font-semibold transition-all hover:scale-[1.02] dark:bg-white/[0.07] bg-black/[0.04] dark:border-white/10 border border-black/[0.08] dark:text-white/75 text-foreground"
              onClick={handleAppleSignIn}
              disabled={loading}
            >
              <AppleIcon className="h-5 w-5 mr-2" />
              Apple
            </Button>
          </div>

          {/* Switch mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setIsForgotPassword(false);
              }}
              className="text-sm transition-colors hover:text-rose-300 text-[#e8274b]/80"
            >
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm transition-colors dark:hover:text-white/60 hover:text-foreground dark:text-white/30 text-muted-foreground"
          >
            {t("auth.backToHome")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

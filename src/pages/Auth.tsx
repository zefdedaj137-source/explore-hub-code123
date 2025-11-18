import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Mail, Lock, Phone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
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
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  // Redirect authenticated users - ONLY when on /auth page
  useEffect(() => {
    const checkUserProfile = async () => {
      console.log('🔄 useEffect triggered - user:', !!user, 'authLoading:', authLoading);
      
      // If no user and not loading, stay on auth page (reset redirect flag)
      if (!user && !authLoading) {
        console.log('🔓 No user, staying on auth page');
        hasRedirected.current = false; // Reset redirect flag when logged out
        return;
      }
      
      // Only redirect if we're on the auth page and haven't redirected yet
      if (location.pathname !== '/auth' || hasRedirected.current) {
        return;
      }
      
      if (user && !authLoading) {
        console.log('👤 Authenticated user detected, checking profile for user:', user.id);
        hasRedirected.current = true;
        
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', user.id)
            .maybeSingle();

          console.log('📋 Profile check result:', { profile, error });

          // Handle JWT expired - refresh session and redirect to discover
          if (error && (error.code === 'PGRST301' || error.message?.includes('JWT expired') || error.message?.includes('401'))) {
            console.log('🔓 JWT expired or RLS blocking. Refreshing session...');
            
            // Try to refresh the session
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (session) {
              console.log('✅ Session refreshed successfully. Redirecting to discover');
              navigate("/discover", { replace: true });
            } else {
              console.error('❌ Session refresh failed:', refreshError);
              // Session can't be refreshed, redirect to discover anyway since user is authenticated
              navigate("/discover", { replace: true });
            }
            return;
          }

          if (error) {
            console.error('❌ Profile check error:', error);
            // For other errors, assume new user
            console.log('📝 Profile check failed, redirecting to setup');
            navigate("/profile-setup", { replace: true });
            return;
          }

          // If profile exists with any data, consider it set up
          // A profile exists if we get a record back (even with minimal data)
          if (profile && profile.id) {
            console.log('✅ User has profile, redirecting to discover');
            navigate("/discover", { replace: true });
          } else {
            console.log('📝 User needs to complete profile, redirecting to setup');
            navigate("/profile-setup", { replace: true });
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // If there's an error, assume they need to set up profile
          console.log('⚠️ Error occurred, redirecting to profile setup');
          navigate("/profile-setup", { replace: true });
        }
      }
    };

    checkUserProfile();
  }, [user, authLoading, navigate, location.pathname]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
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
          toast.success("Welcome back!");
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
          console.error('❌ Sign up error details:', error);
          throw error;
        }
        
        if (data.user) {
          console.log('✅ Sign up successful:', data.user.id);
          console.log('📧 Email confirmed:', data.user.email_confirmed_at);
          console.log('👤 User object:', data.user);
          
          if (!data.user.email_confirmed_at) {
            toast.success("✅ Account created! Please check your email and click the confirmation link to complete registration.", {
              duration: 6000
            });
            console.log('📧 Email confirmation required. Waiting for user to confirm email...');
            
            // Add a note about checking email
            toast.info("💡 Tip: Check your spam folder if you don't see the confirmation email.", {
              duration: 8000
            });
            return;
          }
          
          toast.success("Account created! Please complete your profile.");
          
          // Force a session refresh to update the auth context
          setTimeout(async () => {
            console.log('🔄 Refreshing session...');
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('📋 Session after refresh:', { hasSession: !!session, userId: session?.user?.id });
            
            if (session?.user) {
              console.log('✅ Session refreshed, navigation should happen automatically');
            } else {
              console.log('⚠️ No session after refresh, manual navigation');
              navigate("/profile-setup");
            }
          }, 1000);
        } else {
          console.log('⚠️ Sign up returned no user');
          toast.error("Sign up completed but no user returned. Please try signing in.");
        }
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      const errorMessage = (error as Error).message || "An error occurred";
      
      if (errorMessage.includes('email') && errorMessage.includes('already')) {
        toast.error("This email is already registered. Please try signing in instead.");
      } else if (errorMessage.includes('rate limit')) {
        toast.error("Too many attempts. Please wait a moment and try again.");
      } else if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
        toast.error("Please enter a valid email address.");
      } else {
        toast.error(`Sign up failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success("Password reset link sent! Check your email.");
      setIsForgotPassword(false);
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = (error as Error).message || "Failed to send reset email";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    setLoading(true);

    try {
      if (!isValidPhoneNumber(phoneNumber)) {
        throw new Error("Enter a valid phone number in international format (e.g., +355…)");
      }

      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: { channel: 'sms', shouldCreateUser: true },
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      toast.success("OTP sent to your phone!");
    } catch (error) {
      const errorMsg = (error as Error).message || "Failed to send OTP";
      toast.error(errorMsg);
      
      // Show additional helpful message
      if (errorMsg.includes('SMS') || errorMsg.includes('phone')) {
        toast.error("Please verify Twilio is configured correctly in backend settings");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: 'sms',
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
          toast.success("Account created! Please complete your profile.");
        } else {
          toast.success("Welcome back!");
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

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
          scopes: 'openid email profile',
        },
      });

      if (error) throw error;

      if (data?.url) {
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
          return;
        } catch (e) {
          // Fallback to opening a new tab if top navigation is blocked
          window.open(data.url, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      toast.error('Could not start Google sign-in. Please verify provider setup and allowed domains.');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <div className="flex flex-col items-center mb-8">
          <img src="/eagle-logo.png" alt="Shqiponja" className="h-32 w-32 object-contain mb-4" />
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Welcome to Shqiponja
          </h1>
          <p className="text-muted-foreground text-center">
            Connect with Albanian singles worldwide
          </p>
        </div>

        <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll send you a link to reset your password
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsForgotPassword(false)}
                >
                  ← Back to Sign In
                </Button>
              </form>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  {isLogin && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
                  disabled={loading}
                >
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="phone">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </Label>
                  <PhoneInput
                    international
                    defaultCountry="AL"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value || "")}
                    className="phone-input"
                    placeholder="Enter phone number"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Continue with Phone"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Works for both new and existing accounts
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Enter OTP Code
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    We sent a 6-digit code to {phoneNumber}
                  </p>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify & Sign In"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resetPhoneAuth}
                >
                  Use Different Number
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <FcGoogle className="h-5 w-5 mr-2" />
          Google
        </Button>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setIsForgotPassword(false);
            }}
            className="text-primary hover:underline"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
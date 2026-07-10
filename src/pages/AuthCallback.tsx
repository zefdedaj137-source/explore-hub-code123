import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          toast.error(t("authCallback.authFailed"));
          navigate("/auth");
          return;
        }

        // Check if user came via Apple OAuth and needs age verification
        const requiresAgeVerification =
          sessionStorage.getItem("require_age_verification") === "true";

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          // PGRST116 is "not found" - any other error is unexpected
          toast.error(t("authCallback.errorProfile"));
        }

        if (!profile) {
          // New user - if they came via OAuth, they must verify age first
          if (requiresAgeVerification) {
            toast.info(t("ageGate.verifyToContinue"));
            navigate("/age-verification", { replace: true });
          } else {
            toast.success(t("authCallback.welcome"));
            navigate("/profile-setup", { replace: true });
          }
        } else {
          // Existing user - check if they have verified their age
          // If they have age_verified_at, they're good to go
          if (profile.age_verified_at || profile.date_of_birth) {
            toast.success(t("authCallback.welcomeBack"));
            navigate("/discover", { replace: true });
          } else if (requiresAgeVerification) {
            // They came via OAuth and haven't verified age yet
            toast.info(t("ageGate.verifyToContinue"));
            navigate("/age-verification", { replace: true });
          } else {
            // Legacy: Profile exists but age not verified - send to age verification or profile setup
            navigate("/profile-setup", { replace: true });
          }
        }
      } catch (error) {
        toast.error(t("authCallback.authFailed"));
        navigate("/auth");
      }
    };

    handleCallback();
  }, [navigate, t]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-hero">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t("authCallback.completingSignIn")}</p>
      </div>
    </div>
  );
};

export default AuthCallback;

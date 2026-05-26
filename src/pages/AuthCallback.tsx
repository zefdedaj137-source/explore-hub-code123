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
          toast.success(t("authCallback.welcome"));
          navigate("/profile-setup");
        } else {
          toast.success(t("authCallback.welcomeBack"));
          navigate("/discover");
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

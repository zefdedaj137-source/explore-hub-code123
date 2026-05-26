import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, Heart } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Case 1: navigated here from AppContent's PASSWORD_RECOVERY handler
    if ((location.state as { fromRecovery?: boolean } | null)?.fromRecovery) {
      setSessionReady(true);
      return;
    }

    // Case 2: landed directly from email link — hash contains type=recovery
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    if (hashParams.get("type") === "recovery") {
      setSessionReady(true);
      return;
    }

    // Case 3: session already active (page reload)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Case 4: event fires after mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [location.state]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error(t("resetPassword.fillBothFields"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("resetPassword.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("resetPassword.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast.success(t("resetPassword.updatedSuccess"));
      setTimeout(() => navigate("/discover", { replace: true }), 1500);
    } catch (error) {
      logger.error("Password reset error:", error);
      toast.error((error as Error).message || t("resetPassword.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 border-border backdrop-blur-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] rounded-full p-3 mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("resetPassword.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sessionReady ? t("resetPassword.enterPassword") : t("resetPassword.verifyingLink")}
          </p>
        </div>

        {sessionReady ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password" className="text-muted-foreground">
                {t("resetPassword.newPassword")}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("resetPassword.enterNewPassword")}
                  className="pl-10 bg-muted/50 border-border text-white"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-muted-foreground">
                {t("resetPassword.confirmPassword")}
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("resetPassword.confirmNewPassword")}
                  className="pl-10 bg-muted/50 border-border text-white"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] hover:brightness-110 text-white"
            >
              {loading ? t("resetPassword.updating") : t("resetPassword.updatePassword")}
            </Button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
                {t("resetPassword.takingTooLong")}
              </p>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="w-full mt-4 text-muted-foreground hover:text-white"
        >
          {t("resetPassword.backToSignIn")}
        </Button>
      </Card>
    </div>
  );
};

export default ResetPassword;

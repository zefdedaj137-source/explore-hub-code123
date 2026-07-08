import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { CalendarDays } from "lucide-react";

const AgeVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [birthDate, setBirthDate] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDate) {
      toast.error(t("auth.birthdateRequired") || "Please enter your date of birth");
      return;
    }

    if (!isAgeValid(birthDate)) {
      toast.error(t("auth.mustBe18") || "You must be 18 or older to use Shqiponja");
      return;
    }

    if (!agreedToTerms) {
      toast.error(
        t("auth.mustAgreeTerms") ||
          "Please agree to the Terms and the zero-tolerance content policy to continue"
      );
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      // Calculate the date_of_birth from the selected date
      // The input gives us YYYY-MM-DD format
      const dateOfBirth = birthDate;

      // Update user profile with verified age
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          date_of_birth: dateOfBirth,
          age_verified_at: new Date().toISOString(),
          age_verification_method: "oauth_callback",
        })
        .eq("id", user.id);

      if (updateError) {
        logger.error("Error updating profile with age:", updateError);
        throw updateError;
      }

      // Clear the session flag
      sessionStorage.removeItem("require_age_verification");

      toast.success(t("auth.ageVerified") || "Age verified successfully!");

      // Redirect to profile setup to complete the profile
      navigate("/profile-setup", { replace: true });
    } catch (error) {
      logger.error("Age verification error:", error);
      toast.error((error as Error).message || "Failed to verify age");
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
            Verify Your Age
          </h1>
          <p className="text-sm dark:text-white/[0.38] text-muted-foreground">
            We require all users to be 18 or older
          </p>
        </div>

        {/* Glass card */}
        <Card className="rounded-3xl p-7 glass-panel">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="birthdate"
                className="flex items-center gap-2 text-sm font-medium dark:text-white/60 text-muted-foreground"
              >
                <CalendarDays className="h-4 w-4" />
                Date of Birth
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={maxBirthDate}
                required
                className="rounded-xl dark:border-0 dark:text-white focus-visible:ring-1 focus-visible:ring-rose-500/50 dark:bg-white/[0.07] bg-white border border-black/10 text-foreground"
              />
              <p className="text-xs dark:text-white/35 text-muted-foreground">
                You must be at least 18 years old to use Shqiponja
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-xl p-3 dark:bg-white/[0.04] bg-black/[0.03] border dark:border-white/10 border-black/[0.08]">
              <Checkbox
                id="agreeTerms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5"
              />
              <Label
                htmlFor="agreeTerms"
                className="text-xs leading-relaxed font-normal cursor-pointer dark:text-white/60 text-muted-foreground"
              >
                {t("auth.agreeTermsPrefix") || "I confirm I am 18 or older and agree to the"}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/terms")}
                  className="underline text-[#e8274b]/90 hover:text-rose-300"
                >
                  {t("auth.termsLink") || "Terms of Use (EULA)"}
                </button>{" "}
                {t("common.and") || "and"}{" "}
                <button
                  type="button"
                  onClick={() => navigate("/privacy")}
                  className="underline text-[#e8274b]/90 hover:text-rose-300"
                >
                  {t("auth.privacyLink") || "Privacy Policy"}
                </button>
                {". "}
                {t("auth.zeroToleranceNotice") ||
                  "I understand there is zero tolerance for objectionable content or abusive behavior, and that such content will be removed and offending users banned."}
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border-0 text-white font-semibold py-5 transition-all hover:opacity-90 hover:scale-[1.01] btn-rose"
            >
              {loading ? "Verifying..." : "Continue"}
            </Button>

            <p className="text-xs text-center dark:text-white/40 text-muted-foreground">
              Your date of birth is used only to verify you meet the age requirement and will be
              stored securely.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AgeVerification;

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

const AGE_GATE_KEY = "age_gate_accepted_v2";

const AgeGate = () => {
  const [accepted, setAccepted] = useState<boolean>(true);
  const { t } = useTranslation();

  useEffect(() => {
    const stored = localStorage.getItem(AGE_GATE_KEY);
    setAccepted(stored === "true");
  }, []);

  const handleAccept = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    setAccepted(true);
  };

  const handleDecline = () => {
    // Redirect to a safe external site
    window.location.href = "https://www.google.com";
  };

  if (accepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl p-8 rounded-2xl border-2 border-rose-500/50 bg-gradient-to-br from-card to-background shadow-[0_12px_40px_rgb(0,0,0,0.3)]">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
          <h2 className="text-2xl font-bold text-foreground">Age Restriction Notice</h2>
        </div>

        <div className="space-y-4 mb-8 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">
              Shqiponja is a dating platform for adults only.
            </strong>{" "}
            By continuing, you confirm that you are:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>At least 18 years of age (or the age of majority in your jurisdiction)</li>
            <li>Legally able to enter into this agreement</li>
            <li>Able to use this service in accordance with all applicable laws and regulations</li>
          </ul>
          <p>
            We are committed to protecting minors and maintaining a safe dating environment. All
            users must verify their age during the signup process. Providing false information about
            your age may result in account termination and legal action.
          </p>
          <p>
            <strong className="text-foreground">
              By clicking "I Confirm", you certify that you meet the age requirement.
            </strong>
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white font-semibold hover:opacity-90"
            onClick={handleAccept}
          >
            {t("ageGate.confirm") || "I Confirm"}
          </Button>
          <Button variant="outline" className="flex-1 font-semibold" onClick={handleDecline}>
            {t("ageGate.exit") || "Exit"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          If you are under 18, please exit this application. Continuing means you accept the terms
          above.
        </p>
      </Card>
    </div>
  );
};

export default AgeGate;

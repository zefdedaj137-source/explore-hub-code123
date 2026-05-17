import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const AGE_GATE_KEY = "age_gate_accepted_v1";

const AgeGate = () => {
  const [accepted, setAccepted] = useState<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem(AGE_GATE_KEY);
    setAccepted(stored === "true");
  }, []);

  const handleAccept = () => {
    localStorage.setItem(AGE_GATE_KEY, "true");
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg p-8 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_12px_40px_rgb(0,0,0,0.2)]">
        <h2 className="text-xl font-bold text-foreground mb-2">Adults Only</h2>
        <p className="text-muted-foreground mb-6">
          You must be at least 18 years old to use Shqiponja.
        </p>
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white"
            onClick={handleAccept}
          >
            I am 18+ years old
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              window.location.href = "https://www.google.com";
            }}
          >
            Exit
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AgeGate;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const SuperlikeSuccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [superlikesAdded, setSuperlikesAdded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fulfill = async (sessionId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke("fulfill-superlike-purchase", {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setSuperlikesAdded(data.superlikes_remaining);
          toast.success(t("superlikeSuccess.superlikesAdded"));
        } else {
          throw new Error(data?.error || "Fulfillment failed");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to verify purchase";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setError("No session ID found.");
      setLoading(false);
      return;
    }
    fulfill(sessionId);
  }, [searchParams, t]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your purchase…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-elegant">
          <p className="text-destructive font-semibold mb-4">{error}</p>
          <Button onClick={() => navigate("/discover")} className="w-full">
            {t("superlikeSuccess.backToDiscover")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center shadow-elegant">
        <div className="h-16 w-16 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-9 w-9 text-yellow-400" />
        </div>
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">{t("superlikeSuccess.title")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("superlikeSuccess.purchaseConfirmed")}{" "}
          <span className="font-bold text-foreground">
            {superlikesAdded} {superlikesAdded !== 1 ? t("superlikeSuccess.plural") : t("superlikeSuccess.singular")}
          </span>{" "}
          {t("superlikeSuccess.readyToUse")}
        </p>
        <Button
          className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold hover:brightness-110"
          onClick={() => navigate("/discover")}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("superlikeSuccess.startSuperLiking")}
        </Button>
      </Card>
    </div>
  );
};

export default SuperlikeSuccess;

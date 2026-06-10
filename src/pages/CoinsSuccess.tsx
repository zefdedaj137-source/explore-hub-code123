import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const CoinsSuccess = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [coinsAdded, setCoinsAdded] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fulfill = async (sessionId: string) => {
      try {
        // Retrieve Stripe session metadata to get product_id + coins
        const { data, error } = await supabase.functions.invoke("fulfill-coins-purchase", {
          body: { stripe_session_id: sessionId, source: "stripe" },
        });

        if (error) throw error;

        if (data?.success) {
          setCoinsAdded(data.balance - (data.previous_balance ?? 0));
          setNewBalance(data.balance);
          toast.success(t("wallet.coinsAdded", { coins: data.balance }));
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
        <Card className="p-6 max-w-sm w-full text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <Button onClick={() => navigate("/wallet")}>Back to Wallet</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <Card className="p-8 max-w-sm w-full text-center space-y-5 rounded-2xl shadow-xl">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">
          {t("wallet.purchaseSuccess", "Purchase Successful!")}
        </h1>
        {newBalance !== null && (
          <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary">
            <Coins className="h-5 w-5" />
            <span>
              {newBalance} {t("wallet.coins", "coins")}
            </span>
          </div>
        )}
        <p className="text-muted-foreground text-sm">
          {t("wallet.coinsReadyToUse", "Your coins are ready to use on boosts and more.")}
        </p>
        <Button className="w-full" onClick={() => navigate("/wallet")}>
          {t("wallet.viewWallet", "View Wallet")}
        </Button>
      </Card>
    </div>
  );
};

export default CoinsSuccess;

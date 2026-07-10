import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Coins, ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import { usePurchases } from "@/hooks/usePurchases";
import { PRODUCT_IDS } from "@/lib/iap-products";

const PACKS = [
  { id: "pack_5", productId: PRODUCT_IDS.COINS_5, coins: 5, price: "€2.99" },
  { id: "pack_20", productId: PRODUCT_IDS.COINS_20, coins: 20, price: "€8.99" },
  { id: "pack_50", productId: PRODUCT_IDS.COINS_50, coins: 50, price: "€19.99" },
];

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { buyProduct, loading: purchasing } = usePurchases();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<
    { id: string; amount: number; type: string; item: string | null; created_at: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      // Atomic create-if-missing: upsert avoids a unique-constraint violation
      // when two concurrent loads both try to seed the wallet row.
      await supabase
        .from("wallets")
        .upsert({ user_id: user.id, balance: 0 }, { onConflict: "user_id" });
      setBalance(0);
    } else {
      setBalance(data.balance || 0);
    }
    setLoading(false);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallet_transactions")
      .select("id, amount, type, item, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setTransactions(data as typeof transactions);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchWallet();
    fetchTransactions();
  }, [user, navigate, fetchWallet, fetchTransactions]);

  const handleBuyPack = async (productId: (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS]) => {
    await buyProduct(productId);
    // Refresh balance after successful native purchase
    await fetchWallet();
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <WalletIcon className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("wallet.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("wallet.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              {t("common.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("wallet.currentBalance")}</p>
              {loading ? (
                <Skeleton className="h-9 w-32 mt-1" />
              ) : (
                <h2 className="text-3xl font-bold text-foreground">
                  {balance} {t("wallet.coins")}
                </h2>
              )}
            </div>
            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
              <Coins className="h-4 w-4 mr-1" />
              {t("wallet.title")}
            </Badge>
          </div>
        </Card>

        <div className="space-y-3">
          {PACKS.map((pack) => (
            <Card
              key={pack.id}
              className="p-4 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-primary/10/20 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    {pack.coins} {t("wallet.coins")}
                  </div>
                  <div className="text-sm text-muted-foreground">{t("wallet.bestFor")}</div>
                </div>
                <Button disabled={purchasing} onClick={() => handleBuyPack(pack.productId)}>
                  {purchasing ? "..." : pack.price}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Transaction History */}
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full rounded-2xl"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {showHistory ? t("wallet.hideHistory") : t("wallet.showHistory")}
          </Button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  {t("wallet.noTransactions")}
                </p>
              ) : (
                transactions.map((tx) => (
                  <Card key={tx.id} className="p-3 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      {tx.type === "purchase" ? (
                        <ArrowDownCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {tx.type}
                          {tx.item ? ` — ${tx.item}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          {new Date(tx.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${tx.type === "purchase" ? "text-green-600" : "text-primary"}`}
                      >
                        {tx.type === "purchase" ? "+" : "-"}
                        {tx.amount}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Wallet;

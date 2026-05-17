import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, Coins, ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { logger } from "@/lib/logger";

const PACKS = [
  { id: "pack_5", coins: 5, price: "€2.99" },
  { id: "pack_20", coins: 20, price: "€8.99" },
  { id: "pack_50", coins: 50, price: "€19.99" },
];

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
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
      await supabase.from("wallets").insert({ user_id: user.id, balance: 0 });
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

  const buyPack = async (coins: number, packId: string) => {
    if (!user || purchasing) return;
    if (coins <= 0) {
      toast.error("Invalid coin amount");
      return;
    }
    setPurchasing(true);
    try {
      // Try atomic server-side RPC first (run supabase_purchase_coins_rpc.sql to enable)
      const { data: rpcResult, error: rpcError } = (await supabase.rpc("purchase_coins", {
        p_user_id: user.id,
        p_pack_id: packId,
        p_coins: coins,
      })) as { data: { success: boolean; balance: number; error?: string } | null; error: unknown };

      if (!rpcError && rpcResult?.success) {
        analytics.purchase(packId, coins);
        setBalance(rpcResult.balance);
        toast.success(`Added ${coins} coins to your wallet.`);
        return;
      }

      // Fallback: client-side if RPC doesn't exist yet
      if (rpcError && !rpcError.message?.includes("purchase_coins")) throw rpcError;

      const { data: wallet, error: fetchError } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fetchError || !wallet) throw fetchError || new Error("Wallet not found");

      const newBalance = wallet.balance + coins;
      const { error: updateError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({ user_id: user.id, amount: coins, type: "purchase", item: packId });
      if (txError) {
        await supabase.from("wallets").update({ balance: wallet.balance }).eq("user_id", user.id);
        throw txError;
      }

      setBalance(newBalance);
      toast.success(`Added ${coins} coins to your wallet.`);
    } catch (error) {
      logger.error("Wallet purchase error", error);
      toast.error("Failed to update wallet");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <WalletIcon className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
                <p className="text-sm text-muted-foreground">Use coins for boosts & roses</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <h2 className="text-3xl font-bold text-foreground">
                {loading ? "..." : balance} coins
              </h2>
            </div>
            <Badge className="bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white border-none">
              <Coins className="h-4 w-4 mr-1" />
              Wallet
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
                  <div className="text-lg font-semibold">{pack.coins} coins</div>
                  <div className="text-sm text-muted-foreground">Best for roses & boosts</div>
                </div>
                <Button disabled={purchasing} onClick={() => buyPack(pack.coins, pack.id)}>
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
            {showHistory ? "Hide" : "Show"} Transaction History
          </Button>
          {showHistory && (
            <div className="mt-3 space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No transactions yet
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

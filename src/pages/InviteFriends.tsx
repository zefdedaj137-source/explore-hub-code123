import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, ArrowLeft, Gift, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const InviteFriends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitesSent, setInvitesSent] = useState(0);

  const storageKey = useMemo(() => (user ? `invite_stats_${user.id}` : null), [user]);
  const codeKey = useMemo(() => (user ? `invite_code_${user.id}` : null), [user]);

  const inviteCode = useMemo(() => {
    if (!codeKey) return "";
    const existing = localStorage.getItem(codeKey);
    if (existing) return existing;
    const generated = user?.id ? user.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "WELCOME";
    localStorage.setItem(codeKey, generated);
    return generated;
  }, [codeKey, user]);

  const inviteLink = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/invite?code=${inviteCode}`;
  }, [inviteCode]);

  const loadStats = useCallback(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { invitesSent?: number };
      if (parsed?.invitesSent) setInvitesSent(parsed.invitesSent);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveStats = useCallback(
    (count: number) => {
      if (!storageKey) return;
      localStorage.setItem(storageKey, JSON.stringify({ invitesSent: count }));
    },
    [storageKey]
  );

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadStats();
  }, [user, navigate, loadStats]);

  const handleShare = async () => {
    const payload = {
      title: "Join me on Explore Hub",
      text: "Let’s match on Explore Hub! Use my invite code for bonus coins.",
      url: inviteLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        toast.success("Invite link copied.");
      } else {
        toast.info("Copy the link manually.");
      }
      const nextCount = invitesSent + 1;
      setInvitesSent(nextCount);
      saveStats(nextCount);
    } catch (error) {
      logger.error("Share failed", error);
      toast.error("Unable to share invite.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied.");
    } catch (error) {
      logger.error("Copy failed", error);
      toast.error("Unable to copy link.");
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Share2 className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Invite Friends</h1>
                <p className="text-sm text-muted-foreground">Earn bonus coins together</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Gift className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Your invite code</h2>
              <p className="text-sm text-muted-foreground">Share this code for bonus coins</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-border">
            <div>
              <p className="text-xs text-primary uppercase">Invite code</p>
              <p className="text-xl font-bold tracking-widest text-primary">{inviteCode}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Invites sent: <span className="font-semibold text-foreground">{invitesSent}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Button className="w-full" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Invite
            </Button>
            <Button variant="outline" className="w-full" onClick={handleCopy}>
              Copy Invite Link
            </Button>
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default InviteFriends;

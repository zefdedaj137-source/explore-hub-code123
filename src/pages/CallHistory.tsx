import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneCall, PhoneIncoming, PhoneMissed, Video, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface CallSessionRow {
  id: string;
  match_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "voice" | "video";
  status: "initiating" | "ringing" | "active" | "ended" | "declined" | "missed";
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  caller?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  } | null;
  receiver?: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  } | null;
}

const formatDate = (timestamp?: string | null) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (answeredAt?: string | null, endedAt?: string | null) => {
  if (!answeredAt || !endedAt) return "";
  const start = new Date(answeredAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return "";
  const seconds = Math.floor((end - start) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
};

const CallHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallSessionRow[]>([]);

  const fetchCalls = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("call_sessions")
      .select(
        "id, match_id, caller_id, receiver_id, call_type, status, started_at, answered_at, ended_at, caller:profiles!call_sessions_caller_id_fkey (id, full_name, profile_image_url), receiver:profiles!call_sessions_receiver_id_fkey (id, full_name, profile_image_url)"
      )
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) {
      logger.error("Error loading call history:", error);
      toast.error(t("callHistory.failedLoad"));
      return;
    }

    setCalls((data as unknown as CallSessionRow[]) || []);
  }, [user, t]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    fetchCalls().finally(() => setLoading(false));
  }, [user, navigate, fetchCalls]);

  const items = useMemo(() => {
    if (!user) return [];
    return calls.map((call) => {
      const isCaller = call.caller_id === user.id;
      const counterpart = isCaller ? call.receiver : call.caller;
      return {
        ...call,
        isCaller,
        counterpart,
      };
    });
  }, [calls, user]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PhoneCall className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("callHistory.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("callHistory.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {t("common.loading")}
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {t("callHistory.noCalls")}
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((call) => {
              const duration = formatDuration(call.answered_at, call.ended_at);
              return (
                <Card
                  key={call.id}
                  className="p-4 rounded-2xl border border-white/6 shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={call.counterpart?.profile_image_url || "/placeholder.svg"}
                        alt={call.counterpart?.full_name || "Profile"}
                        className="h-14 w-14 rounded-full object-cover ring-1 ring-white/10 ring-offset-1 ring-offset-background"
                      />
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-card/80 border border-white/10 p-1">
                        {call.call_type === "video" ? (
                          <Video className="h-3 w-3 text-primary" />
                        ) : (
                          <PhoneCall className="h-3 w-3 text-primary" />
                        )}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {call.counterpart?.full_name || "Unknown"}
                        </p>
                        {call.isCaller ? (
                          <PhoneIncoming className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <PhoneMissed className="h-4 w-4 text-rose-500" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(call.started_at)}</span>
                        {duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {call.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-white/15 hover:bg-white/8"
                        onClick={() => navigate(`/chat/${call.match_id}`)}
                      >
                        {t("callHistory.openChat")}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default CallHistory;

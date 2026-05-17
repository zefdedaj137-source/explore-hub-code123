import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const AdminAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleBody, setScheduleBody] = useState("");
  const [scheduleUrl, setScheduleUrl] = useState("/notifications");
  const [scheduleUserId, setScheduleUserId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [stats, setStats] = useState({
    profiles: 0,
    matches: 0,
    messages: 0,
    reports: 0,
    dataRequests: 0,
    wallets: 0,
  });

  const checkAdmin = useCallback(async () => {
    if (!user) return false;
    const adminIds = (import.meta.env.VITE_ADMIN_USER_IDS || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);
    const userEmail = (user.email || user.user_metadata?.email || "").toLowerCase().trim();
    if (adminIds.includes(user.id) || (userEmail && adminEmails.includes(userEmail))) return true;
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  }, [user]);

  const loadStats = useCallback(async () => {
    const [profiles, matches, messages, reports, dataRequests, wallets] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }),
      supabase.from("data_requests").select("id", { count: "exact", head: true }),
      supabase.from("wallets").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      profiles: profiles.count || 0,
      matches: matches.count || 0,
      messages: messages.count || 0,
      reports: reports.count || 0,
      dataRequests: dataRequests.count || 0,
      wallets: wallets.count || 0,
    });
  }, []);

  const downloadCsv = (filename: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      toast.info("No rows to export.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const escapeValue = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const str = typeof value === "string" ? value : JSON.stringify(value);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((key) => escapeValue(row[key])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  type ExportTable =
    | "profiles"
    | "matches"
    | "messages"
    | "reports"
    | "data_requests"
    | "wallets"
    | "wallet_transactions"
    | "call_sessions";

  const exportTable = async (table: ExportTable) => {
    setExporting(table);
    try {
      let response = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (response.error && response.error.message?.includes("created_at")) {
        response = await supabase.from(table).select("*").limit(1000);
      }

      if (response.error) throw response.error;
      downloadCsv(`${table}_export.csv`, (response.data as Record<string, unknown>[]) || []);
      toast.success(`Exported ${table}.`);
    } catch (error) {
      logger.error("Export failed:", error);
      toast.error("Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const handleSchedulePush = async () => {
    if (!scheduleTitle || !scheduleBody || !scheduleAt) {
      toast.error("Title, body, and send time are required.");
      return;
    }
    setScheduling(true);
    try {
      const { error } = await supabase.from("scheduled_push_notifications").insert({
        title: scheduleTitle,
        body: scheduleBody,
        url: scheduleUrl || null,
        target_user_id: scheduleUserId || null,
        send_at: new Date(scheduleAt).toISOString(),
      });
      if (error) throw error;
      toast.success("Push scheduled.");
      setScheduleTitle("");
      setScheduleBody("");
      setScheduleUserId("");
      setScheduleAt("");
    } catch (error) {
      logger.error("Schedule push error", error);
      toast.error("Failed to schedule push.");
    } finally {
      setScheduling(false);
    }
  };

  const handleDispatchScheduled = async () => {
    setDispatching(true);
    try {
      const { error } = await supabase.functions.invoke("dispatch-scheduled-push");
      if (error) throw error;
      toast.success("Scheduled pushes dispatched.");
    } catch (error) {
      logger.error("Dispatch scheduled push error", error);
      toast.error("Failed to dispatch scheduled pushes.");
    } finally {
      setDispatching(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkAdmin().then((ok) => {
      setIsAdmin(ok);
      if (ok) loadStats();
    });
  }, [user, navigate, checkAdmin, loadStats]);

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Card className="p-8 text-center">Access denied.</Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-3xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Analytics</h1>
                <p className="text-sm text-muted-foreground">High‑level metrics</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <Card key={key} className="p-6 rounded-2xl border-2 border-border bg-card/80">
              <div className="text-sm uppercase text-muted-foreground">{key}</div>
              <div className="text-3xl font-bold text-foreground mt-2">{value}</div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 p-6 rounded-2xl border-2 border-border bg-card/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Export Data</h2>
              <p className="text-sm text-muted-foreground">Download recent rows (up to 1000)</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                "profiles",
                "matches",
                "messages",
                "reports",
                "data_requests",
                "wallets",
                "wallet_transactions",
                "call_sessions",
              ] as ExportTable[]
            ).map((table) => (
              <Button
                key={table}
                variant="outline"
                className="justify-between"
                onClick={() => exportTable(table)}
                disabled={exporting === table}
              >
                <span className="capitalize">{table.replace(/_/g, " ")}</span>
                {exporting === table ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="mt-6 p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Schedule Push</h2>
            <p className="text-sm text-muted-foreground">Queue a push notification for later</p>
          </div>
          <div className="grid gap-3">
            <input
              className="w-full rounded-md border border-border p-2"
              placeholder="Title"
              aria-label="Push title"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-border p-2"
              placeholder="Body"
              aria-label="Push body"
              value={scheduleBody}
              onChange={(e) => setScheduleBody(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-border p-2"
              placeholder="Target user id (optional)"
              aria-label="Target user id"
              value={scheduleUserId}
              onChange={(e) => setScheduleUserId(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-border p-2"
              placeholder="Target URL (optional)"
              aria-label="Target URL"
              value={scheduleUrl}
              onChange={(e) => setScheduleUrl(e.target.value)}
            />
            <input
              type="datetime-local"
              className="w-full rounded-md border border-border p-2"
              aria-label="Send at"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSchedulePush} disabled={scheduling}>
              {scheduling ? "Scheduling..." : "Schedule Push"}
            </Button>
            <Button variant="outline" onClick={handleDispatchScheduled} disabled={dispatching}>
              {dispatching ? "Dispatching..." : "Dispatch Due Pushes"}
            </Button>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminAnalytics;

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

interface DataRequestRow {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  created_at: string;
}

interface VerificationRequestRow {
  id: string;
  user_id: string;
  status: string;
  selfie_url: string | null;
  id_url: string | null;
  notes: string | null;
  created_at: string;
}

const AdminSafety = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [requests, setRequests] = useState<DataRequestRow[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequestRow[]>([]);

  const checkAdmin = useCallback(async () => {
    if (!user) return false;
    // Check env-var-based admin list first (works without an admin_users table)
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
    // Fallback: check admin_users table
    const { data } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data;
  }, [user]);

  const loadData = useCallback(async () => {
    const [reportsRes, requestsRes, verificationRes] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("data_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setReports((reportsRes.data || []) as ReportRow[]);
    setRequests((requestsRes.data || []) as DataRequestRow[]);
    setVerificationRequests((verificationRes.data || []) as VerificationRequestRow[]);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkAdmin().then((ok) => {
      setIsAdmin(ok);
      if (ok) loadData();
    });
  }, [user, navigate, checkAdmin, loadData]);

  const updateReportStatus = async (id: string, status: string) => {
    await supabase
      .from("reports")
      .update({ status, resolved_at: new Date().toISOString() })
      .eq("id", id);
    loadData();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    await supabase.from("data_requests").update({ status }).eq("id", id);
    loadData();
  };

  const updateVerificationStatus = async (
    id: string,
    userId: string,
    status: "approved" | "rejected"
  ) => {
    await supabase.from("verification_requests").update({ status }).eq("id", id);
    if (status === "approved") {
      await supabase.from("profiles").update({ verified: true }).eq("id", userId);
    }
    loadData();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Card className="p-8 text-center">{t("adminSafety.accessDenied")}</Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-3xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("adminSafety.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("adminSafety.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              {t("adminSafety.back")}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-4 rounded-2xl border-2 border-border bg-card/80">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> {t("adminSafety.reportsTitle")}
            </h2>
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl border border-border bg-gradient-to-br from-card to-background"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{r.reason}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("adminSafety.reporter")}: {r.reporter_id} · {t("adminSafety.reported")}: {r.reported_id}
                      </div>
                    </div>
                    <Badge className="bg-primary text-white border-none">{r.status}</Badge>
                  </div>
                  {r.details && <p className="text-sm text-muted-foreground mt-2">{r.details}</p>}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateReportStatus(r.id, "reviewed")}
                    >
                      {t("adminSafety.markReviewed")}
                    </Button>
                    <Button size="sm" onClick={() => updateReportStatus(r.id, "closed")}>
                      {t("adminSafety.close")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-2 border-border bg-card/80">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> {t("adminSafety.dataRequestsTitle")}
            </h2>
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl border border-border bg-gradient-to-br from-card to-background"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{r.request_type.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">{t("adminSafety.user")}: {r.user_id}</div>
                    </div>
                    <Badge className="bg-primary text-white border-none">{r.status}</Badge>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRequestStatus(r.id, "processing")}
                    >
                      {t("adminSafety.processing")}
                    </Button>
                    <Button size="sm" onClick={() => updateRequestStatus(r.id, "completed")}>
                      {t("adminSafety.complete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl border-2 border-border bg-card/80">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> {t("adminSafety.verificationTitle")}
            </h2>
            <div className="space-y-3">
              {verificationRequests.map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-2xl border border-border bg-gradient-to-br from-card to-background"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{t("adminSafety.user")}: {v.user_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("adminSafety.submitted")}: {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      className={
                        v.status === "approved"
                          ? "bg-green-600 text-white border-none"
                          : v.status === "rejected"
                            ? "bg-destructive text-white border-none"
                            : "bg-yellow-500 text-white border-none"
                      }
                    >
                      {v.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-3 text-sm">
                    {v.selfie_url && (
                      <a
                        className="text-primary hover:underline"
                        href={v.selfie_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("adminSafety.viewSelfie")}
                      </a>
                    )}
                    {v.id_url && (
                      <a
                        className="text-primary hover:underline"
                        href={v.id_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("adminSafety.viewId")}
                      </a>
                    )}
                  </div>
                  {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                  {v.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateVerificationStatus(v.id, v.user_id, "approved")}
                      >
                        {t("adminSafety.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateVerificationStatus(v.id, v.user_id, "rejected")}
                      >
                        {t("adminSafety.reject")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminSafety;

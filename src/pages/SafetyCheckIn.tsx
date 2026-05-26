import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Timer, Phone, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface SafetyCheckInState {
  contactName: string;
  contactPhone: string;
  message: string;
  dueAt: number;
  status: "pending" | "safe" | "missed";
  createdAt: number;
}

const STORAGE_KEY = "safety_checkin";

const SafetyCheckIn = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [activeCheckIn, setActiveCheckIn] = useState<SafetyCheckInState | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveCheckIn(JSON.parse(saved) as SafetyCheckInState);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeCheckIn || activeCheckIn.status !== "pending") return;
    if (now >= activeCheckIn.dueAt) {
      const updated = { ...activeCheckIn, status: "missed" } as SafetyCheckInState;
      setActiveCheckIn(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      toast.error(t("safetyCheckIn.missedCheckIn"));
    }
  }, [activeCheckIn, now, t]);

  const timeLeft = useMemo(() => {
    if (!activeCheckIn) return "";
    const diff = Math.max(0, Math.floor((activeCheckIn.dueAt - now) / 1000));
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [activeCheckIn, now]);

  const startCheckIn = () => {
    if (!contactName || !contactPhone) {
      toast.error(t("safetyCheckIn.addEmergencyContact"));
      return;
    }
    const newCheckIn: SafetyCheckInState = {
      contactName,
      contactPhone,
      message,
      dueAt: Date.now() + minutes * 60 * 1000,
      createdAt: Date.now(),
      status: "pending",
    };
    setActiveCheckIn(newCheckIn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCheckIn));
    toast.success(t("safetyCheckIn.checkInStarted"));
  };

  const markSafe = () => {
    if (!activeCheckIn) return;
    const updated = { ...activeCheckIn, status: "safe" } as SafetyCheckInState;
    setActiveCheckIn(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success(t("safetyCheckIn.checkInConfirmed"));
  };

  const resetCheckIn = () => {
    localStorage.removeItem(STORAGE_KEY);
    setActiveCheckIn(null);
  };

  const shareStatus = async () => {
    if (!activeCheckIn) return;
    const text = `Safety check-in with ${activeCheckIn.contactName}. Status: ${activeCheckIn.status}. Due in ${timeLeft}.`;
    if (navigator.share) {
      try {
        await navigator.share({ text, title: "Safety check-in" });
        toast.success(t("safetyCheckIn.statusShared"));
        return;
      } catch (error) {
        logger.error("Share failed", error);
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success(t("safetyCheckIn.statusCopied"));
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("safetyCheckIn.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("safetyCheckIn.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("safetyCheckIn.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <h2 className="text-lg font-semibold">{t("safetyCheckIn.emergencyContact")}</h2>
          <Input
            placeholder={t("safetyCheckIn.namePlaceholder")}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <Input
            placeholder={t("safetyCheckIn.phonePlaceholder")}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <Textarea
            placeholder={t("safetyCheckIn.notePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </Card>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
          <h2 className="text-lg font-semibold">{t("safetyCheckIn.checkInTimer")}</h2>
          <div className="flex flex-wrap gap-3">
            {[30, 60, 90].map((value) => (
              <Button
                key={value}
                variant={minutes === value ? "default" : "outline"}
                onClick={() => setMinutes(value)}
              >
                {value} min
              </Button>
            ))}
          </div>
          <Button className="w-full" onClick={startCheckIn}>
            <Timer className="h-4 w-4 mr-2" />
            {t("safetyCheckIn.startCheckIn")}
          </Button>
        </Card>

        {activeCheckIn && (
          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("safetyCheckIn.contact")}</p>
                <p className="font-semibold text-foreground">{activeCheckIn.contactName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {activeCheckIn.contactPhone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("safetyCheckIn.timeLeft")}</p>
                <p className="text-lg font-semibold text-primary">{timeLeft}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{t("safetyCheckIn.status")}: {activeCheckIn.status}</p>

            <div className="flex flex-wrap gap-3">
              <Button className="flex-1" onClick={markSafe}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t("safetyCheckIn.imSafe")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={shareStatus}>
                {t("safetyCheckIn.shareStatus")}
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetCheckIn}>
                {t("safetyCheckIn.reset")}
              </Button>
            </div>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default SafetyCheckIn;

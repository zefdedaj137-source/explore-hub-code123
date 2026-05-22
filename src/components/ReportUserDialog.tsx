import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  reportedName?: string | null;
  currentUserId: string;
  context?: string;
}

const ReportUserDialog = ({
  open,
  onOpenChange,
  reportedId,
  reportedName,
  currentUserId,
  context,
}: ReportUserDialogProps) => {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUserId,
        reported_id: reportedId,
        reason,
        details: details ? `[${context || "general"}] ${details}` : context ? `[${context}]` : null,
      });

      if (error) throw error;

      toast.success("Report submitted. Thank you for keeping the community safe.");
      setReason("");
      setDetails("");
      onOpenChange(false);
    } catch (error) {
      logger.error("Report error:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("report.title", { name: reportedName || "user" })}</DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("report.reason")}</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("report.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harassment">{t("report.harassment")}</SelectItem>
                <SelectItem value="fake_profile">{t("report.fakeProfile")}</SelectItem>
                <SelectItem value="spam">{t("report.spam")}</SelectItem>
                <SelectItem value="inappropriate">{t("report.inappropriate")}</SelectItem>
                <SelectItem value="underage">{t("report.underage")}</SelectItem>
                <SelectItem value="other">{t("report.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("report.details")}</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("report.detailsPlaceholder")}
              className="min-h-[110px]"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? t("report.submitting") : t("report.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserDialog;

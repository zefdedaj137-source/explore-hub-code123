import { useState } from "react";
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
          <DialogTitle>Report {reportedName || "user"}</DialogTitle>
          <DialogDescription>
            Reports are reviewed by our safety team. We keep your report confidential.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harassment">Harassment or abuse</SelectItem>
                <SelectItem value="fake_profile">Fake profile</SelectItem>
                <SelectItem value="spam">Spam or scam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="underage">Underage user</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Details (optional)</label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Share details to help our team"
              className="min-h-[110px]"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-[hsl(350,98%,62%)] to-[hsl(15,100%,60%)] text-white"
              disabled={submitting}
              onClick={handleSubmit}
            >
              Submit report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportUserDialog;

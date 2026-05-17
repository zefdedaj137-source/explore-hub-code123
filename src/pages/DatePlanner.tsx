import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface MatchRow {
  id: string;
  user1_id: string;
  user2_id: string;
}

interface ProfileItem {
  id: string;
  full_name: string;
  profile_image_url: string | null;
}

interface DatePlan {
  id: string;
  location: string;
  notes: string | null;
  scheduled_for: string;
  status: string;
  partner_id: string;
  planner_id: string;
}

const DatePlanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileItem>>({});
  const [plans, setPlans] = useState<DatePlan[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const partnerIds = useMemo(() => {
    if (!user) return [] as string[];
    return matches
      .map((match) => (match.user1_id === user.id ? match.user2_id : match.user1_id))
      .filter(Boolean);
  }, [matches, user]);

  const loadMatches = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .limit(200);

    if (error) throw error;
    setMatches((data as MatchRow[]) || []);
  }, [user]);

  const loadProfiles = useCallback(async () => {
    if (!partnerIds.length) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, profile_image_url")
      .in("id", partnerIds);

    if (error) throw error;
    const mapped: Record<string, ProfileItem> = {};
    (data || []).forEach((profile) => {
      mapped[profile.id] = profile as ProfileItem;
    });
    setProfiles(mapped);
  }, [partnerIds]);

  const loadPlans = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("date_plans")
      .select("id, location, notes, scheduled_for, status, partner_id, planner_id")
      .or(`planner_id.eq.${user.id},partner_id.eq.${user.id}`)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (error) throw error;
    setPlans((data as DatePlan[]) || []);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    loadMatches()
      .then(loadPlans)
      .catch((error) => {
        logger.error("Date planner load error", error);
        toast.error("Failed to load date planner.");
      })
      .finally(() => setLoading(false));
  }, [user, navigate, loadMatches, loadPlans]);

  useEffect(() => {
    loadProfiles().catch((error) => {
      logger.error("Profile load error", error);
    });
  }, [loadProfiles]);

  const handleCreatePlan = async () => {
    if (!user) return;
    if (!selectedPartner || !dateTime || !location) {
      toast.error("Please complete all required fields.");
      return;
    }

    try {
      // Check for an existing active plan with this partner
      const { data: existingPlans } = await supabase
        .from("date_plans")
        .select("id, status, scheduled_for")
        .or(
          `and(planner_id.eq.${user.id},partner_id.eq.${selectedPartner}),and(planner_id.eq.${selectedPartner},partner_id.eq.${user.id})`
        )
        .in("status", ["proposed", "confirmed"])
        .gte("scheduled_for", new Date().toISOString())
        .limit(1);

      if (existingPlans && existingPlans.length > 0) {
        toast.error(
          "You already have an active date plan with this person. Cancel it or wait for it to pass before creating a new one."
        );
        return;
      }

      const match = matches.find(
        (m) =>
          (m.user1_id === user.id && m.user2_id === selectedPartner) ||
          (m.user2_id === user.id && m.user1_id === selectedPartner)
      );

      const { error } = await supabase.from("date_plans").insert({
        match_id: match?.id || null,
        planner_id: user.id,
        partner_id: selectedPartner,
        scheduled_for: new Date(dateTime).toISOString(),
        location,
        notes: notes || null,
      });

      if (error) throw error;

      // Send chat message to notify the partner
      const formattedDate = new Date(dateTime).toLocaleString();
      const chatMessage = `📅 I planned a date!\n📍 ${location}\n🕐 ${formattedDate}${notes ? `\n📝 ${notes}` : ""}\n\nCheck your Date Planner to accept!`;

      if (match?.id) {
        const { error: msgError } = await supabase.from("messages").insert({
          match_id: match.id,
          sender_id: user.id,
          receiver_id: selectedPartner,
          content: chatMessage,
        });
        if (msgError) {
          logger.warn("Message with receiver_id failed:", msgError.message);
          const { error: msgError2 } = await supabase.from("messages").insert({
            match_id: match.id,
            sender_id: user.id,
            content: chatMessage,
          });
          if (msgError2) {
            logger.error("Message fallback also failed:", msgError2.message);
            toast.error("Date created but failed to notify in chat.");
          }
        }
      } else {
        logger.warn("No match found for partner, cannot send chat notification.");
        toast.error("Date created but couldn't send chat notification — no match found.");
      }

      toast.success("Date plan created & partner notified in chat!");
      setSelectedPartner("");
      setDateTime("");
      setLocation("");
      setNotes("");
      loadPlans();
    } catch (error) {
      logger.error("Create plan error", error);
      toast.error("Failed to create date plan.");
    }
  };

  const handleUpdateStatus = async (planId: string, status: string) => {
    if (!user) return;
    const { error } = await supabase.from("date_plans").update({ status }).eq("id", planId);
    if (error) {
      logger.error("Update plan status error", error);
      toast.error("Failed to update plan status.");
      return;
    }

    const plan = plans.find((p) => p.id === planId);
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, status } : p)));

    // Send chat notification when accepted or declined
    if (plan) {
      const otherUserId = plan.planner_id === user.id ? plan.partner_id : plan.planner_id;
      const match = matches.find(
        (m) =>
          (m.user1_id === user.id && m.user2_id === otherUserId) ||
          (m.user2_id === user.id && m.user1_id === otherUserId)
      );
      if (match) {
        const formattedDate = new Date(plan.scheduled_for).toLocaleString();
        let chatMessage = "";
        if (status === "confirmed") {
          chatMessage = `✅ Date accepted!\n📍 ${plan.location}\n🕐 ${formattedDate}\n\nIt's a date! 🎉`;
        } else if (status === "canceled") {
          chatMessage = `❌ Date declined.\n📍 ${plan.location}\n🕐 ${formattedDate}`;
        }
        if (chatMessage) {
          const { error: msgError } = await supabase.from("messages").insert({
            match_id: match.id,
            sender_id: user.id,
            receiver_id: otherUserId,
            content: chatMessage,
          });
          if (msgError) {
            await supabase.from("messages").insert({
              match_id: match.id,
              sender_id: user.id,
              content: chatMessage,
            });
          }
        }
      }
    }

    toast.success("Plan updated.");
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Calendar className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Date Planner</h1>
                <p className="text-sm text-muted-foreground">Plan safe meetups with matches</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">Loading...</Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4">
              <h2 className="text-lg font-semibold">Create a plan</h2>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a match" />
                </SelectTrigger>
                <SelectContent>
                  {partnerIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {profiles[id]?.full_name || "Match"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
              <Input
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <Button className="w-full" onClick={handleCreatePlan}>
                Create plan
              </Button>
            </Card>

            <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
              <h2 className="text-lg font-semibold mb-3">Upcoming plans</h2>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans yet.</p>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-start justify-between gap-4 border-b border-primary/20 pb-3 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {profiles[plan.partner_id]?.full_name || "Match"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {plan.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(plan.scheduled_for).toLocaleString()}
                        </p>
                        {plan.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{plan.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs uppercase text-primary">{plan.status}</span>
                        {plan.status === "proposed" && user?.id === plan.partner_id && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(plan.id, "confirmed")}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(plan.id, "canceled")}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                        {user?.id === plan.planner_id &&
                          plan.status !== "canceled" &&
                          plan.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(plan.id, "canceled")}
                            >
                              Cancel
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default DatePlanner;

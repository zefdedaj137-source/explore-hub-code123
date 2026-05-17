import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, MapPin } from "lucide-react";
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

interface DoubleDatePlan {
  id: string;
  location: string;
  notes: string | null;
  scheduled_for: string;
  status: string;
  partner1_id: string;
  partner2_id: string;
}

const DoubleDatePlanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileItem>>({});
  const [plans, setPlans] = useState<DoubleDatePlan[]>([]);
  const [partner1, setPartner1] = useState("");
  const [partner2, setPartner2] = useState("");
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
      .from("double_date_plans")
      .select("id, location, notes, scheduled_for, status, partner1_id, partner2_id")
      .or(`planner_id.eq.${user.id},partner1_id.eq.${user.id},partner2_id.eq.${user.id}`)
      .order("scheduled_for", { ascending: true })
      .limit(50);
    if (error) throw error;
    setPlans((data as DoubleDatePlan[]) || []);
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
        logger.error("Double date load error", error);
        toast.error("Failed to load double date planner.");
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
    if (!partner1 || !partner2 || !dateTime || !location) {
      toast.error("Please complete all required fields.");
      return;
    }
    if (partner1 === partner2) {
      toast.error("Choose two different matches.");
      return;
    }

    try {
      const { error } = await supabase.from("double_date_plans").insert({
        planner_id: user.id,
        partner1_id: partner1,
        partner2_id: partner2,
        scheduled_for: new Date(dateTime).toISOString(),
        location,
        notes: notes || null,
      });
      if (error) throw error;

      // Send chat messages to notify both partners
      const formattedDate = new Date(dateTime).toLocaleString();
      const chatMessage = `📅 Double date planned!\n📍 ${location}\n🕐 ${formattedDate}${notes ? `\n📝 ${notes}` : ""}\n\nCheck your Double Date Planner for details!`;

      for (const partnerId of [partner1, partner2]) {
        const match = matches.find(
          (m) =>
            (m.user1_id === user.id && m.user2_id === partnerId) ||
            (m.user2_id === user.id && m.user1_id === partnerId)
        );
        if (match) {
          const { error: msgError } = await supabase.from("messages").insert({
            match_id: match.id,
            sender_id: user.id,
            receiver_id: partnerId,
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
            }
          }
        }
      }

      toast.success("Double date plan created & partners notified in chat!");
      setPartner1("");
      setPartner2("");
      setDateTime("");
      setLocation("");
      setNotes("");
      loadPlans();
    } catch (error) {
      logger.error("Create double date error", error);
      toast.error("Failed to create double date plan.");
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Double Date Planner</h1>
                <p className="text-sm text-muted-foreground">Plan a double date with two matches</p>
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
              <h2 className="text-lg font-semibold">Create a double date</h2>
              <Select value={partner1} onValueChange={setPartner1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first match" />
                </SelectTrigger>
                <SelectContent>
                  {partnerIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {profiles[id]?.full_name || "Match"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={partner2} onValueChange={setPartner2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second match" />
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
                Create double date
              </Button>
            </Card>

            <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
              <h2 className="text-lg font-semibold mb-3">Upcoming double dates</h2>
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
                          {profiles[plan.partner1_id]?.full_name || "Match"} &{" "}
                          {profiles[plan.partner2_id]?.full_name || "Match"}
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
                      <span className="text-xs uppercase text-primary">{plan.status}</span>
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

export default DoubleDatePlanner;

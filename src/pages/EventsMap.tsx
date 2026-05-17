import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string;
  scheduled_for: string;
  capacity: number | null;
}

const pinPositions = [
  "left-[10%] top-[15%]",
  "left-[25%] top-[30%]",
  "left-[40%] top-[20%]",
  "left-[55%] top-[35%]",
  "left-[70%] top-[25%]",
  "left-[80%] top-[45%]",
  "left-[60%] top-[60%]",
  "left-[35%] top-[55%]",
  "left-[15%] top-[70%]",
  "left-[50%] top-[75%]",
  "left-[75%] top-[75%]",
];

const hashToIndex = (value: string) => {
  const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % pinPositions.length;
};

const EventsMap = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, string>>({});
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, location, scheduled_for, capacity")
      .order("scheduled_for", { ascending: true })
      .limit(50);
    if (error) throw error;
    setEvents((data as EventRow[]) || []);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadEvents()
      .catch((error) => {
        logger.error("Events map load error", error);
        toast.error("Failed to load events.");
      })
      .finally(() => setLoading(false));
  }, [loadEvents]);

  useEffect(() => {
    if (!user || events.length === 0) return;
    const loadRsvps = async () => {
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .eq("user_id", user.id)
        .in(
          "event_id",
          events.map((event) => event.id)
        );
      if (error) throw error;
      const mapped: Record<string, string> = {};
      (data || []).forEach((row) => {
        mapped[row.event_id] = row.status;
      });
      setRsvpStatus(mapped);
    };

    loadRsvps().catch((error) => logger.error("RSVP load error", error));
  }, [events, user]);

  const handleRsvp = async (eventId: string, status: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const { error } = await supabase
      .from("event_rsvps")
      .upsert({ event_id: eventId, user_id: user.id, status });
    if (error) {
      logger.error("RSVP update error", error);
      toast.error("Failed to update RSVP.");
      return;
    }
    setRsvpStatus((prev) => ({ ...prev, [eventId]: status }));
    toast.success("RSVP updated.");
  };

  const handleCheckIn = async (eventId: string, file: File) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setCheckingInId(eventId);
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/checkin-${eventId}-${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("event-checkins")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("event-checkins").getPublicUrl(data.path);

      const { error: insertError } = await supabase.from("event_checkins").insert({
        event_id: eventId,
        user_id: user.id,
        photo_url: urlData.publicUrl,
      });
      if (insertError) throw insertError;

      toast.success("Check-in posted.");
    } catch (error) {
      logger.error("Check-in failed", error);
      toast.error("Failed to post check-in.");
    } finally {
      setCheckingInId(null);
    }
  };

  const mapPins = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        positionClass: pinPositions[hashToIndex(event.id)],
      })),
    [events]
  );

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4 space-y-6">
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <MapPin className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Events Map</h1>
                <p className="text-sm text-muted-foreground">See upcoming meetups at a glance</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
          <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-muted to-muted border border-border overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Map preview (pin positions are illustrative)
            </div>
            {mapPins.map((pin) => (
              <button
                key={pin.id}
                className={`absolute w-4 h-4 rounded-full bg-primary shadow-lg border-2 border-card ${pin.positionClass}`}
                aria-label="Event pin"
              />
            ))}
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">Loading...</Card>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">No events yet.</Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.scheduled_for).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={rsvpStatus[event.id] === "going" ? "default" : "outline"}
                        onClick={() => handleRsvp(event.id, "going")}
                      >
                        Going
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus[event.id] === "interested" ? "default" : "outline"}
                        onClick={() => handleRsvp(event.id, "interested")}
                      >
                        Interested
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus[event.id] === "not_going" ? "default" : "outline"}
                        onClick={() => handleRsvp(event.id, "not_going")}
                      >
                        Not going
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Input
                        type="file"
                        accept="image/*"
                        className="w-full"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCheckIn(event.id, file);
                        }}
                        disabled={checkingInId === event.id}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {checkingInId === event.id
                          ? "Uploading check-in..."
                          : "Upload a check-in photo"}
                      </p>
                    </div>
                  </div>
                  {event.capacity && (
                    <span className="text-xs uppercase text-primary">
                      Capacity {event.capacity}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button variant="outline" className="w-full" onClick={() => navigate("/events")}>
          <CalendarDays className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

export default EventsMap;

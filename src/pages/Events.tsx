import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string;
  scheduled_for: string;
  capacity: number | null;
  host_id: string;
}

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, string>>({});
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("scheduled_for", { ascending: true })
      .limit(50);
    if (error) throw error;
    setEvents((data as EventRow[]) || []);
  }, []);

  const loadRsvps = useCallback(
    async (eventIds: string[]) => {
      if (!user || eventIds.length === 0) return;
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .eq("user_id", user.id)
        .in("event_id", eventIds);
      if (error) throw error;
      const mapped: Record<string, string> = {};
      (data || []).forEach((row) => {
        mapped[row.event_id] = row.status;
      });
      setRsvpStatus(mapped);
    },
    [user]
  );

  useEffect(() => {
    setLoading(true);
    loadEvents()
      .catch((error) => {
        logger.error("Events load error", error);
        toast.error(t("events.failedLoadEvents"));
      })
      .finally(() => setLoading(false));
  }, [loadEvents, t]);

  useEffect(() => {
    if (!events.length) return;
    loadRsvps(events.map((event) => event.id)).catch((error) => {
      logger.error("RSVP load error", error);
    });
  }, [events, loadRsvps]);

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
      toast.error(t("events.failedRsvp"));
      return;
    }
    setRsvpStatus((prev) => ({ ...prev, [eventId]: status }));
    toast.success(t("events.rsvpUpdated"));
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

      toast.success(t("events.checkInPosted"));
    } catch (error) {
      logger.error("Check-in failed", error);
      toast.error(t("events.checkInFailed"));
    } finally {
      setCheckingInId(null);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!title || !location || !scheduledFor) {
      toast.error(t("events.requiredFields"));
      return;
    }

    try {
      const { error } = await supabase.from("events").insert({
        host_id: user.id,
        title,
        description: description || null,
        location,
        scheduled_for: new Date(scheduledFor).toISOString(),
        capacity: capacity ? parseInt(capacity, 10) : null,
      });
      if (error) throw error;
      toast.success(t("events.eventCreated"));
      setTitle("");
      setDescription("");
      setLocation("");
      setScheduledFor("");
      setCapacity("");
      loadEvents();
    } catch (error) {
      logger.error("Create event error", error);
      toast.error(t("events.eventCreateFailed"));
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("events.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("events.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => navigate("/events-map")}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t("events.map")}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("events.back")}
              </Button>
            </div>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-card/80 space-y-4 mb-6">
          <h2 className="text-lg font-semibold">{t("events.createEvent")}</h2>
          <Input placeholder={t("events.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder={t("events.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Input
            placeholder={t("events.locationPlaceholder")}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
          <Input
            placeholder={t("events.capacityPlaceholder")}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <Button className="w-full" onClick={handleCreate}>
            {t("events.createEventBtn")}
          </Button>
        </Card>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">{t("events.loading")}</Card>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">{t("events.noEvents")}</Card>
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
                        {t("events.going")}
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus[event.id] === "interested" ? "default" : "outline"}
                        onClick={() => handleRsvp(event.id, "interested")}
                      >
                        {t("events.interested")}
                      </Button>
                      <Button
                        size="sm"
                        variant={rsvpStatus[event.id] === "not_going" ? "default" : "outline"}
                        onClick={() => handleRsvp(event.id, "not_going")}
                      >
                        {t("events.notGoing")}
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
                          ? t("events.uploadingCheckIn")
                          : t("events.uploadCheckIn")}
                      </p>
                    </div>
                  </div>
                  {event.capacity && (
                    <span className="text-xs uppercase text-primary">
                    {t("events.capacity", { n: event.capacity })}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Events;

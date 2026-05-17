import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  Ghost,
  Star,
  Video,
  Camera,
  Music2,
  Smile,
  Music,
  Zap,
  Share2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

const SettingsSection = ({ icon: Icon, title, description, onClick }: SettingsSectionProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
  >
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  </button>
);

const Features = () => {
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dating: true,
    extras: true,
    rewards: true,
  });
  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-dvh bg-background pb-20">
      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 py-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Features</h1>
        </div>

        {/* Dating */}
        <Card className="shadow-elegant">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => toggleSection("dating")}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dating
              <ChevronDown
                className={`h-4 w-4 ml-auto transition-transform ${expandedSections.dating ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
          {expandedSections.dating && (
            <CardContent className="space-y-2">
              <SettingsSection
                icon={Calendar}
                title="Plan a Date"
                description="Schedule meetups with matches"
                onClick={() => navigate("/date-planner")}
              />

              <SettingsSection
                icon={Ghost}
                title="Ghost Alerts"
                description="Nudge matches who haven't replied"
                onClick={() => navigate("/ghost-alerts")}
              />
            </CardContent>
          )}
        </Card>

        {/* Profile & Extras */}
        <Card className="shadow-elegant">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => toggleSection("extras")}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5" />
              Profile & Extras
              <ChevronDown
                className={`h-4 w-4 ml-auto transition-transform ${expandedSections.extras ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
          {expandedSections.extras && (
            <CardContent className="space-y-2">
              <SettingsSection
                icon={Video}
                title="Video Intro"
                description="Add a short intro video"
                onClick={() => navigate("/video-intro")}
              />
              <SettingsSection
                icon={Camera}
                title="Photo Verification Selfie"
                description="Selfie pose challenge to verify"
                onClick={() => navigate("/photo-verification")}
              />
              <SettingsSection
                icon={Music2}
                title="Profile Soundtrack"
                description="Attach a song to your profile"
                onClick={() => navigate("/profile-soundtrack")}
              />
              <SettingsSection
                icon={Smile}
                title="Daily Mood"
                description="Set your mood emoji & status"
                onClick={() => navigate("/mood-status")}
              />
              <SettingsSection
                icon={Music}
                title="Music Taste"
                description="Share your top artists & genres"
                onClick={() => navigate("/music-taste")}
              />
            </CardContent>
          )}
        </Card>

        {/* Rewards & Boosts */}
        <Card className="shadow-elegant">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => toggleSection("rewards")}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rewards & Boosts
              <ChevronDown
                className={`h-4 w-4 ml-auto transition-transform ${expandedSections.rewards ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
          {expandedSections.rewards && (
            <CardContent className="space-y-2">
              <SettingsSection
                icon={CalendarCheck}
                title="Daily Rewards"
                description="Claim free coins every day"
                onClick={() => navigate("/rewards")}
              />
              <SettingsSection
                icon={Zap}
                title="Limited-Time Boosts"
                description="Discounted boost bundles"
                onClick={() => navigate("/boost-bundles")}
              />
              <SettingsSection
                icon={Share2}
                title="Invite Friends"
                description="Share your invite code"
                onClick={() => navigate("/invite")}
              />
            </CardContent>
          )}
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Features;

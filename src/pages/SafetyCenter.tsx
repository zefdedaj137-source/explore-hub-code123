import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, PhoneCall, FileText, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const SafetyCenter = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Safety Center</h1>
                <p className="text-sm text-muted-foreground">Your safety is our priority</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Report & Block
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              If someone makes you uncomfortable, you can report or block them from any profile or
              chat.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate("/settings")}>
                Open Safety Settings
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/discover")}>
                Go to Discover
              </Button>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Meet Safely
            </h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-5">
              <li>Meet in public places and tell a friend your plan.</li>
              <li>Video chat before meeting in person.</li>
              <li>Trust your instincts and end the date if you feel unsafe.</li>
            </ul>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              Emergency Help
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              If you are in immediate danger, contact your local emergency services.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open("https://www.112.eu/", "_blank", "noopener,noreferrer")}
            >
              Find Emergency Numbers
            </Button>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Policies
            </h2>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/terms")}>
                Terms
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/privacy")}>
                Privacy
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SafetyCenter;

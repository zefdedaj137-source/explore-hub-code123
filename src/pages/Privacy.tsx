import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Lock className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-sm text-muted-foreground">Last updated: Jan 31, 2026</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-4 text-sm text-foreground">
          <p>
            We collect the information you provide to deliver the service, including profile
            details, photos, messages, and usage data.
          </p>
          <p>
            We use this data to show matches, improve safety, and personalize your experience. You
            can request a copy of your data or delete your account at any time.
          </p>
          <p>
            We do not sell your personal data. Some data may be shared with trusted vendors for
            hosting, analytics, and customer support.
          </p>
          <p>For more details or requests, visit the Data Controls section in Settings.</p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Privacy;

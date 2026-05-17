import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Phone, MapPin, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const SafetyTips = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Safety Tips</h1>
                <p className="text-sm text-muted-foreground">Meet safely and confidently</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">Meet in public places</h2>
                <p className="text-sm text-muted-foreground">
                  Choose a busy, well-lit location and arrange your own transportation.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">Keep chats in-app</h2>
                <p className="text-sm text-muted-foreground">
                  Maintain conversations inside Explore Hub until you feel comfortable.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">Share your plans</h2>
                <p className="text-sm text-muted-foreground">
                  Tell a friend where you’re going and when you expect to be back.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-2 border-border bg-card/80">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-primary mt-1" />
              <div>
                <h2 className="text-lg font-semibold">Report anything suspicious</h2>
                <p className="text-sm text-muted-foreground">
                  Use the report option to alert our team about inappropriate behavior.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SafetyTips;

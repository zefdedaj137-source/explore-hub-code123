import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
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
            Welcome to Shqiponja. By using our services you agree to these Terms. You must be at
            least 18 years old to use the platform.
          </p>
          <p>
            You are responsible for your content and interactions. Prohibited content includes
            harassment, hate, nudity, impersonation, and illegal activity.
          </p>
          <p>
            We reserve the right to remove content, suspend accounts, or take other actions to keep
            the community safe.
          </p>
          <p>
            Subscriptions renew automatically unless canceled. You can manage billing in your
            account settings.
          </p>
          <p>For support, contact us via the Help Center in Settings.</p>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Terms;

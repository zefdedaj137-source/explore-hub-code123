import { useNavigate } from "react-router-dom";
import { LifeBuoy, Mail, Shield, FileText, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const SUPPORT_EMAIL = "support@shqiponjat.xyz";
const RESPONSE_TIME = "within 24 hours";

type Faq = {
  question: string;
  answer: string;
};

const FAQS: Faq[] = [
  {
    question: "How do I report a user or objectionable content?",
    answer:
      "Open the profile or chat, tap the menu, and choose Report. We review every report and act on objectionable content — including removing it and banning offending users — within 24 hours. You can also block any user from the same menu.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Go to Settings, scroll to Account Management, and choose Delete Account. This permanently removes your profile and associated data.",
  },
  {
    question: "How do I manage or cancel a subscription?",
    answer:
      "Subscriptions are billed through the Apple App Store. Manage or cancel them in your device Settings under your Apple ID → Subscriptions. Deleting the app does not cancel a subscription.",
  },
  {
    question: "How do I restore my purchases?",
    answer:
      "Go to Settings → Help & Legal → Restore Purchases to restore premium or coins on a new device.",
  },
  {
    question: "I have a safety concern. What should I do?",
    answer:
      "Your safety is our priority. Report and block the user in the app, and email us at the address below. If you are in immediate danger, contact your local emergency services.",
  },
];

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <LifeBuoy className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Support</h1>
                <p className="text-sm text-muted-foreground">We&apos;re here to help</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              Back
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-6 text-sm text-foreground">
          {/* Contact */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Contact us</h2>
            <p className="text-muted-foreground leading-relaxed">
              Need help or want to report a problem? Email our support team and we&apos;ll get back
              to you {RESPONSE_TIME}.
            </p>
            <Button
              className="w-full sm:w-auto rounded-full"
              onClick={() => {
                window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Shqiponja%20Support`;
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              {SUPPORT_EMAIL}
            </Button>
          </section>

          {/* Frequently asked */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Frequently asked questions</h2>
            {FAQS.map((faq) => (
              <div key={faq.question} className="space-y-1">
                <h3 className="font-medium text-foreground">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </section>

          {/* Safety & policies */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Safety &amp; policies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We have zero tolerance for objectionable content or abusive behavior. Learn more in
              our policies:
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate("/safety")}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Shield className="h-4 w-4" />
                Safety Center
              </button>
              <button
                type="button"
                onClick={() => navigate("/terms")}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                Terms of Use (EULA)
              </button>
              <button
                type="button"
                onClick={() => navigate("/privacy")}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Lock className="h-4 w-4" />
                Privacy Policy
              </button>
            </div>
          </section>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Support;

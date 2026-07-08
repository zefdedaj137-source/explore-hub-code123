import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const LAST_UPDATED = "July 2, 2026";
const SUPPORT_EMAIL = "support@shqiponjat.xyz";

type Section = {
  heading: string;
  body: (string | string[])[];
};

const SECTIONS: Section[] = [
  {
    heading: "1. Acceptance of These Terms",
    body: [
      'Welcome to Shqiponja ("we", "us", "our"). These Terms of Service ("Terms") form a binding agreement between you and Shqiponja and govern your use of the Shqiponja application and related services (the "Service"). By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Service.',
    ],
  },
  {
    heading: "2. Eligibility",
    body: [
      "You must be at least 18 years old to use the Service. By using it, you represent that you are 18 or older, that you can form a binding contract, and that you are not barred from using the Service under any applicable law.",
    ],
  },
  {
    heading: "3. Your Account",
    body: [
      "You are responsible for the information you provide and for keeping your login credentials secure. You agree to provide accurate information, not to impersonate anyone, and not to create an account on behalf of someone else. You are responsible for all activity that occurs under your account.",
    ],
  },
  {
    heading: "4. Community Rules & Objectionable Content",
    body: [
      "We have zero tolerance for objectionable content or abusive behavior. By using the Service, you agree that you will NOT post, send, or share content that:",
      [
        "is harassing, threatening, bullying, or promotes violence;",
        "is hateful or discriminatory toward any person or group;",
        "is sexually explicit, pornographic, or contains nudity;",
        "depicts or promotes the sexual exploitation or abuse of minors;",
        "is illegal, fraudulent, deceptive, or promotes illegal activity;",
        "impersonates another person or misrepresents your identity or age;",
        "contains spam, scams, solicitation, or commercial advertising;",
        "infringes anyone's intellectual property or privacy rights.",
      ],
      "You are solely responsible for the content you create and the interactions you have with other users.",
    ],
  },
  {
    heading: "5. Reporting, Blocking & Enforcement",
    body: [
      "You can report objectionable content or abusive users, and block any user, directly within the app. We review reports of objectionable content and will act on them — including removing content and suspending or terminating the offending account — within 24 hours.",
      "We reserve the right, but are not obligated, to review content and to remove content, restrict features, or suspend or terminate accounts that violate these Terms, without notice and at our sole discretion.",
    ],
  },
  {
    heading: "6. Safety",
    body: [
      "Your safety matters. We do not conduct criminal background checks on users, and we cannot guarantee the conduct of any user. Always exercise caution when interacting with others, never send money to people you meet, and meet in public places. You interact with other users at your own risk.",
    ],
  },
  {
    heading: "7. Purchases, Subscriptions & Virtual Items",
    body: [
      "The Service offers in-app purchases and auto-renewing subscriptions (such as premium, coins, superlikes, and boosts). Prices are shown in the app before purchase.",
      "Purchases are processed by the Apple App Store and, where applicable, our payment providers. Subscriptions automatically renew for the same period unless you cancel at least 24 hours before the end of the current period. You manage and cancel subscriptions in your device's account settings; deleting the app does not cancel a subscription.",
      "Virtual items and coins have no monetary value, are non-transferable, and are non-refundable except where required by law or by the App Store's refund policy. Refund requests for App Store purchases are handled by Apple.",
    ],
  },
  {
    heading: "8. License",
    body: [
      "We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for your personal, non-commercial use, subject to these Terms. You may not copy, modify, distribute, reverse-engineer, or create derivative works of the Service, or use it to build a competing product.",
    ],
  },
  {
    heading: "9. Your Content",
    body: [
      "You retain ownership of the content you submit. You grant us a worldwide, non-exclusive, royalty-free license to host, store, display, and use your content solely to operate and provide the Service. This license ends when you delete your content or your account, except for content already shared with others or that we must retain for legal reasons.",
    ],
  },
  {
    heading: "10. Termination & Account Deletion",
    body: [
      "You may stop using the Service and permanently delete your account at any time from Settings → Delete Account. We may suspend or terminate your access if you violate these Terms or if required for safety, security, or legal reasons.",
    ],
  },
  {
    heading: "11. Disclaimers",
    body: [
      'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including fitness for a particular purpose and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free, or that you will find a match.',
    ],
  },
  {
    heading: "12. Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, Shqiponja will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of the Service or your interactions with other users.",
    ],
  },
  {
    heading: "13. Apple App Store",
    body: [
      "These Terms are between you and Shqiponja, not Apple. Apple has no obligation to provide support for the Service. If the app fails to conform to any applicable warranty, you may notify Apple for a refund of the purchase price where applicable; to the maximum extent permitted by law, Apple has no other warranty obligation. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you.",
    ],
  },
  {
    heading: "14. Changes to These Terms",
    body: [
      'We may update these Terms from time to time. When we make material changes, we will update the "Last updated" date and, where appropriate, notify you in the app. Your continued use of the Service after changes take effect means you accept the updated Terms.',
    ],
  },
  {
    heading: "15. Contact Us",
    body: [
      `Questions about these Terms? Contact us at ${SUPPORT_EMAIL} or use the Help Center in Settings.`,
    ],
  },
];

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("terms.title")}</h1>
                <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              {t("terms.back")}
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-border bg-gradient-to-br from-card to-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-6 text-sm text-foreground">
          {SECTIONS.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
              {section.body.map((block, i) =>
                Array.isArray(block) ? (
                  <ul key={i} className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {block.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i} className="text-muted-foreground leading-relaxed">
                    {block}
                  </p>
                )
              )}
            </section>
          ))}
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Terms;

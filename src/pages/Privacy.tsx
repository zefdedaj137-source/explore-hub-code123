import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTranslation } from "react-i18next";

const LAST_UPDATED = "July 8, 2026";
const CONTACT_EMAIL = "privacy@shqiponja.app";
const SUPPORT_EMAIL = "support@shqiponjat.xyz";

type Section = {
  heading: string;
  body: (string | string[])[];
};

const SECTIONS: Section[] = [
  {
    heading: "1. Who We Are",
    body: [
      'Shqiponja ("we", "us", "our") operates the Shqiponja dating application and related services (the "Service"). This Privacy Policy explains what personal data we collect, how we use it, who we share it with, and the rights you have over your information.',
      "By creating an account or using the Service, you agree to the practices described in this policy.",
    ],
  },
  {
    heading: "2. Age Requirement",
    body: [
      "The Service is intended only for people who are 18 years of age or older. We do not knowingly collect personal data from anyone under 18. If we learn that we have collected information from a person under 18, we will delete that account and data promptly.",
    ],
  },
  {
    heading: "3. Information We Collect",
    body: [
      "Account information: your email address and authentication identifiers when you sign up, including via Apple or Google Sign-In.",
      "Profile information: the details you choose to add, such as your name, date of birth, gender, photos, bio, interests, prompts, and preferences.",
      "Photos, audio and video: images you upload, voice messages you record, and audio/video shared during in-app calls.",
      "Messages and interactions: the messages, reactions, likes, matches, and other activity you create on the Service.",
      "Location data: your approximate or precise location, when you grant permission, so we can show you people nearby and enable travel features.",
      "Purchase data: records of in-app purchases and subscriptions (coins, superlikes, boosts, premium). Payments are processed by Apple, and by RevenueCat and Stripe; we do not receive or store your full card number.",
      "Usage and device data: app activity, device type, operating system, app version, and diagnostic or crash information used to keep the Service reliable and secure.",
      "Push notification tokens: identifiers used to deliver notifications you have enabled.",
    ],
  },
  {
    heading: "4. Device Permissions",
    body: [
      "We only access the following after you grant permission, and you can revoke access at any time in your device settings:",
      [
        "Camera — to take profile photos and for video calls.",
        "Microphone — for voice messages and audio/video calls.",
        "Photo library — to upload and save photos.",
        "Location — to show you nearby people and enable location-based features.",
      ],
    ],
  },
  {
    heading: "5. How We Use Your Information",
    body: [
      "We use your information to: create and manage your account; show and rank potential matches; enable messaging, calls, and other features; process purchases and subscriptions; keep the community safe and detect fraud or abuse; provide customer support; send notifications you have enabled; and improve and secure the Service.",
    ],
  },
  {
    heading: "6. How We Share Your Information",
    body: [
      "With other users: the profile details, photos, and content you choose to make visible are shown to other users as part of normal use of a dating service.",
      "With service providers who process data on our behalf, including:",
      [
        "Supabase — database, authentication, storage, and hosting.",
        "Apple / Google — sign-in and, for Apple, in-app purchase processing.",
        "RevenueCat and Stripe — purchase and subscription management and payment processing.",
        "Push notification providers — to deliver notifications.",
      ],
      "For legal and safety reasons: we may disclose information when required by law, to enforce our Terms, or to protect the rights, safety, and security of our users and the public.",
      "We do not sell your personal data.",
    ],
  },
  {
    heading: "7. Legal Bases for Processing",
    body: [
      "Where the GDPR or similar laws apply, we process your data on the following bases: performance of our contract with you (to provide the Service), your consent (for example, location and notifications), our legitimate interests (safety, fraud prevention, and improving the Service), and compliance with legal obligations.",
    ],
  },
  {
    heading: "8. Data Retention",
    body: [
      "We keep your personal data for as long as your account is active. When you delete your account, we permanently remove your profile, photos, messages, matches, likes, purchase records, and other personal data associated with your account, except where we are required to retain limited information to comply with legal, tax, or fraud-prevention obligations.",
    ],
  },
  {
    heading: "9. Your Rights and Choices",
    body: [
      "You can access and update most of your information directly in the app.",
      "Delete your account: you can permanently delete your account and associated data at any time from Settings → Delete Account. Deletion is immediate and irreversible.",
      "Data export: you can request a copy of your data from the Data Controls section in Settings.",
      "Deactivate: you may temporarily deactivate your account instead of deleting it.",
      "Permissions: you can turn camera, microphone, photo, location, and notification access on or off in your device settings.",
      "Depending on where you live, you may also have rights to object to or restrict certain processing. Contact us to exercise these rights.",
    ],
  },
  {
    heading: "10. Data Security",
    body: [
      "We use technical and organizational measures, including encryption in transit and access controls, to protect your information. No method of transmission or storage is completely secure, but we work to protect your data and to notify you and the authorities of a breach where required by law.",
    ],
  },
  {
    heading: "11. International Transfers",
    body: [
      "Your information may be processed and stored in countries other than your own, including by the service providers listed above. Where required, we rely on appropriate safeguards for such transfers.",
    ],
  },
  {
    heading: "12. Children",
    body: [
      "The Service is not directed to children. We do not knowingly collect data from anyone under 18. See Section 2.",
    ],
  },
  {
    heading: "13. Changes to This Policy",
    body: [
      'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date and, where appropriate, notify you in the app. Your continued use of the Service after changes take effect means you accept the updated policy.',
    ],
  },
  {
    heading: "14. Contact Us",
    body: [
      `If you have questions or requests regarding this Privacy Policy or your data, contact us at ${CONTACT_EMAIL}. For general support, contact ${SUPPORT_EMAIL} or use the Help Center in Settings.`,
    ],
  },
];

const Privacy = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Lock className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{t("privacy.title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("privacy.lastUpdated")} {LAST_UPDATED}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              {t("privacy.back")}
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

export default Privacy;

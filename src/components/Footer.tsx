import { Heart, Instagram, Facebook, Twitter } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-6 w-6 text-primary fill-primary" />
              <span className="text-xl font-bold">Shqiponja</span>
            </div>
            <p className="text-secondary-foreground/70 text-sm">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.aboutUs")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.careers")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.press")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.blog")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.support")}</h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.helpCenter")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.safetyTips")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.contactUs")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.faq")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer.legal")}</h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.privacyPolicy")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.termsOfService")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.cookiePolicy")}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-secondary-foreground/70">
            {t("footer.copyright")}
          </p>

          <div className="flex items-center gap-4">
            <a href="#" aria-label="Instagram" className="text-secondary-foreground/70 hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
            <a href="#" aria-label="Facebook" className="text-secondary-foreground/70 hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
            <a href="#" aria-label="Twitter" className="text-secondary-foreground/70 hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

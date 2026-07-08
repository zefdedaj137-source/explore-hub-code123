import { useNavigate } from "react-router-dom";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import albanianEagle from "@/assets/albanian-eagle.png";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "sq", label: "Shqip" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pl", label: "Polski" },
  { code: "pt", label: "Português" },
] as const;

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentCode = i18n.language?.split("-")[0] ?? "en";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate("/")}
        >
          <img
            src={albanianEagle}
            alt="Albanian Eagle"
            className="h-7 w-7 opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <span className="text-xl font-bold font-serif bg-gradient-to-r from-[hsl(350,65%,65%)] to-[hsl(38,55%,62%)] bg-clip-text text-transparent tracking-wide">
            Shqiponja
          </span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium tracking-wide"
          >
            {t("nav.features")}
          </a>
          <a
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium tracking-wide"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="#premium"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium tracking-wide"
          >
            {t("nav.premium")}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground font-medium text-sm gap-1.5"
                aria-label={t("nav.language", "Language")}
              >
                <Globe className="h-4 w-4" />
                <span className="uppercase">{currentCode}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={currentCode === lang.code ? "font-semibold" : ""}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground font-medium text-sm"
            onClick={() => navigate("/auth")}
          >
            {t("nav.signIn")}
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            className="rounded-full px-5 bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white border-0 shadow-[0_4px_14px_hsl(350,65%,60%,0.3)] hover:brightness-110 transition-all duration-200"
          >
            {t("nav.getStarted")}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

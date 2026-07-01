import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Users, Globe, ArrowRight, Sparkles, MapPin, Shield } from "lucide-react";
import albanianEagle from "@/assets/albanian-eagle.png";
import heroCouple from "@/assets/hero-couple.jpg";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section
      className="relative min-h-dvh flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #fff5f5 0%, #fff 40%, #fff8f0 100%)" }}
    >
      {/* ── Animated orb background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full animate-float opacity-30 orb-rose" />
        <div className="absolute -bottom-48 -right-24 w-[800px] h-[800px] rounded-full animate-float-slow opacity-20 orb-purple" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-40 orb-gold" />
      </div>

      {/* ── Noise grain ── */}
      <div className="absolute inset-0 opacity-[0.012] pointer-events-none bg-noise-overlay" />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ── Left: Content ── */}
          <div className="space-y-8 text-center lg:text-left animate-fade-in">
            {/* Live badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-rose-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#e8274b]" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e8274b]" />
              </span>
              <img src={albanianEagle} alt="" role="presentation" className="w-5 h-5 opacity-80" />
              <span className="text-sm font-semibold tracking-widest uppercase text-rose-500">
                {t("hero.premiumDating")}
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-6xl md:text-[82px] font-bold leading-[0.88] tracking-tight font-serif">
                <span className="block text-gray-900">{t("hero.findYour")}</span>
                <span className="block text-gradient-fire animate-gradient-x">
                  {t("hero.dashuri")}
                </span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed max-w-md font-light text-gray-500">
                {t("hero.tagline")}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="group relative overflow-hidden text-white border-0 text-base px-8 py-6 rounded-2xl font-semibold transition-all hover:scale-105 hover:opacity-90 btn-rose-hero"
              >
                <Heart className="mr-2 h-5 w-5 fill-current" />
                {t("hero.startJourney")}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() =>
                  document.getElementById("nearby")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-base px-8 py-6 rounded-2xl font-semibold transition-all hover:scale-105 bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200"
              >
                {t("hero.exploreProfiles")}
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { icon: Users, value: "50K+", label: t("hero.members") },
                { icon: Heart, value: "5K+", label: t("hero.couples") },
                { icon: Globe, value: "70+", label: t("hero.countries") },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100"
                >
                  <Icon className="h-4 w-4 mx-auto mb-1.5 text-rose-400" />
                  <div className="text-2xl font-bold text-gradient-gold">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest mt-0.5 text-gray-400">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Image ── */}
          <div className="relative animate-scale-in hidden lg:block">
            {/* Glow halo */}
            <div className="absolute inset-4 rounded-3xl blur-3xl opacity-20 glow-halo-rose" />

            {/* Main image card */}
            <div className="relative rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.15)]">
              <img
                src={heroCouple}
                alt="Happy Albanian Couple"
                className="w-full h-auto object-cover aspect-[3/4]"
              />
              {/* Dark vignette */}
              <div className="absolute inset-0 overlay-bottom-dark" />

              {/* Quote glass card */}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl p-4 glass-dark">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#e8274b] to-[#ff6b35]">
                    <Heart className="w-4 h-4 fill-white text-white" />
                  </div>
                  <div>
                    <p className="text-sm italic leading-relaxed text-white/[0.82]">
                      "{t("hero.testimonialQuote")}"
                    </p>
                    <p className="text-xs mt-1 text-white/[0.38]">{t("hero.testimonialAuthor")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge – verified */}
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-float-slow shadow-lg border border-gray-100">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-gray-700">
                {t("hero.verifiedProfiles")}
              </span>
            </div>

            {/* Floating badge – nearby */}
            <div className="absolute top-1/2 -left-6 bg-white rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-float shadow-lg border border-gray-100">
              <MapPin className="w-4 h-4 text-[#e8274b]" />
              <span className="text-sm font-semibold text-gray-700">{t("hero.nearYou")}</span>
            </div>

            {/* Floating badge – premium */}
            <div className="absolute bottom-40 -right-5 bg-white rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg border border-gray-100">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-gray-700">
                {t("hero.premiumMatches")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient rule */}
      <div className="absolute bottom-0 left-0 right-0 h-px divider-rose" />
    </section>
  );
};

export default Hero;

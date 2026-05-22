import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Users, Globe, ArrowRight, Sparkles, MapPin, Shield } from "lucide-react";
import albanianEagle from "@/assets/albanian-eagle.png";
import heroCouple from "@/assets/hero-couple.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-dvh flex items-center justify-center overflow-hidden page-bg">
      {/* ── Animated orb background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full animate-float opacity-60 orb-rose" />
        <div className="absolute -bottom-48 -right-24 w-[800px] h-[800px] rounded-full animate-float-slow opacity-50 orb-purple" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full orb-gold" />
      </div>

      {/* ── Subtle grid ── */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-grid-overlay" />

      {/* ── Noise grain ── */}
      <div className="absolute inset-0 opacity-[0.018] pointer-events-none bg-noise-overlay" />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ── Left: Content ── */}
          <div className="space-y-8 text-center lg:text-left animate-fade-in">
            {/* Live badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#e8274b]" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e8274b]" />
              </span>
              <img src={albanianEagle} alt="" role="presentation" className="w-5 h-5 opacity-80" />
              <span className="text-sm font-semibold tracking-widest uppercase text-white/70">
                Premium Albanian Dating
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-6xl md:text-[82px] font-bold leading-[0.88] tracking-tight font-serif">
                <span className="block text-white/95">Find Your</span>
                <span className="block text-gradient-fire animate-gradient-x">Dashuri</span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed max-w-md font-light text-white/[0.42]">
                Where Albanian hearts connect across the world. Authentic connections, real stories,
                lasting love.
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
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() =>
                  document.getElementById("nearby")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-base px-8 py-6 rounded-2xl font-semibold transition-all hover:scale-105 bg-white/[0.06] border border-white/[0.12] text-white/75"
              >
                Explore Profiles
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { icon: Users, value: "50K+", label: "Members" },
                { icon: Heart, value: "5K+", label: "Couples" },
                { icon: Globe, value: "70+", label: "Countries" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="glass-card rounded-2xl p-4 text-center">
                  <Icon className="h-4 w-4 mx-auto mb-1.5 text-amber-400/70" />
                  <div className="text-2xl font-bold text-gradient-gold">{value}</div>
                  <div className="text-[10px] uppercase tracking-widest mt-0.5 text-white/35">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Image ── */}
          <div className="relative animate-scale-in hidden lg:block">
            {/* Glow halo */}
            <div className="absolute inset-4 rounded-3xl blur-3xl opacity-30 glow-halo-rose" />

            {/* Main image card */}
            <div className="relative rounded-3xl overflow-hidden hero-image-frame">
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
                      "Found my perfect match here. Forever grateful! 🇦🇱"
                    </p>
                    <p className="text-xs mt-1 text-white/[0.38]">— Lora &amp; Ardit, New York</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge – verified */}
            <div className="absolute -top-4 -right-4 glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-float-slow shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-white/85">Verified Profiles</span>
            </div>

            {/* Floating badge – nearby */}
            <div className="absolute top-1/2 -left-6 glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-float shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <MapPin className="w-4 h-4 text-[#e8274b]" />
              <span className="text-sm font-semibold text-white/85">Near You</span>
            </div>

            {/* Floating badge – premium */}
            <div className="absolute bottom-40 -right-5 glass-strong rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-white/85">Premium Matches</span>
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

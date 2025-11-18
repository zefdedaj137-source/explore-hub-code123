import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Heart, Users, Globe } from "lucide-react";
import albanianEagle from "@/assets/albanian-eagle.png";
import heroCouple from "@/assets/hero-couple.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-luxury">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-eagle rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-eagle rounded-full blur-3xl animate-pulse-delayed" />
      </div>

      {/* Albanian Eagle Watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 w-[600px] h-[600px]">
        <img 
          src={albanianEagle} 
          alt="Albanian Eagle" 
          className="w-full h-full object-contain animate-pulse-slow"
        />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 text-center lg:text-left animate-fade-in">
            {/* Eagle Icon Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-primary border-2 border-accent/30 shadow-glow backdrop-blur-sm">
              <img src={albanianEagle} alt="Eagle" className="w-8 h-8" />
              <span className="text-sm font-bold text-primary-foreground tracking-wider uppercase">
                Premium Albanian Dating
              </span>
            </div>

            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-gold">
                Dashuri
              </span>
              <br />
              <span className="text-foreground">
                me Vlerë
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl">
              Connect with sophisticated Albanian singles worldwide. Where heritage meets modern romance.
            </p>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button 
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-elegant text-lg px-10 py-6 rounded-xl border-2 border-accent/20 transition-all hover:shadow-glow hover:scale-105"
              >
                <Heart className="mr-2 h-6 w-6 fill-current" />
                Start Your Journey
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('nearby')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-primary/50 text-foreground hover:bg-primary/10 text-lg px-10 py-6 rounded-xl backdrop-blur-sm transition-all hover:shadow-elegant hover:scale-105"
              >
                Find Nearby
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/30">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-accent mr-2" />
                  <div className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-gold">
                    50K+
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="h-5 w-5 text-accent mr-2" />
                  <div className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-gold">
                    5K+
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Success Stories</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Globe className="h-5 w-5 text-accent mr-2" />
                  <div className="text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-gold">
                    70+
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Countries</div>
              </div>
            </div>
          </div>

          {/* Right Column - Image */}
          <div className="relative animate-scale-in">
            <div className="absolute inset-0 bg-gradient-eagle rounded-3xl blur-2xl opacity-30" />
            <div className="relative rounded-3xl overflow-hidden shadow-luxury border-4 border-accent/20">
              <img 
                src={heroCouple} 
                alt="Happy Albanian Couple" 
                className="w-full h-auto object-cover aspect-[3/4]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="bg-card/80 backdrop-blur-md rounded-2xl p-6 border border-accent/30 shadow-elegant">
                  <p className="text-foreground font-serif text-lg italic">
                    "Found my perfect match through Shqiponja. Forever grateful! 🇦🇱❤️"
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">- Lora & Ardit, New York</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary" />
    </section>
  );
};

export default Hero;

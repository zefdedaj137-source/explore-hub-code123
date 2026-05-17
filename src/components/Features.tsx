import { Heart, Shield, Globe, Crown, MessageCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Heart,
    title: "Cultural Compatibility",
    description: "Connect with people who share your Albanian heritage and values",
  },
  {
    icon: Shield,
    title: "Verified Profiles",
    description: "All members are verified for authenticity and safety",
  },
  {
    icon: Globe,
    title: "Global Diaspora",
    description: "Meet Albanian singles across 50+ countries worldwide",
  },
  {
    icon: Crown,
    title: "Premium Experience",
    description: "Sophisticated matching algorithm for quality connections",
  },
  {
    icon: MessageCircle,
    title: "Smart Messaging",
    description: "Ice breakers and conversation starters based on shared interests",
  },
  {
    icon: Sparkles,
    title: "Exclusive Events",
    description: "Access to premium Albanian community events and gatherings",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Premium Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to find meaningful connections within the Albanian community
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="p-8 hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 border-border bg-card animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

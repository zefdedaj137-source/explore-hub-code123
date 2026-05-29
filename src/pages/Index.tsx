import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import RadarNearby from "@/components/RadarNearby";
import BrowseProfiles from "@/components/BrowseProfiles";
import DatingGames from "@/components/DatingGames";
import DatingIdeas from "@/components/DatingIdeas";
import LoveStories from "@/components/LoveStories";
import Premium from "@/components/Premium";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <Hero />
      <RadarNearby />
      <Features />
      <BrowseProfiles />
      <LoveStories />
      <DatingGames />
      <DatingIdeas />
      <Premium />
      <Footer />
    </div>
  );
};

export default Index;

import ProfileCard from "./ProfileCard";

const profiles = [
  {
    name: "Elona",
    age: 27,
    location: "London, UK",
    bio: "Albanian-British professional passionate about culture, travel, and good food. Looking for meaningful connections.",
    interests: ["Travel", "Cooking", "Photography"],
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80",
  },
  {
    name: "Liridona",
    age: 26,
    location: "Berlin, Germany",
    bio: "Artist and designer celebrating Albanian heritage through contemporary art. Always up for museum visits!",
    interests: ["Art", "Design", "Culture"],
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80",
  },
];

const BrowseProfiles = () => {
  return (
    <section className="py-24 bg-[hsl(0,50%,8%)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Meet Your Matches</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover Albanian singles who share your values and aspirations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {profiles.map((profile, index) => (
            <div key={profile.name} className={`animate-scale-in-${Math.min(index + 1, 3)}`}>
              <ProfileCard {...profile} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrowseProfiles;

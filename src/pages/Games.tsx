import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DatingGames from "@/components/DatingGames";
import BottomNav from "@/components/BottomNav";

const Games = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-gradient-subtle pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-subtle/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Dating Games</h1>
        </div>
      </div>

      {/* Challenge Component */}
      <DatingGames />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Games;

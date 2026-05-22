import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import albanianEagle from "@/assets/albanian-eagle.png";

const Navbar = () => {
  const navigate = useNavigate();

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
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium tracking-wide"
          >
            How It Works
          </a>
          <a
            href="#premium"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium tracking-wide"
          >
            Premium
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground font-medium text-sm"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            className="rounded-full px-5 bg-gradient-to-r from-[hsl(350,65%,60%)] to-[hsl(18,72%,55%)] text-white border-0 shadow-[0_4px_14px_hsl(350,65%,60%,0.3)] hover:brightness-110 transition-all duration-200"
          >
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import albanianEagle from "@/assets/albanian-eagle.png";

const Navbar = () => {
  const navigate = useNavigate();
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <img src={albanianEagle} alt="Albanian Eagle" className="h-8 w-8" />
          <span className="text-2xl font-serif font-bold text-foreground">Shqiponja</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-foreground hover:text-primary transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">
            How It Works
          </a>
          <a href="#premium" className="text-foreground hover:text-primary transition-colors">
            Premium
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="text-foreground hover:text-primary"
            onClick={() => navigate("/auth")}
          >
            Sign In
          </Button>
          <Button 
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-elegant"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

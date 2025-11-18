import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search } from "lucide-react";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Track 404 errors in production for monitoring
    if (import.meta.env.PROD) {
      // TODO: Send to error tracking service
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-serif font-bold text-primary mb-2">404</h1>
          <p className="text-2xl font-semibold mb-2">Page Not Found</p>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 bg-gradient-primary text-primary-foreground"
          >
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button
            onClick={() => navigate("/discover")}
            variant="outline"
            className="flex-1"
          >
            <Search className="h-4 w-4 mr-2" />
            Discover
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;

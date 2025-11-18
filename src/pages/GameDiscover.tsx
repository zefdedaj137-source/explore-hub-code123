import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2 } from "lucide-react";

const GameDiscover = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to game lobby
    navigate('/game-lobby', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Gamepad2 className="h-16 w-16 text-pink-500 animate-pulse mx-auto mb-4" />
        <p className="text-lg text-gray-600">Redirecting to game lobby...</p>
      </div>
    </div>
  );
};

export default GameDiscover;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const GameDiscover = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Redirect to game lobby
    navigate("/game-lobby", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="text-center">
        <Gamepad2 className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">{t("gameDiscover.redirecting")}</p>
      </div>
    </div>
  );
};

export default GameDiscover;

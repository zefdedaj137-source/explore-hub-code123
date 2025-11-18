import { Plane } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TravelModeBadgeProps {
  travelCity?: string | null;
  size?: "sm" | "md";
}

export const TravelModeBadge = ({ travelCity, size = "md" }: TravelModeBadgeProps) => {
  if (!travelCity) return null;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 text-blue-500 ${textSize}`}>
            <Plane className={iconSize} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>✈️ Traveling in {travelCity}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

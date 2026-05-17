import { useRef, useEffect } from "react";

interface ProgressBarProps {
  percent: number;
  className?: string;
  trackClassName?: string;
}

const ProgressBar = ({
  percent,
  className = "bg-primary h-2 rounded-full transition-all",
  trackClassName = "bg-muted rounded-full h-2",
}: ProgressBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      barRef.current.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }, [percent]);

  return (
    <div className={trackClassName}>
      <div ref={barRef} className={className} />
    </div>
  );
};

export default ProgressBar;

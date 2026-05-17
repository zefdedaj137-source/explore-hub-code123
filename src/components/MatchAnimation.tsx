import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X, Flower2 } from "lucide-react";
import { Button } from "./ui/button";
import roseBouquet from "@/assets/rose-bouquet.png";
import albanianEagle from "@/assets/albanian-eagle.png";

interface MatchAnimationProps {
  show: boolean;
  matchName: string;
  onComplete: () => void;
  isPremiumRoses?: boolean;
}

export const MatchAnimation = ({
  show,
  matchName,
  onComplete,
  isPremiumRoses = false,
}: MatchAnimationProps) => {
  const [phase, setPhase] = useState<"eagle" | "transform" | "heart">("eagle");

  useEffect(() => {
    if (!show) {
      setPhase("eagle");
      return;
    }

    // Play different music based on match type
    const audio = new Audio();
    if (isPremiumRoses) {
      // Romantic instrumental for Premium Roses
      audio.src = "/love-instrumental.mp3";
      audio.volume = 0.7;
      audio.currentTime = 0;
    } else {
      // Valle music for regular matches
      audio.src = "/valle-music.mp3";
      audio.volume = 0.6;
      audio.currentTime = 3; // Start at 3 seconds
    }

    audio.play().catch(() => {
      // Audio playback failed - browser may have autoplay restrictions
    });

    // Stop audio at appropriate time
    const stopAudioTimer = setTimeout(() => {
      audio.pause();
    }, 7000);

    // Animation sequence - 7 seconds total
    const timer1 = setTimeout(() => setPhase("transform"), 1500);
    const timer2 = setTimeout(() => setPhase("heart"), 3000);
    const timer3 = setTimeout(() => {
      onComplete();
      setPhase("eagle");
    }, 7000);

    return () => {
      audio.pause();
      clearTimeout(stopAudioTimer);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [show, onComplete, isPremiumRoses]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/80 backdrop-blur-sm"
          onClick={onComplete}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onComplete}
            className="absolute top-4 right-4 z-50 text-white hover:text-red-400 hover:bg-card/10"
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Particle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                  opacity: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                  repeatDelay: Math.random() * 1,
                }}
                className="absolute"
              >
                {isPremiumRoses ? (
                  <Flower2 className="h-6 w-6 text-red-500" />
                ) : (
                  <Sparkles className="h-4 w-4 text-accent" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Main animation container */}
          <div
            className="relative flex flex-col items-center gap-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Conditional animation: Roses for Premium, Eagle for Regular */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.2, 1],
                rotate: phase === "transform" ? [0, 360] : 0,
              }}
              transition={{ duration: 0.8 }}
            >
              {/* Glow effect - less intense for transparent roses */}
              <motion.div
                className={`absolute inset-0 rounded-full blur-3xl ${isPremiumRoses ? "bg-red-500/20" : "bg-accent/30"}`}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />

              {isPremiumRoses ? (
                // Premium Roses Animation - Beautiful Rose Bouquet
                <AnimatePresence mode="wait">
                  {phase === "eagle" && (
                    <motion.div
                      key="roses-initial"
                      initial={{ scale: 0, opacity: 0, rotate: -30 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        rotate: 0,
                      }}
                      exit={{ scale: 0, opacity: 0, rotate: 30 }}
                      transition={{ duration: 0.8, type: "spring" }}
                      className="relative z-10 flex items-center justify-center"
                    >
                      <img
                        src={roseBouquet}
                        alt="Premium Rose Bouquet"
                        className="w-64 h-64 object-contain drop-shadow-[0_20px_40px_rgba(220,38,38,0.5)]"
                      />
                    </motion.div>
                  )}

                  {/* Transformation phase - roses spinning */}
                  {phase === "transform" && (
                    <motion.div
                      key="roses-transform"
                      className="relative z-10"
                      animate={{
                        rotate: 360,
                        scale: [1, 1.2, 1],
                      }}
                      transition={{ duration: 0.8 }}
                    >
                      <motion.img
                        src={roseBouquet}
                        alt="Premium Rose Bouquet"
                        className="w-64 h-64 object-contain drop-shadow-[0_20px_40px_rgba(220,38,38,0.5)]"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8 }}
                      />
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ opacity: [0, 1] }}
                        transition={{ duration: 0.8 }}
                      >
                        <Heart className="w-48 h-48 text-red-500 fill-red-500 drop-shadow-card" />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Heart phase with roses */}
                  {phase === "heart" && (
                    <motion.div
                      key="roses-heart"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: [0.8, 1.2, 1],
                        opacity: 1,
                      }}
                      transition={{ duration: 0.5 }}
                      className="relative z-10"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                        }}
                        className="relative"
                      >
                        <Heart className="w-48 h-48 text-red-500 fill-red-500 drop-shadow-card" />
                        {/* Small roses around heart */}
                        <Flower2 className="w-12 h-12 text-red-600 fill-red-600 absolute -top-4 -left-4 animate-pulse" />
                        <Flower2 className="w-12 h-12 text-red-600 fill-red-600 absolute -top-4 -right-4 animate-pulse" />
                        <Flower2 className="w-12 h-12 text-red-600 fill-red-600 absolute -bottom-4 left-1/2 -translate-x-1/2 animate-pulse" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                // Regular Match Animation - Albanian Eagle
                <AnimatePresence mode="wait">
                  {phase === "eagle" && (
                    <motion.div
                      key="eagle"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative z-10"
                    >
                      <img
                        src={albanianEagle}
                        alt="Albanian Eagle"
                        className="w-48 h-48 object-contain drop-shadow-card"
                      />
                    </motion.div>
                  )}

                  {/* Transformation phase - both eagle and heart */}
                  {phase === "transform" && (
                    <motion.div
                      key="transform"
                      className="relative z-10"
                      animate={{
                        rotate: 360,
                      }}
                      transition={{ duration: 0.8 }}
                    >
                      <motion.img
                        src={albanianEagle}
                        alt="Albanian Eagle"
                        className="absolute inset-0 w-48 h-48 object-contain"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8 }}
                      />
                      <motion.div
                        className="w-48 h-48 flex items-center justify-center"
                        animate={{ opacity: [0, 1] }}
                        transition={{ duration: 0.8 }}
                      >
                        <Heart className="w-32 h-32 text-red-500 fill-red-500 drop-shadow-card" />
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Heart phase */}
                  {phase === "heart" && (
                    <motion.div
                      key="heart"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{
                        scale: [0.8, 1.2, 1],
                        opacity: 1,
                      }}
                      transition={{ duration: 0.5 }}
                      className="relative z-10"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                        }}
                      >
                        <Heart className="w-48 h-48 text-red-500 fill-red-500 drop-shadow-card" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Match text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center space-y-2"
            >
              <motion.h2
                className="text-5xl font-bold text-foreground"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                }}
              >
                {isPremiumRoses ? "💐 Premium Roses Match! 🌹" : "It's a Match! 🎉"}
              </motion.h2>
              <motion.p
                className="text-xl text-white/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {isPremiumRoses
                  ? `You sent Premium Roses to ${matchName}!`
                  : `You and ${matchName} liked each other!`}
              </motion.p>
            </motion.div>

            {/* Confetti-like hearts and roses */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={`confetti-${i}`}
                  initial={{
                    x: "50%",
                    y: "50%",
                    scale: 0,
                    opacity: 0,
                  }}
                  animate={{
                    x: `${30 + Math.random() * 40}%`,
                    y: `${20 + Math.random() * 60}%`,
                    scale: [0, 1, 0.8],
                    opacity: [0, 1, 0],
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 2,
                    delay: 1 + Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                >
                  {isPremiumRoses ? (
                    <Flower2 className="w-8 h-8 text-red-500 fill-red-500" />
                  ) : (
                    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

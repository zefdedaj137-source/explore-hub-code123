import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X, Flower2 } from "lucide-react";
import { Button } from "./ui/button";
import roseBouquet from "@/assets/rose-bouquet.png";
import albanianEagle from "@/assets/albanian-eagle.png";
import { useTranslation } from "react-i18next";

interface MatchAnimationProps {
  show: boolean;
  matchName: string;
  onComplete: () => void;
  isPremiumRoses?: boolean;
  onChatNow?: (opener?: string) => void;
  sharedInterests?: string[];
}

// Generate culturally-relevant Albanian icebreakers, optionally personalised by shared interests
function getIcebreakers(matchName: string, sharedInterests: string[]): string[] {
  const name = matchName.split(" ")[0];
  const starters: string[] = [];

  // Interest-based openers (first priority)
  if (sharedInterests.length > 0) {
    const interest = sharedInterests[0];
    starters.push(`You're into ${interest} too? What's your favourite?`);
  }
  if (sharedInterests.length > 1) {
    starters.push(`We both like ${sharedInterests[1]}! Tell me more about that 😊`);
  }

  // Cultural Albanian openers
  starters.push(
    `Tungjatjeta ${name}! Nga je? 🇦🇱`,
    `Okay, important question: byrek me mish or byrek me spinaq?`,
    `If you could travel anywhere in Albania tomorrow, where would you go?`,
    `${name}, what's your go-to song when you're in a good mood?`,
    `Tea or coffee person? ☕`
  );

  // Return 3 unique starters
  return starters.slice(0, 3);
}

export const MatchAnimation = ({
  show,
  matchName,
  onComplete,
  isPremiumRoses = false,
  onChatNow,
  sharedInterests = [],
}: MatchAnimationProps) => {
  const [phase, setPhase] = useState<"eagle" | "transform" | "heart">("eagle");
  const { t } = useTranslation();

  const icebreakers = getIcebreakers(matchName, sharedInterests);

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
                        alt={t("discover.premiumRoseBouquet")}
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
                        alt={t("discover.premiumRoseBouquet")}
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
                        alt={t("common.albanianEagle")}
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
                        alt={t("common.albanianEagle")}
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
                {isPremiumRoses ? t("discover.premiumRosesMatch") : t("discover.itsAMatch")}
              </motion.h2>
              <motion.p
                className="text-xl text-white/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {isPremiumRoses
                  ? t("discover.premiumRosesMsg", { name: matchName })
                  : t("discover.matchMsg", { name: matchName })}
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
            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="flex flex-col gap-3 w-72"
            >
              {/* InstantChat openers */}
              {onChatNow && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50 text-center font-medium uppercase tracking-wider">
                    {t("matchAnimation.breakTheIce")}
                  </p>
                  {icebreakers.map((opener, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChatNow(opener);
                      }}
                      className="w-full text-left text-sm px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 border border-white/10 hover:border-white/20 transition-all"
                    >
                      {opener}
                    </button>
                  ))}
                </div>
              )}
              {onChatNow && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChatNow();
                  }}
                  className="w-full bg-white text-primary font-bold text-base py-6 rounded-2xl shadow-lg hover:bg-white/90"
                >
                  💬 {t("discover.startChatting")}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-2xl"
              >
                {t("discover.keepSwiping")}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

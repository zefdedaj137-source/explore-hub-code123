import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Gamepad2,
  Send,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Zap,
  Share2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import ProgressBar from "@/components/ProgressBar";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const GAMES = [
  {
    id: "would-you-rather",
    name: "Would You Rather",
    emoji: "🤔",
    description: "Choose between two options — see if you think alike!",
    color: "from-primary to-primary",
    questions: [
      { a: "Travel the world for a year", b: "Get your dream home" },
      { a: "Always speak your mind", b: "Always know what others think" },
      { a: "Go to the mountains", b: "Go to the beach" },
      { a: "Cook a meal together", b: "Go to a fancy restaurant" },
      { a: "Rewatch your favorite movie forever", b: "Only watch new movies" },
      { a: "Have a dog", b: "Have a cat" },
      { a: "Time travel to the past", b: "Time travel to the future" },
      { a: "Live in a big city", b: "Live in a small town" },
      { a: "Have unlimited money", b: "Have unlimited time" },
      { a: "Be able to fly", b: "Be able to teleport" },
    ],
  },
  {
    id: "this-or-that",
    name: "This or That",
    emoji: "⚡",
    description: "Quick-fire choices to discover each other's preferences!",
    color: "from-orange-500 to-red-600",
    questions: [
      { a: "Coffee ☕", b: "Tea 🍵" },
      { a: "Morning person 🌅", b: "Night owl 🦉" },
      { a: "Sweet 🍰", b: "Savory 🧀" },
      { a: "Books 📚", b: "Movies 🎬" },
      { a: "Texting 💬", b: "Calling 📞" },
      { a: "Summer ☀️", b: "Winter ❄️" },
      { a: "Introvert 🏠", b: "Extrovert 🎉" },
      { a: "Pizza 🍕", b: "Sushi 🍣" },
      { a: "Spotify 🎵", b: "Apple Music 🎶" },
      { a: "Instagram 📸", b: "TikTok 🎵" },
    ],
  },
  {
    id: "finish-the-sentence",
    name: "Finish the Sentence",
    emoji: "✏️",
    description: "Complete the sentence and compare answers!",
    color: "from-primary to-emerald-600",
    prompts: [
      "My perfect Sunday involves...",
      "I can't live without...",
      "My hidden talent is...",
      "The way to my heart is...",
      "In 5 years, I want to be...",
      "I get most excited about...",
      "My biggest fear is...",
      "I feel most alive when...",
      "The best gift I ever received was...",
      "If I won the lottery, I would...",
    ],
  },
  {
    id: "hot-takes",
    name: "Hot Takes",
    emoji: "🔥",
    description: "Share your unpopular opinions — agree or disagree?",
    color: "from-red-500 to-pink-600",
    statements: [
      "Pineapple belongs on pizza",
      "The book is always better than the movie",
      "Breakfast for dinner is the best meal",
      "Long-distance relationships can work",
      "You should text back immediately, not play games",
      "Couple matching outfits are cute, not cringe",
      "First dates should always be coffee, not dinner",
      "Social media makes relationships harder",
      "It's okay to go to the movies alone",
      "Pets are better than kids",
    ],
  },
];

interface GameSession {
  gameId: string;
  currentRound: number;
  myAnswers: string[];
}

const IcebreakerGames = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("match");
  const matchName = searchParams.get("name") || "Your Match";

  const [selectedGame, setSelectedGame] = useState<(typeof GAMES)[0] | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState(false);

  const startGame = (game: (typeof GAMES)[0]) => {
    setSelectedGame(game);
    setSession({ gameId: game.id, currentRound: 0, myAnswers: [] });
    setCompleted(false);
    setAnswer("");
  };

  const submitAnswer = (choice: string) => {
    if (!session || !selectedGame) return;

    const questions = (selectedGame as { questions?: { a: string; b: string }[] }).questions;
    const prompts = (selectedGame as { prompts?: string[] }).prompts;
    const statements = (selectedGame as { statements?: string[] }).statements;
    const totalRounds = Math.min(
      questions?.length || prompts?.length || statements?.length || 10,
      5
    );

    const newAnswers = [...session.myAnswers, choice];

    if (session.currentRound + 1 >= totalRounds) {
      setSession({ ...session, myAnswers: newAnswers, currentRound: session.currentRound + 1 });
      setCompleted(true);
    } else {
      setSession({ ...session, myAnswers: newAnswers, currentRound: session.currentRound + 1 });
      setAnswer("");
    }
  };

  const shareResults = async () => {
    if (!session || !selectedGame) return;

    const questions = (selectedGame as { questions?: { a: string; b: string }[] }).questions;
    const prompts = (selectedGame as { prompts?: string[] }).prompts;
    const statements = (selectedGame as { statements?: string[] }).statements;

    let text = `🎮 My ${selectedGame.name} answers:\n\n`;
    session.myAnswers.forEach((ans, i) => {
      if (questions) {
        text += `${questions[i].a} vs ${questions[i].b}\n→ ${ans}\n\n`;
      } else if (prompts) {
        text += `${prompts[i]}\n→ ${ans}\n\n`;
      } else if (statements) {
        text += `"${statements[i]}"\n→ ${ans === "agree" ? "🔥 Agree" : "❄️ Disagree"}\n\n`;
      }
    });
    text += "Your turn! What are your answers? 😄";

    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("icebreakerGames.answersCopied"));
    } catch {
      toast.error(t("icebreakerGames.copyFailed"));
    }
  };

  const resetGame = () => {
    setSelectedGame(null);
    setSession(null);
    setCompleted(false);
    setAnswer("");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/10 via-primary/10 to-primary/10 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (selectedGame ? resetGame() : navigate(-1))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Gamepad2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg font-bold">
              {selectedGame ? selectedGame.name : t("icebreakerGames.title")}
            </h1>
            <p className="text-xs text-muted-foreground">{t("icebreakerGames.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {/* Game selection */}
        {!selectedGame && (
          <div className="space-y-4">
            <Card className="p-4 bg-gradient-to-r from-primary to-primary text-white border-0">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8" />
                <div>
                  <h2 className="font-bold">{t("icebreakerGames.breakTheIce")}</h2>
                  <p className="text-sm text-primary/20">
                    {t("icebreakerGames.breakTheIceDesc")}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {GAMES.map((game) => (
                <Card
                  key={game.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
                  onClick={() => startGame(game)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`bg-gradient-to-r ${game.color} w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md`}
                    >
                      {game.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{game.name}</h3>
                      <p className="text-sm text-muted-foreground">{game.description}</p>
                    </div>
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active game */}
        {selectedGame && session && !completed && (
          <div className="space-y-6 pt-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("icebreakerGames.question", { current: session.currentRound + 1, total: 5 })}
              </span>
              <ProgressBar
                percent={(session.currentRound / 5) * 100}
                trackClassName="flex-1 bg-muted rounded-full h-1.5"
                className={`bg-gradient-to-r ${selectedGame.color} h-1.5 rounded-full transition-all`}
              />
            </div>

            {/* Would You Rather / This or That */}
            {(selectedGame.id === "would-you-rather" || selectedGame.id === "this-or-that") && (
              <div className="space-y-4">
                <h2 className="text-center text-lg font-bold text-foreground">
                  {selectedGame.id === "would-you-rather" ? "Would you rather..." : "Pick one:"}
                </h2>
                <div className="space-y-3">
                  {["a", "b"].map((side) => {
                    const q = (selectedGame as { questions: { a: string; b: string }[] }).questions[
                      session.currentRound
                    ];
                    const value = side === "a" ? q.a : q.b;
                    return (
                      <Button
                        key={side}
                        variant="outline"
                        className="w-full h-auto py-4 text-base justify-start hover:border-primary/80 hover:bg-primary/10"
                        onClick={() => submitAnswer(value)}
                      >
                        <span className="flex-1 text-left">{value}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finish the Sentence */}
            {selectedGame.id === "finish-the-sentence" && (
              <div className="space-y-4">
                <Card className="p-5 bg-gradient-to-r from-primary/10 to-emerald-50 border-teal-200">
                  <p className="text-lg font-medium text-foreground">
                    {(selectedGame as { prompts: string[] }).prompts[session.currentRound]}
                  </p>
                </Card>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t("icebreakerGames.yourAnswerPlaceholder")}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && answer.trim() && submitAnswer(answer.trim())
                    }
                  />
                  <Button
                    className="bg-primary hover:bg-primary"
                    onClick={() => answer.trim() && submitAnswer(answer.trim())}
                    disabled={!answer.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Hot Takes */}
            {selectedGame.id === "hot-takes" && (
              <div className="space-y-4">
                <Card className="p-5 text-center bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                  <p className="text-xl font-bold text-foreground">
                    "{(selectedGame as { statements: string[] }).statements[session.currentRound]}"
                  </p>
                </Card>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "agree", label: "🔥 Agree", color: "bg-green-500 hover:bg-green-600" },
                    {
                      value: "disagree",
                      label: "❄️ Disagree",
                      color: "bg-red-500 hover:bg-red-600",
                    },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      className={`h-14 text-lg text-white ${opt.color}`}
                      onClick={() => submitAnswer(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {completed && session && (
          <div className="space-y-6 pt-8 text-center">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold">{t("icebreakerGames.allDone")}</h2>
            <p className="text-muted-foreground">{t("icebreakerGames.shareAnswers")}</p>

            {/* Review answers */}
            <Card className="p-4 text-left space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                {t("icebreakerGames.yourAnswers")}
              </h3>
              {session.myAnswers.map((ans, i) => {
                const questions = (selectedGame as { questions?: { a: string; b: string }[] })
                  .questions;
                const prompts = (selectedGame as { prompts?: string[] }).prompts;
                const statements = (selectedGame as { statements?: string[] }).statements;
                return (
                  <div key={i} className="p-3 bg-background rounded-xl">
                    <p className="text-xs text-muted-foreground mb-1">
                      {questions
                        ? `${questions[i].a} vs ${questions[i].b}`
                        : prompts
                          ? prompts[i]
                          : statements
                            ? `"${statements[i]}"`
                            : ""}
                    </p>
                    <p className="font-medium">
                      → {statements ? (ans === "agree" ? "🔥 Agree" : "❄️ Disagree") : ans}
                    </p>
                  </div>
                );
              })}
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={resetGame}>
                <RotateCcw className="h-4 w-4" /> {t("icebreakerGames.playAgain")}
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary"
                onClick={shareResults}
              >
                <Share2 className="h-4 w-4" /> {t("icebreakerGames.copyToShare")}
              </Button>
            </div>
            {matchId && (
              <Button
                className="w-full gap-2 bg-gradient-to-r from-pink-500 to-rose-600"
                onClick={() => navigate(`/chat/${matchId}`)}
              >
                <MessageSquare className="h-4 w-4" /> {t("icebreakerGames.sendToMatch", { name: matchName })}
              </Button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default IcebreakerGames;

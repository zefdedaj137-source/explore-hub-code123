import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import albanianEagle from "@/assets/albanian-eagle.png";

const iceBreaker = {
  name: "Albanian Trivia",
  description: "Test your Albanian knowledge with challenging questions!",
  questions: [
    {
      question:
        "In what year did the League of Prizren formally establish the Albanian national movement?",
      answers: ["1878", "1881", "1890", "1900"],
      correct: 0,
    },
    {
      question:
        "Which Albanian sworn virgins ('burrnesha') are known for taking on male social roles?",
      answers: [
        "Women of Gjirokastër",
        "Women of the northern highlands",
        "Women of Vlorë",
        "Women of Tirana",
      ],
      correct: 1,
    },
    {
      question: "The ancient Illyrian city of Butrint was later occupied by which empire?",
      answers: ["Roman only", "Byzantine and Venetian", "Ottoman only", "All of the above"],
      correct: 3,
    },
    {
      question: "What does the traditional Albanian tower house 'kulla' symbolize?",
      answers: ["Wealth", "Family honor and defense", "Religious devotion", "Trade status"],
      correct: 1,
    },
    {
      question: "The Albanian language is part of which language family branch?",
      answers: ["Slavic", "Romance", "Independent Indo-European", "Hellenic"],
      correct: 2,
    },
    {
      question: "Which ancient Illyrian queen fought against Rome in the 3rd century BC?",
      answers: ["Teuta", "Cleopatra", "Boudica", "Zenobia"],
      correct: 0,
    },
    {
      question: "What is the significance of the Codex of Berat?",
      answers: [
        "Legal document",
        "Religious manuscript collection",
        "Military treaty",
        "Trade agreement",
      ],
      correct: 1,
    },
    {
      question:
        "The Arbëreshë communities in Italy descend from Albanians who migrated during which period?",
      answers: [
        "Ancient Rome",
        "Medieval period (15th-18th centuries)",
        "19th century",
        "20th century",
      ],
      correct: 1,
    },
    {
      question:
        "What was the primary administrative division during Ottoman rule in Albanian lands?",
      answers: ["Kingdoms", "Vilayets", "Republics", "Duchies"],
      correct: 1,
    },
    {
      question:
        "Which Albanian literary work is considered the first major publication in Albanian language?",
      answers: [
        "Meshari by Gjon Buzuku",
        "Kanuni by Dukagjini",
        "Albanian Grammar by De Rada",
        "History of Albania by Noli",
      ],
      correct: 0,
    },
  ],
};

const DatingGames = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string;
    answers: string[];
    correct: number;
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const startTrivia = () => {
    const randomQuestion =
      iceBreaker.questions[Math.floor(Math.random() * iceBreaker.questions.length)];
    setCurrentQuestion(randomQuestion);
    setSelectedAnswer(null);
    setIsPlaying(true);
    setShowResult(false);
  };

  const handleAnswerSelect = (index: number) => {
    if (!currentQuestion) return;

    setSelectedAnswer(index);
    const correct = index === currentQuestion.correct;
    setIsCorrect(correct);

    // Wait a moment to show the selected answer, then show result
    setTimeout(() => {
      setIsPlaying(false);
      setShowResult(true);
    }, 500);
  };

  return (
    <section className="min-h-dvh bg-background p-4 pb-24 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-20 w-40 h-40 opacity-5">
        <img src={albanianEagle} alt="" className="w-full h-full object-contain animate-pulse" />
      </div>
      <div className="absolute bottom-20 right-20 w-40 h-40 opacity-5">
        <img
          src={albanianEagle}
          alt=""
          className="w-full h-full object-contain animate-pulse [animation-delay:1s]"
        />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            <span className="text-primary">Dating</span> <span className="text-white">Games</span>
          </h2>
          <p className="text-center text-muted-foreground mt-2">
            Break the ice with fun Albanian-inspired games
          </p>
        </div>

        {/* Game Card */}
        <Card className="p-8 md:p-12 bg-gradient-to-br from-background via-card to-background border border-border shadow-card">
          {/* Albanian Trivia */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-yellow-600/20 border-2 border-yellow-600/50 shadow-lg shadow-yellow-600/20">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-500">Albanian Trivia</span>
            </div>

            <h3 className="text-3xl font-bold text-foreground">{iceBreaker.name}</h3>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {iceBreaker.description}
            </p>

            {/* Game Area */}
            <div className="py-12">
              {!isPlaying && !showResult && (
                <div className="space-y-8">
                  <div className="relative w-64 h-64 mx-auto">
                    <div className="absolute inset-0 bg-yellow-600/20 rounded-full opacity-20 blur-2xl animate-pulse" />
                    <div className="relative w-full h-full rounded-full border-4 border-yellow-600/50 flex items-center justify-center">
                      <Sparkles className="h-24 w-24 text-yellow-500" />
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={startTrivia}
                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 shadow-lg shadow-yellow-600/20 text-xl px-16 py-8 rounded-xl border-2 border-yellow-600/50 transition-all hover:scale-105"
                  >
                    <Sparkles className="mr-3 h-6 w-6" />
                    Start Trivia!
                  </Button>
                </div>
              )}

              {isPlaying && currentQuestion && (
                <div className="space-y-8 animate-scale-in">
                  <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                      <p className="text-2xl font-semibold text-white">
                        {currentQuestion.question}
                      </p>
                    </div>

                    {/* Answer Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                      {currentQuestion.answers.map((answer, index) => (
                        <Button
                          key={answer}
                          onClick={() => handleAnswerSelect(index)}
                          variant="outline"
                          className={`p-6 h-auto text-lg font-semibold transition-all border-border text-foreground hover:bg-primary/10 ${
                            selectedAnswer === index
                              ? selectedAnswer === currentQuestion.correct
                                ? "bg-green-500/20 border-green-500 text-green-400"
                                : "bg-red-500/20 border-red-500 text-red-400"
                              : ""
                          }`}
                          disabled={selectedAnswer !== null}
                        >
                          {answer}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showResult && currentQuestion && (
                <div className="space-y-8 animate-fade-in">
                  <div className="relative w-64 h-64 mx-auto">
                    <div
                      className={`absolute inset-0 opacity-30 blur-2xl ${isCorrect ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <div
                      className={`relative w-full h-full rounded-full border-8 flex items-center justify-center shadow-lg ${isCorrect ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}`}
                    >
                      <div className="text-center">
                        <div className="text-6xl mb-4">{isCorrect ? "🎉" : "😅"}</div>
                        <div className="text-2xl font-bold text-white">
                          {isCorrect ? "Correct!" : "Not quite!"}
                        </div>
                        {!isCorrect && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Answer: {currentQuestion.answers[currentQuestion.correct]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xl text-white font-semibold">
                      {isCorrect
                        ? "🔥 Impressive! Your Albanian knowledge is on point!"
                        : "💪 Good try! Learn more about Albanian culture and try again!"}
                    </p>
                    <Button
                      size="lg"
                      onClick={startTrivia}
                      className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 shadow-lg shadow-yellow-600/20 text-lg px-12 py-6 rounded-xl border-2 border-yellow-600/50 transition-all hover:scale-105"
                    >
                      Next Question
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default DatingGames;

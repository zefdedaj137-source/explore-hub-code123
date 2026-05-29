import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Heart, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

interface GameQuestion {
  question: string;
  answers: string[];
  correct: number;
}

interface OpponentProfile {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string;
}

interface GameInviteWithProfiles {
  from_user_id: string;
  to_user_id: string;
  from_user: OpponentProfile | null;
  to_user: OpponentProfile | null;
}

const ALL_TRIVIA_QUESTIONS: GameQuestion[] = [
  // Skanderbeg Era (15th Century)
  {
    question: "In what year did Skanderbeg defeat the Ottoman forces at the Battle of Torvioll?",
    answers: ["1444", "1450", "1462", "1468"],
    correct: 0,
  },
  {
    question: "What was Skanderbeg's birth name?",
    answers: ["Gjergj Kastrioti", "Gjon Kastrioti", "Lek Dukagjini", "Pirro Katioti"],
    correct: 0,
  },
  {
    question: "How many years did Skanderbeg resist Ottoman invasion?",
    answers: ["15 years", "25 years", "30 years", "40 years"],
    correct: 1,
  },
  {
    question: "Which fortress served as Skanderbeg's headquarters?",
    answers: ["Rozafa", "Krujë", "Berat", "Gjirokastër"],
    correct: 1,
  },
  {
    question: "What title did Pope Calixtus III give Skanderbeg?",
    answers: [
      "Defender of the Faith",
      "Athlete of Christ",
      "Guardian of Europe",
      "Champion of Christendom",
    ],
    correct: 1,
  },

  // Ancient Illyria
  {
    question: "What is the ancient Illyrian name for the city now known as Durrës?",
    answers: ["Apollonia", "Epidamnus", "Byllis", "Butrint"],
    correct: 1,
  },
  {
    question: "Which Illyrian queen fought against Rome in the 3rd century BC?",
    answers: ["Teuta", "Cleopatra", "Boudica", "Zenobia"],
    correct: 0,
  },
  {
    question: "What was the primary Illyrian trade export to Greece and Rome?",
    answers: ["Gold", "Silver", "Timber and minerals", "Wine"],
    correct: 2,
  },
  {
    question: "The ancient city of Butrint was founded by which civilization?",
    answers: ["Greek", "Roman", "Illyrian", "Byzantine"],
    correct: 0,
  },
  {
    question: "What does the name 'Illyria' possibly derive from?",
    answers: [
      "Mountain peaks",
      "A tribal leader named Illyrius",
      "The word for freedom",
      "The Adriatic Sea",
    ],
    correct: 1,
  },

  // Albanian Independence & National Movement
  {
    question: "Which Albanian prince's court was known as the 'Balkans' Versailles'?",
    answers: ["Wied", "Zogu", "Frashëri", "Toptani"],
    correct: 0,
  },
  {
    question: "In what year was the League of Prizren established?",
    answers: ["1878", "1881", "1890", "1900"],
    correct: 0,
  },
  {
    question: "Who declared Albanian independence on November 28, 1912?",
    answers: ["Ismail Qemali", "Esad Pasha", "Fan Noli", "Ahmet Zogu"],
    correct: 0,
  },
  {
    question: "The Congress of Manastir in 1908 established what?",
    answers: ["National borders", "The Albanian alphabet", "Independence", "First constitution"],
    correct: 1,
  },
  {
    question: "Who was the first King of Albania (1928-1939)?",
    answers: ["Zog I", "Wied", "Victor Emmanuel III", "Leka I"],
    correct: 0,
  },

  // Culture & Traditions
  {
    question: "The Kanun of Lekë Dukagjini primarily governed which aspect?",
    answers: [
      "Trade routes",
      "Religious practices",
      "Customary law and honor codes",
      "Agricultural practices",
    ],
    correct: 2,
  },
  {
    question: "What does 'Besa' mean in Albanian culture?",
    answers: ["Love", "Dance", "Promise/Honor/Word of honor", "Family"],
    correct: 2,
  },
  {
    question: "What is the traditional Albanian tower house called?",
    answers: ["Kulla", "Çardak", "Oda", "Konaku"],
    correct: 0,
  },
  {
    question: "Albanian sworn virgins ('burrnesha') are from which region?",
    answers: ["South", "Northern highlands", "Coastal areas", "Central plains"],
    correct: 1,
  },
  {
    question: "What does the Albanian greeting 'Mirëmëngjes' mean?",
    answers: ["Good evening", "Good morning", "Welcome", "Goodbye"],
    correct: 1,
  },

  // UNESCO & Architecture
  {
    question: "Which Albanian city is a UNESCO World Heritage Site for Ottoman architecture?",
    answers: ["Shkodër", "Korçë", "Gjirokastër", "Berat"],
    correct: 3,
  },
  {
    question: "Berat is also known as 'The City of...'?",
    answers: ["A Thousand Windows", "Stone Houses", "Eagles", "Bridges"],
    correct: 0,
  },
  {
    question: "The iso-polyphony singing is from which Albanian region?",
    answers: ["North", "South", "Central", "Coast"],
    correct: 1,
  },
  {
    question: "Which ancient Albanian site has a Greco-Roman theater?",
    answers: ["Apollonia", "Byllis", "Butrint", "All of the above"],
    correct: 3,
  },
  {
    question: "The Rozafa Castle is located in which city?",
    answers: ["Shkodër", "Krujë", "Durrës", "Vlorë"],
    correct: 0,
  },

  // Language & Literature
  {
    question: "The Albanian language belongs to which family?",
    answers: ["Slavic", "Romance", "Independent Indo-European branch", "Hellenic"],
    correct: 2,
  },
  {
    question: "Who wrote 'Meshari', the first Albanian book?",
    answers: ["Gjon Buzuku", "Naim Frashëri", "Pjetër Bogdani", "Marin Barleti"],
    correct: 0,
  },
  {
    question: "In what year was 'Meshari' published?",
    answers: ["1555", "1635", "1700", "1750"],
    correct: 0,
  },
  {
    question: "Which Albanian writer won the inaugural Man Booker International Prize?",
    answers: ["Ismail Kadare", "Fatos Kongoli", "Elvira Dones", "Gazmend Kapllani"],
    correct: 0,
  },
  {
    question: "What are the two main Albanian dialects?",
    answers: ["Gheg and Tosk", "Lab and Cham", "Northern and Southern", "Highland and Lowland"],
    correct: 0,
  },

  // Symbols & Flag
  {
    question: "What does the double-headed eagle on Albania's flag symbolize?",
    answers: ["North and South", "Sovereignty and freedom", "Byzantine heritage", "Mountain peaks"],
    correct: 1,
  },
  {
    question: "When did Albania adopt its current flag design?",
    answers: ["1912", "1928", "1944", "1992"],
    correct: 0,
  },
  {
    question: "The Albanian flag is inspired by whose seal?",
    answers: ["Skanderbeg", "Pirro of Epirus", "Teuta", "Gjergj Arianiti"],
    correct: 0,
  },
  {
    question: "What color is the background of Albania's flag?",
    answers: ["Black", "Red", "Gold", "Blue"],
    correct: 1,
  },
  {
    question: "Albania's coat of arms features which symbol?",
    answers: ["Lion", "Double-headed eagle", "Cross", "Sword"],
    correct: 1,
  },

  // Geography & Nature
  {
    question: "Which is Albania's highest mountain peak?",
    answers: ["Korab", "Tomorr", "Jezercë", "Çika"],
    correct: 0,
  },
  {
    question: "How many natural and cultural UNESCO sites does Albania have?",
    answers: ["1", "2", "3", "4"],
    correct: 3,
  },
  {
    question: "Which sea does NOT border Albania?",
    answers: ["Adriatic Sea", "Ionian Sea", "Mediterranean Sea", "Aegean Sea"],
    correct: 3,
  },
  {
    question: "Albania's Blue Eye (Syri i Kaltër) is a natural what?",
    answers: ["Lake", "Spring", "Cave", "Waterfall"],
    correct: 1,
  },
  {
    question: "What percentage of Albania is mountainous?",
    answers: ["50%", "60%", "70%", "80%"],
    correct: 2,
  },

  // Religion & Coexistence
  {
    question: "What is unique about Albania's religious composition?",
    answers: ["All Muslim", "All Christian", "Religious harmony/diversity", "All atheist"],
    correct: 2,
  },
  {
    question: "Which religious communities coexist in Albania?",
    answers: ["Only Muslim", "Muslim, Orthodox, Catholic", "Only Christian", "Only Orthodox"],
    correct: 1,
  },
  {
    question: "Albania's constitution guarantees what regarding religion?",
    answers: ["State religion", "Freedom of belief", "Mandatory religion", "No religion"],
    correct: 1,
  },
  {
    question: "Which Pope visited Albania in 2014?",
    answers: ["Benedict XVI", "Francis", "John Paul II", "Paul VI"],
    correct: 1,
  },
  {
    question: "Mother Teresa was of Albanian descent from which city?",
    answers: ["Tirana", "Shkodër", "Skopje", "Korçë"],
    correct: 2,
  },

  // Modern History (20th Century)
  {
    question: "When did communist rule end in Albania?",
    answers: ["1989", "1990", "1991", "1992"],
    correct: 2,
  },
  {
    question: "Who was Albania's communist leader (1944-1985)?",
    answers: ["Enver Hoxha", "Ramiz Alia", "Mehmet Shehu", "Hysni Kapo"],
    correct: 0,
  },
  {
    question: "Albania was declared an atheist state in which year?",
    answers: ["1945", "1955", "1967", "1975"],
    correct: 2,
  },
  {
    question: "When did Albania join NATO?",
    answers: ["2004", "2007", "2009", "2012"],
    correct: 2,
  },
  {
    question: "Albania applied for EU membership in which year?",
    answers: ["2009", "2012", "2014", "2016"],
    correct: 2,
  },

  // Food & Cuisine
  {
    question: "What is 'Byrek'?",
    answers: ["A dance", "A traditional pastry", "A song", "A festival"],
    correct: 1,
  },
  {
    question: "What is 'Tavë Kosi'?",
    answers: ["Baked lamb with yogurt", "Stuffed peppers", "Bean soup", "Meat pie"],
    correct: 0,
  },
  {
    question: "Which spirit is traditional in Albania?",
    answers: ["Vodka", "Raki", "Whiskey", "Gin"],
    correct: 1,
  },
  {
    question: "What is 'Fërgesë'?",
    answers: ["Dessert", "Pepper and cheese dish", "Bread", "Soup"],
    correct: 1,
  },
  {
    question: "Albanian coffee is typically served how?",
    answers: ["With milk", "Turkish style", "Espresso", "Filter"],
    correct: 1,
  },

  // Notable Figures
  {
    question: "Who was the leader of the Albanian National Awakening?",
    answers: ["Pashko Vasa", "Naim Frashëri", "Ismail Qemali", "Multiple leaders"],
    correct: 3,
  },
  {
    question: "Naim Frashëri is known as Albania's what?",
    answers: ["National poet", "First king", "Military hero", "First president"],
    correct: 0,
  },
  {
    question: "Which Albanian nun won the Nobel Peace Prize?",
    answers: ["Sister Lucia", "Mother Teresa", "Sister Agnes", "Sister Mary"],
    correct: 1,
  },
  {
    question: "Fan Noli served as Prime Minister in which year?",
    answers: ["1920", "1924", "1928", "1930"],
    correct: 1,
  },
  {
    question: "Who wrote 'Historia e Skënderbeut'?",
    answers: ["Marin Barleti", "Gjon Buzuku", "Pjetër Bogdani", "Naim Frashëri"],
    correct: 0,
  },

  // Ancient Greek Colonies
  {
    question: "Which ancient Greek colony was known for wine production?",
    answers: ["Apollonia", "Butrint", "Phoenice", "Antigonea"],
    correct: 0,
  },
  {
    question: "The ancient theater of Apollonia was built in which century?",
    answers: ["1st BC", "2nd BC", "3rd BC", "4th BC"],
    correct: 1,
  },
  {
    question: "Butrint became a Roman colony under which emperor?",
    answers: ["Julius Caesar", "Augustus", "Nero", "Trajan"],
    correct: 1,
  },
  {
    question: "What was Apollonia's population at its peak?",
    answers: ["10,000", "30,000", "60,000", "100,000"],
    correct: 2,
  },
  {
    question: "Which ancient site has both Greek and Roman ruins?",
    answers: ["Only Apollonia", "Only Butrint", "Both Apollonia and Butrint", "Neither"],
    correct: 2,
  },

  // Medieval Period
  {
    question: "The Byzantine Empire controlled Albania until which century?",
    answers: ["11th", "13th", "15th", "16th"],
    correct: 2,
  },
  {
    question: "Which Angevin kingdom had influence in southern Albania?",
    answers: ["Naples", "France", "Aragon", "Sicily"],
    correct: 0,
  },
  {
    question: "The Muzaka family ruled which region?",
    answers: ["North", "South-central Albania", "Coast", "East"],
    correct: 1,
  },
  {
    question: "Venice controlled which Albanian coastal cities?",
    answers: ["Durrës only", "Several including Durrës and Shkodër", "None", "All cities"],
    correct: 1,
  },
  {
    question: "The Despotate of Epirus included which Albanian region?",
    answers: ["North", "South", "Central", "West"],
    correct: 1,
  },

  // Arbëreshë Diaspora
  {
    question: "When did Arbëreshë communities migrate to Italy?",
    answers: ["10th century", "15th-18th centuries", "19th century", "20th century"],
    correct: 1,
  },
  {
    question: "How many Arbëreshë live in Italy today?",
    answers: ["50,000", "100,000", "200,000", "500,000"],
    correct: 1,
  },
  {
    question: "Which Italian regions have Arbëreshë communities?",
    answers: ["Sicily and Calabria", "Tuscany", "Lombardy", "Veneto"],
    correct: 0,
  },
  {
    question: "Arbëreshë communities preserve which Albanian dialect?",
    answers: ["Modern Albanian", "Tosk", "Gheg", "Old Albanian/Tosk"],
    correct: 3,
  },
  {
    question: "What religion do most Arbëreshë practice?",
    answers: ["Orthodox", "Catholic (Byzantine Rite)", "Muslim", "Protestant"],
    correct: 1,
  },

  // Wars & Conflicts
  {
    question: "Albania remained neutral in which war?",
    answers: ["WWI", "WWII", "Cold War (non-aligned)", "Balkan Wars"],
    correct: 2,
  },
  {
    question: "Which country invaded Albania in 1939?",
    answers: ["Germany", "Italy", "Greece", "Yugoslavia"],
    correct: 1,
  },
  {
    question: "The National Liberation Movement fought against whom in WWII?",
    answers: ["Only Italians", "Only Germans", "Axis powers", "Allies"],
    correct: 2,
  },
  {
    question: "Albania broke relations with which country in 1961?",
    answers: ["Yugoslavia", "Soviet Union", "China", "USA"],
    correct: 1,
  },
  {
    question: "The Kosovo War primarily affected Albanian populations in which decade?",
    answers: ["1980s", "1990s", "2000s", "2010s"],
    correct: 1,
  },

  // Arts & Crafts
  {
    question: "Traditional Albanian filigree work is made from which metal?",
    answers: ["Gold", "Silver", "Bronze", "Copper"],
    correct: 1,
  },
  {
    question: "Albanian folk costumes vary by which factor?",
    answers: ["Season", "Region", "Age", "Wealth"],
    correct: 1,
  },
  {
    question: "What is a 'qeleshe'?",
    answers: ["Dress", "Traditional white cap", "Dance", "Instrument"],
    correct: 1,
  },
  {
    question: "Albanian carpet weaving centers on which city?",
    answers: ["Tirana", "Shkodër", "Korçë", "Gjirokastër"],
    correct: 2,
  },
  {
    question: "Traditional woodcarving is prominent in which Albanian craft?",
    answers: ["Furniture", "Religious items", "Household items", "All of the above"],
    correct: 3,
  },

  // Festivals & Celebrations
  {
    question: "Albania's Independence Day is celebrated on which date?",
    answers: ["November 28", "December 25", "January 1", "May 1"],
    correct: 0,
  },
  {
    question: "What is celebrated on March 14 in Albania?",
    answers: ["New Year", "Summer Day", "Independence", "Republic Day"],
    correct: 1,
  },
  {
    question: "The Gjirokastër National Folklore Festival occurs every how many years?",
    answers: ["Annually", "Every 2 years", "Every 5 years", "Every 10 years"],
    correct: 2,
  },
  {
    question: "Albania's National Flag Day is on which date?",
    answers: ["November 28", "January 1", "March 14", "May 5"],
    correct: 0,
  },
  {
    question: "Catholic Christmas is celebrated in Albania on which date?",
    answers: ["December 25", "January 7", "Both dates", "Not celebrated"],
    correct: 0,
  },

  // Additional Historical Facts
  {
    question: "The Codex of Berat contains what?",
    answers: ["Legal codes", "Religious manuscripts", "Maps", "Poetry"],
    correct: 1,
  },
  {
    question: "Albania's first railway was built in which year?",
    answers: ["1920", "1947", "1968", "1985"],
    correct: 1,
  },
  {
    question: "The Albanian Riviera is located on which sea?",
    answers: ["Adriatic", "Ionian", "Mediterranean", "Aegean"],
    correct: 1,
  },
  {
    question: "Albania's literacy rate under communism reached what level?",
    answers: ["70%", "80%", "90%", "Near 100%"],
    correct: 3,
  },
  {
    question: "The Via Egnatia Roman road passed through which Albanian region?",
    answers: ["North", "South", "Central", "Coast"],
    correct: 1,
  },
];

// Randomly select 6 questions for each game
const getRandomQuestions = (count: number = 6): GameQuestion[] => {
  const shuffled = [...ALL_TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const TRIVIA_QUESTIONS = getRandomQuestions(6);

const GameSession = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [yourScore, setYourScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [bothFinished, setBothFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set());
  const [actionTaken, setActionTaken] = useState(false);

  // Check if both players finished
  useEffect(() => {
    if (gameFinished && opponentFinished) {
      setBothFinished(true);
    }
  }, [gameFinished, opponentFinished]);

  useEffect(() => {
    if (user && sessionId) {
      initializeGame();
      return subscribeToGameUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  const initializeGame = async () => {
    try {
      // Get invite details
      const { data: inviteData, error } = await supabase
        .from("game_invites")
        .select(
          `
          from_user_id,
          to_user_id,
          from_user:profiles!game_invites_from_user_id_fkey(id, full_name, age, profile_image_url, city),
          to_user:profiles!game_invites_to_user_id_fkey(id, full_name, age, profile_image_url, city)
        `
        )
        .eq("id", sessionId)
        .single();
      const invite = inviteData as unknown as GameInviteWithProfiles | null;

      if (error) throw error;

      // Determine opponent
      const opponentData = invite.from_user_id === user?.id ? invite.to_user : invite.from_user;

      setOpponent(opponentData);

      // Set first turn (inviter goes first)
      setCurrentTurn(invite.from_user_id);

      // If it's MY turn first, generate MY question
      if (invite.from_user_id === user?.id) {
        generateMyQuestion();
      }

      setLoading(false);
    } catch (error) {
      logger.error("Error initializing game:", error);
      toast.error(t("gameSession.failedLoad"));
      navigate("/game-lobby");
    }
  };

  const subscribeToGameUpdates = () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`game-session-${sessionId}`)
      .on("broadcast", { event: "answer" }, (payload) => {
        logger.log("📡 Received answer:", payload);

        if (payload.payload.userId !== user?.id) {
          // Opponent answered — only update score; switchTurn is
          // broadcast by the answering player themselves via handleAnswerSelect
          if (payload.payload.correct) {
            setOpponentScore((prev) => prev + 1);
          }
        }
      })
      .on("broadcast", { event: "turn_switched" }, (payload) => {
        logger.log("🔄 Turn switched:", payload);
        setCurrentTurn(payload.payload.nextTurnUserId);
        // When opponent finishes their turn, it becomes my turn
        if (payload.payload.nextTurnUserId === user?.id) {
          // Generate MY OWN question for my turn
          generateMyQuestion();
        }
      })
      .on("broadcast", { event: "game_finished" }, (_payload) => {
        logger.log("🏁 Opponent finished the game!");
        setOpponentFinished(true);
      })
      .on("broadcast", { event: "game_cancelled" }, () => {
        toast.info(t("gameSession.opponentLeft"));
        navigate("/game-lobby");
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleCancelGame = async () => {
    await supabase.channel(`game-session-${sessionId}`).send({
      type: "broadcast",
      event: "game_cancelled",
      payload: { userId: user?.id },
    });
    navigate("/game-lobby");
    toast.info(t("gameSession.youLeft"));
  };

  const generateMyQuestion = () => {
    // Find unused question for ME
    let questionIndex: number;
    do {
      questionIndex = Math.floor(Math.random() * TRIVIA_QUESTIONS.length);
    } while (usedQuestions.has(questionIndex) && usedQuestions.size < TRIVIA_QUESTIONS.length);

    const question = TRIVIA_QUESTIONS[questionIndex];
    logger.log(`🎲 Generated question #${questionIndex} for my turn:`, question.question);
    setUsedQuestions((prev) => new Set([...prev, questionIndex]));
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswerSelect = async (answerIndex: number) => {
    if (!currentQuestion || selectedAnswer !== null || currentTurn !== user?.id || gameFinished)
      return;

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === currentQuestion.correct;

    if (correct) {
      setYourScore((prev) => prev + 1);
    }

    setShowResult(true);

    // Broadcast answer to opponent
    await supabase.channel(`game-session-${sessionId}`).send({
      type: "broadcast",
      event: "answer",
      payload: {
        userId: user?.id,
        correct,
        answerIndex,
      },
    });

    const newQuestionNumber = questionNumber + 1;
    setQuestionNumber(newQuestionNumber);

    setTimeout(() => {
      if (newQuestionNumber >= 6) {
        // I finished - broadcast to opponent and switch turn so they can continue
        setGameFinished(true);
        supabase.channel(`game-session-${sessionId}`).send({
          type: "broadcast",
          event: "game_finished",
          payload: { userId: user?.id },
        });
        // CRITICAL: Still switch turn so opponent can finish their remaining questions
        switchTurn();
      } else {
        switchTurn();
      }
    }, 2000);
  };

  const switchTurn = () => {
    const nextTurnUserId = currentTurn === user?.id ? opponent?.id : user?.id;
    setCurrentTurn(nextTurnUserId ?? null);

    // Broadcast turn change to opponent
    supabase.channel(`game-session-${sessionId}`).send({
      type: "broadcast",
      event: "turn_switched",
      payload: { nextTurnUserId },
    });

    // If it's MY turn now, generate MY question
    if (nextTurnUserId === user?.id) {
      generateMyQuestion();
    }
  };

  const handleLike = async () => {
    if (!opponent || !user || actionTaken) return;

    setActionTaken(true);

    try {
      const { data, error } = (await supabase.rpc("like_user", {
        current_user_id: user.id,
        target_user_id: opponent.id,
      })) as { data: { success: boolean; is_match: boolean } | null; error: unknown };

      if (error) throw error;

      if (data?.is_match) {
        toast.success(t("gameSession.itsAMatch"), {
          description: t("gameSession.matchDesc", { name: opponent.full_name }),
        });
      } else {
        toast.success(t("gameSession.likedProfile", { name: opponent.full_name }));
      }

      navigate("/game-lobby");
    } catch (error) {
      logger.error("Error liking profile:", error);
      toast.error(t("gameSession.failedLike"));
      setActionTaken(false);
    }
  };

  const handlePass = () => {
    if (actionTaken) return;
    setActionTaken(true);
    toast(t("gameSession.returningToLobby"));
    navigate("/game-lobby");
  };

  if (loading || !opponent) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-pink-50 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">{t("gameSession.loadingGame")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-pink-50 to-primary/10 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {!gameFinished ? (
          /* Playing Game */
          <Card className="p-6 space-y-6 shadow-card">
            {/* Cancel button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelGame}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" /> {t("gameSession.exitGame")}
              </Button>
            </div>

            {/* Players Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-pink-400">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-primary/80 text-white">
                    {t("gameSession.you")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{t("gameSession.you")}</p>
                  <p className="text-2xl font-bold text-pink-500">{yourScore}</p>
                </div>
              </div>

              <div className="text-center">
                <Sparkles
                  className={`h-8 w-8 mx-auto mb-1 ${
                    currentTurn === user?.id ? "text-pink-500" : "text-primary"
                  } animate-pulse`}
                />
                <p className="text-sm font-semibold">
                  {currentTurn === user?.id
                    ? t("gameSession.yourTurn")
                    : t("gameSession.opponentTurn")}
                </p>
                <Badge variant="outline" className="mt-1">
                  {t("gameSession.question", { num: questionNumber + 1 })}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {bothFinished ? opponent.full_name : "???"}
                  </p>
                  <p className="text-2xl font-bold text-primary">{opponentScore}</p>
                </div>
                <Avatar
                  className={`h-12 w-12 border-2 border-primary/80 ${!bothFinished ? "blur-md" : ""}`}
                >
                  {bothFinished && <AvatarImage src={opponent.profile_image_url || ""} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-pink-400 text-white">
                    {bothFinished ? opponent.full_name[0] : "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Question */}
            {currentQuestion && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-pink-100 to-primary/20 p-6 rounded-xl">
                  <p className="text-xl font-semibold text-center text-foreground">
                    {currentQuestion.question}
                  </p>
                </div>

                {/* Answers */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.answers.map((answer, index) => (
                    <Button
                      key={answer}
                      onClick={() => handleAnswerSelect(index)}
                      variant="outline"
                      disabled={selectedAnswer !== null || currentTurn !== user?.id || gameFinished}
                      className={`p-6 h-auto text-lg font-semibold transition-all ${
                        selectedAnswer === index
                          ? selectedAnswer === currentQuestion.correct
                            ? "bg-green-500/20 border-green-500 text-green-700"
                            : "bg-red-500/20 border-red-500 text-red-700"
                          : currentTurn !== user?.id
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-pink-50 hover:border-pink-500"
                      }`}
                    >
                      {answer}
                    </Button>
                  ))}
                </div>

                {/* Result */}
                {showResult && selectedAnswer !== null && (
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold">
                      {selectedAnswer === currentQuestion.correct
                        ? t("gameSession.correct")
                        : t("gameSession.incorrect")}
                    </p>
                    {selectedAnswer !== currentQuestion.correct && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {t("gameSession.answer", {
                          answer: currentQuestion.answers[currentQuestion.correct],
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Waiting for opponent */}
                {currentTurn !== user?.id && !showResult && !gameFinished && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground animate-pulse">
                      {t("gameSession.opponentThinking")}
                    </p>
                  </div>
                )}

                {/* You finished, waiting for opponent */}
                {gameFinished && !opponentFinished && (
                  <div className="text-center py-4 bg-yellow-50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-yellow-800">
                      {t("gameSession.completedAll")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("gameSession.waitingOpponent")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          /* Game Finished */
          <Card className="p-8 space-y-6 shadow-card">
            {!bothFinished ? (
              /* Waiting for opponent to finish */
              <div className="text-center py-12">
                <Trophy className="h-20 w-20 text-primary mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-bold mb-4">{t("gameSession.youFinished")}</h2>
                <p className="text-xl text-foreground mb-2">
                  {t("gameSession.yourScore")}:{" "}
                  <span className="font-bold text-pink-500">{yourScore}/6</span>
                </p>
                <div className="mt-8">
                  <p className="text-lg text-muted-foreground animate-pulse">
                    {t("gameSession.waitingOpponent")}
                  </p>
                </div>
              </div>
            ) : (
              /* Both finished - show final results and actions */
              <div className="text-center">
                <Trophy className="h-20 w-20 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-6">{t("gameSession.gameFinished")}</h2>

                {/* Final Scores */}
                <div className="flex justify-center gap-12 mb-8">
                  <div className="text-center">
                    <Avatar className="h-20 w-20 border-4 border-pink-400 mx-auto mb-2">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-primary/80 text-white text-2xl">
                        {t("gameSession.you")}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t("gameSession.yourScore")}
                    </p>
                    <p className="text-5xl font-bold text-pink-500">{yourScore}</p>
                  </div>

                  <div className="text-center">
                    <Avatar className="h-20 w-20 border-4 border-primary/80 mx-auto mb-2">
                      <AvatarImage src={opponent.profile_image_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-pink-400 text-white text-2xl">
                        {opponent.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground mb-1">{opponent.full_name}</p>
                    <p className="text-5xl font-bold text-primary">{opponentScore}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {yourScore > opponentScore && t("gameSession.youWon")}
                    {yourScore === opponentScore && t("gameSession.tie")}
                    {yourScore < opponentScore &&
                      t("gameSession.opponentWon", { name: opponent.full_name })}
                  </p>
                  <p className="text-muted-foreground">
                    {t("gameSession.enjoyedPlaying", { name: opponent.full_name })}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={handlePass}
                    disabled={actionTaken}
                    className="w-32 h-32 rounded-full border-4 border-border hover:border-red-400 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center">
                      <X className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm mt-2">{t("gameSession.pass")}</span>
                    </div>
                  </Button>

                  <Button
                    onClick={handleLike}
                    disabled={actionTaken}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center">
                      <Heart className="h-12 w-12 text-white fill-white" />
                      <span className="text-sm mt-2 text-white">{t("gameSession.like")}</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default GameSession;

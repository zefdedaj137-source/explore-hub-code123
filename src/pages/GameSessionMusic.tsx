import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Heart, Trophy, Sparkles, Music } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface GameQuestion {
  question: string;
  hint: string;
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

// Albanian music trivia questions - Over 100 questions
const ALL_MUSIC_QUESTIONS: GameQuestion[] = [
  // Classic Albanian Music (5)
  {
    question: "Which Albanian singer-songwriter wrote 'Nuk ka fajtor' during communist era?",
    hint: "🎤 Underground movement",
    answers: ["Vaçe Zela", "Frederik Ndoci", "Donika Kastrioti", "Aleksander Lalo"],
    correct: 1,
  },
  {
    question: "Vaçe Zela is known as the 'Queen of' what?",
    hint: "👑 Genre title",
    answers: ["Pop", "Albanian music", "Folk", "Opera"],
    correct: 1,
  },
  {
    question: "Which instrument is central to traditional Albanian folk music?",
    hint: "🎸 String instrument",
    answers: ["Çifteli", "Violin", "Guitar", "Piano"],
    correct: 0,
  },
  {
    question: "What is the traditional Albanian lahuta made from?",
    hint: "🎻 Single-stringed",
    answers: ["Carved wood and horsehair", "Metal and gut", "Bamboo", "Clay"],
    correct: 0,
  },
  {
    question: "The iso-polyphony singing is from which Albanian region?",
    hint: "🎵 UNESCO Heritage",
    answers: ["North (Gheg)", "South (Lab/Tosk)", "Central", "Coast"],
    correct: 1,
  },

  // Festival i Këngës (5)
  {
    question: "Festival i Këngës has been selecting Eurovision entries since which year?",
    hint: "🇦🇱 National competition",
    answers: ["1962", "1972", "1982", "2004"],
    correct: 0,
  },
  {
    question: "Who won the first Festival i Këngës in 1962?",
    hint: "📺 Historic winner",
    answers: ["Vaçe Zela", "Arif Vladi", "Sherif Merdani", "Nexhmije Pagarusha"],
    correct: 2,
  },
  {
    question: "How many times has Albania participated in Eurovision?",
    hint: "🎤 Contest history",
    answers: ["15+", "20+", "25+", "10+"],
    correct: 1,
  },
  {
    question: "Which Albanian entry came 5th in Eurovision 2012?",
    hint: "🇦🇱 Best result",
    answers: ["Rona Nishliu", "Lindita", "Elhaida", "Eugent"],
    correct: 0,
  },
  {
    question: "Elhaida Dani represented Albania in 2015 with which song?",
    hint: "🎤 Powerful ballad",
    answers: ["Fairytale", "I'm Alive", "Heartbeat", "One Night's Anger"],
    correct: 1,
  },

  // Modern Albanian Pop/Rap (5)
  {
    question: "Which Albanian rapper's real name is Rigels Rajku?",
    hint: "🎤 'OTR' artist",
    answers: ["Noizy", "Ledri Vula", "Capital T", "Mozzik"],
    correct: 0,
  },
  {
    question: "Rita Ora's family emigrated from Kosovo in which year?",
    hint: "💫 British-Albanian star",
    answers: ["1989", "1991", "1995", "1999"],
    correct: 1,
  },
  {
    question: "Dua Lipa won a Grammy for which collaboration?",
    hint: "🏆 'Levitating'",
    answers: ["DaBaby collab", "Madonna collab", "Elton John collab", "Calvin Harris collab"],
    correct: 0,
  },
  {
    question: "Bebe Rexha co-wrote which hit song?",
    hint: "✍️ 'Monster' collaboration",
    answers: ["Eminem & Rihanna", "Selena Gomez", "Nicki Minaj", "Ariana Grande"],
    correct: 0,
  },
  {
    question: "Ava Max's breakthrough single was?",
    hint: "💿 2018 hit",
    answers: ["Kings & Queens", "Sweet but Psycho", "EveryTime I Cry", "My Head & My Heart"],
    correct: 1,
  },

  // Albanian Hip-Hop/Rap Scene (5)
  {
    question: "Capital T is from which Albanian-speaking region?",
    hint: "🎤 Kosovar rapper",
    answers: ["Albania", "Kosovo", "North Macedonia", "Montenegro"],
    correct: 1,
  },
  {
    question: "Ledri Vula is known for which music style?",
    hint: "🎵 Genre",
    answers: ["Traditional", "Hip-hop/Rap", "Pop", "Rock"],
    correct: 1,
  },
  {
    question: "Who released the album 'Histori e Vërtetë'?",
    hint: "📀 Authentic story",
    answers: ["Noizy", "Lyrical Son", "Elvana", "Capital T"],
    correct: 0,
  },
  {
    question: "Mozzik is known for collaborations with which female artist?",
    hint: "👫 Duo",
    answers: ["Elvana", "Tayna", "Era", "Dua"],
    correct: 1,
  },
  {
    question: "Which Albanian rapper uses autotune heavily?",
    hint: "🎚️ Vocal effect",
    answers: ["Noizy", "Ghetto Geasy", "Ledri", "Capital T"],
    correct: 1,
  },

  // Albanian Female Artists (5)
  {
    question: "Elvana Gjata is known as the 'Princess of' what?",
    hint: "👑 Albanian Pop",
    answers: ["Pop", "Albanian Pop", "Balkan music", "Dance"],
    correct: 1,
  },
  {
    question: "Era Istrefi's 'BonBon' became a hit in which year?",
    hint: "🍬 Viral song",
    answers: ["2014", "2016", "2018", "2020"],
    correct: 1,
  },
  {
    question: "Which Albanian singer represented Switzerland in Eurovision 2016?",
    hint: "🇨🇭 Dual identity",
    answers: ["Elvana", "Rona", "Linda", "Samanta"],
    correct: 2,
  },
  {
    question: "Ronela Hajati represented Albania in Eurovision which year?",
    hint: "🇦🇱 Recent entry",
    answers: ["2020", "2021", "2022", "2023"],
    correct: 2,
  },
  {
    question: "Tayna is known for which music genre?",
    hint: "🎤 Female rapper",
    answers: ["Pop", "Hip-hop/Rap", "Folk", "Rock"],
    correct: 1,
  },

  // Traditional Folk (5)
  {
    question: "What is a 'saze' ensemble?",
    hint: "🎵 Folk group",
    answers: ["Dance troupe", "Traditional music band", "Choir", "Orchestra"],
    correct: 1,
  },
  {
    question: "The Albanian polyphonic style features what pattern?",
    hint: "🗣️ Vocal technique",
    answers: ["Solo", "Call-and-response", "Harmony", "Rap"],
    correct: 1,
  },
  {
    question: "What is 'Kaba' in Albanian music?",
    hint: "🎶 Musical form",
    answers: ["Dance", "Slow emotional song", "Fast rhythm", "Instrument"],
    correct: 1,
  },
  {
    question: "Which region is known for 'Valle' music?",
    hint: "💃 Dance music",
    answers: ["All regions", "Only North", "Only South", "Only Central"],
    correct: 0,
  },
  {
    question: "Albanian epic poetry was traditionally accompanied by which instrument?",
    hint: "🎻 Heroic tales",
    answers: ["Çifteli", "Lahuta", "Def", "Fyell"],
    correct: 1,
  },

  // International Albanian Artists (5)
  {
    question: "Action Bronson (Arian Asllani) is Albanian from which parent?",
    hint: "🎤 American rapper",
    answers: ["Father", "Mother", "Both", "Grandfather"],
    correct: 0,
  },
  {
    question: "Rita Ora was born in which city?",
    hint: "🏙️ Birthplace",
    answers: ["Tirana", "Pristina", "London", "New York"],
    correct: 1,
  },
  {
    question: "Which Albanian-American DJ is known for EDM?",
    hint: "🎧 Electronic music",
    answers: ["Afrojack", "Alesso", "Dillon Francis", "Borgore"],
    correct: 2,
  },
  {
    question: "Ava Max's real name is?",
    hint: "👤 Birth name",
    answers: ["Amanda Koci", "Ava Koci", "Amanda Gjata", "Ava Lipa"],
    correct: 0,
  },
  {
    question: "Dua Lipa's parents are from which Albanian city?",
    hint: "🏡 Family origin",
    answers: ["Tirana", "Pristina", "Peja", "Prizren"],
    correct: 1,
  },

  // Music Production (5)
  {
    question: "Who produced many of Noizy's hit tracks?",
    hint: "🎚️ Behind the scenes",
    answers: ["Skillz", "Unikkatil", "2Ton", "Mixey"],
    correct: 3,
  },
  {
    question: "Which Albanian producer works with international artists?",
    hint: "🌍 Global reach",
    answers: ["Troy Issa", "Oak", "Skillz", "Mixey"],
    correct: 0,
  },
  {
    question: "The 'Bonnie & Clyde' collaboration featured whom?",
    hint: "👫 Famous duo",
    answers: ["Noizy & Elinel", "Tayna & Mozzik", "Capital T & Lyrical", "Ledri & Majk"],
    correct: 1,
  },
  {
    question: "Which producer created the 'OTR' beat?",
    hint: "🎵 Noizy's hit",
    answers: ["Mixey", "Skillz", "Oak", "Bujaa"],
    correct: 0,
  },
  {
    question: "Who is known for mixing Albanian and Arabic musical elements?",
    hint: "🎶 Cultural fusion",
    answers: ["Ghetto Geasy", "Noizy", "Mozzik", "All of them"],
    correct: 3,
  },

  // Music Videos (5)
  {
    question: "Which Albanian music video surpassed 100M views first?",
    hint: "📹 Viral hit",
    answers: ["BonBon", "Magnet", "OTR", "Bonnie & Clyde"],
    correct: 0,
  },
  {
    question: "Era Istrefi's 'BonBon' video was filmed where?",
    hint: "🎬 Location",
    answers: ["Pristina", "Tirana", "Miami", "Los Angeles"],
    correct: 0,
  },
  {
    question: "Which Albanian artist is known for expensive music videos?",
    hint: "💰 High production",
    answers: ["Noizy", "Elvana", "Capital T", "Era"],
    correct: 0,
  },
  {
    question: "Dua Lipa's 'New Rules' video featured what concept?",
    hint: "🏨 Iconic visuals",
    answers: ["Hotel setting", "Beach", "City streets", "Studio"],
    correct: 0,
  },
  {
    question: "Which video showcased traditional Albanian clothing?",
    hint: "👗 Cultural dress",
    answers: ["Elvana - Çelu", "Era - Njo si ti", "Ronela - Sekret", "Lindita - World"],
    correct: 2,
  },

  // Awards (5)
  {
    question: "Which Albanian artist won MTV Europe Music Award?",
    hint: "🏆 International recognition",
    answers: ["Dua Lipa", "Rita Ora", "Bebe Rexha", "Ava Max"],
    correct: 0,
  },
  {
    question: "Era Istrefi was nominated for which award?",
    hint: "🎖️ Achievement",
    answers: ["Grammy", "MTV EMA", "Billboard", "American Music"],
    correct: 1,
  },
  {
    question: "Dua Lipa won how many Grammy Awards?",
    hint: "🏆 Count them",
    answers: ["1", "2", "3", "4"],
    correct: 1,
  },
  {
    question: "Which Albanian song won Song of the Year in Albania?",
    hint: "🇦🇱 National award",
    answers: ["Changes yearly", "Magnet", "OTR", "BonBon"],
    correct: 0,
  },
  {
    question: "Rita Ora won a BRIT Award for which category?",
    hint: "🇬🇧 British honor",
    answers: ["Best Female", "Best New Artist", "Best Single", "Best Album"],
    correct: 1,
  },

  // Genre Evolution (5)
  {
    question: "Who pioneered Albanian hip-hop in the 1990s?",
    hint: "🎤 Early days",
    answers: ["Unikkatil", "2Ton", "Skillz", "All of them"],
    correct: 3,
  },
  {
    question: "When did Albanian trap music become popular?",
    hint: "🎵 Genre timeline",
    answers: ["2000s", "2010s", "2015+", "2020+"],
    correct: 2,
  },
  {
    question: "Which artist blends folk with modern pop?",
    hint: "🎶 Fusion style",
    answers: ["Elvana Gjata", "Aurela Gaçe", "Both", "Neither"],
    correct: 2,
  },
  {
    question: "Albanian drill music emerged in which decade?",
    hint: "🎤 Recent trend",
    answers: ["2000s", "2010s", "2020s", "1990s"],
    correct: 2,
  },
  {
    question: "Who is known for Albanian R&B style?",
    hint: "🎵 Smooth vocals",
    answers: ["Soni Malaj", "Aurela Gaçe", "Elvana", "Era"],
    correct: 0,
  },

  // Lyrics & Songwriting (5)
  {
    question: "Who wrote the lyrics for 'Më Lër' by Elvana?",
    hint: "✍️ Songwriter",
    answers: ["Elvana herself", "Flori Mumajesi", "Ledri Vula", "Various"],
    correct: 3,
  },
  {
    question: "Noizy is known for lyrics about what theme?",
    hint: "📝 Content focus",
    answers: ["Love", "Street life/success", "Nature", "Politics"],
    correct: 1,
  },
  {
    question: "Which artist writes socially conscious lyrics?",
    hint: "🗣️ Message music",
    answers: ["Lyrical Son", "Noizy", "Capital T", "Elvana"],
    correct: 0,
  },
  {
    question: "Dua Lipa's 'New Rules' is about what?",
    hint: "💔 Theme",
    answers: ["Love", "Heartbreak recovery", "Success", "Freedom"],
    correct: 1,
  },
  {
    question: "Traditional Albanian epic songs tell stories of what?",
    hint: "⚔️ Historical content",
    answers: ["Love", "Heroes and battles", "Nature", "Daily life"],
    correct: 1,
  },

  // Music Festivals (5)
  {
    question: "Kala Festival takes place in which Albanian location?",
    hint: "🎪 Venue",
    answers: ["Tirana", "Durrës castle", "Shkodër", "Vlorë"],
    correct: 1,
  },
  {
    question: "When does Kala Festival typically occur?",
    hint: "📅 Season",
    answers: ["Spring", "Summer", "Fall", "Winter"],
    correct: 1,
  },
  {
    question: "Which festival focuses on Albanian folk music?",
    hint: "🎵 Traditional",
    answers: ["Kala", "FiK", "Gjirokastër Folklore", "OpTIC"],
    correct: 2,
  },
  {
    question: "The Gjirokastër Folklore Festival happens every how many years?",
    hint: "📅 Frequency",
    answers: ["Annual", "Every 2 years", "Every 5 years", "Every 10 years"],
    correct: 2,
  },
  {
    question: "Sunny Hill Festival was founded by which artist?",
    hint: "🎤 Artist festival",
    answers: ["Dua Lipa", "Rita Ora", "Era Istrefi", "Bebe Rexha"],
    correct: 0,
  },

  // Regional Styles (5)
  {
    question: "Gheg music is characterized by what?",
    hint: "🎵 Northern style",
    answers: ["Slow tempo", "Epic songs and lahuta", "Dance beats", "Polyphony"],
    correct: 1,
  },
  {
    question: "Lab music is known for what feature?",
    hint: "🎶 Southern style",
    answers: ["Polyphony", "Solo", "Rap", "Instrumental"],
    correct: 0,
  },
  {
    question: "Which region developed the 'saze' sound?",
    hint: "🎸 Urban music",
    answers: ["Tirana/Central", "North", "South", "Coast"],
    correct: 0,
  },
  {
    question: "Traditional wedding songs vary by what?",
    hint: "💒 Regional differences",
    answers: ["Time", "Region", "Religion", "Wealth"],
    correct: 1,
  },
  {
    question: "The çifteli is associated with which region's music?",
    hint: "🎸 Instrument origin",
    answers: ["South", "North", "Both", "Neither"],
    correct: 2,
  },

  // Collaborations (5)
  {
    question: "Which Albanian artist collaborated with French Montana?",
    hint: "🤝 International collab",
    answers: ["Elvana", "Era", "Noizy", "Capital T"],
    correct: 1,
  },
  {
    question: "Rita Ora's biggest collaboration was with whom?",
    hint: "🎤 Hit single",
    answers: ["Iggy Azalea", "Calvin Harris", "Avicii", "All"],
    correct: 3,
  },
  {
    question: "Dua Lipa collaborated with Elton John on which song?",
    hint: "🎹 Legendary duo",
    answers: ["Cold Heart", "Levitating", "Physical", "Don't Start Now"],
    correct: 0,
  },
  {
    question: "Which Albanian rappers formed 'OTR Label'?",
    hint: "🏢 Label founders",
    answers: ["Noizy", "Noizy & Geti", "Noizy, Ledri & Lyrical", "Just Noizy"],
    correct: 1,
  },
  {
    question: "Bebe Rexha featured with which country star?",
    hint: "🤠 Genre crossover",
    answers: ["Luke Bryan", "Florida Georgia Line", "Blake Shelton", "Keith Urban"],
    correct: 1,
  },

  // Music Industry (5)
  {
    question: "Which is Albania's biggest record label?",
    hint: "🏢 Industry leader",
    answers: ["OTR Label", "Threedots", "Unikkat Entertainment", "Various"],
    correct: 3,
  },
  {
    question: "Albanian music is primarily distributed via what?",
    hint: "📱 Modern era",
    answers: ["CDs", "Digital/streaming", "Radio", "Vinyl"],
    correct: 1,
  },
  {
    question: "Which platform helped Albanian rap go global?",
    hint: "📹 Video platform",
    answers: ["MTV", "YouTube", "Spotify", "TikTok"],
    correct: 1,
  },
  {
    question: "When did Spotify launch in Albania?",
    hint: "🎵 Streaming arrival",
    answers: ["2010", "2015", "2018", "2020"],
    correct: 2,
  },
  {
    question: "Which Albanian artist has the most Spotify streams?",
    hint: "👑 Streaming king/queen",
    answers: ["Dua Lipa", "Rita Ora", "Noizy", "Elvana"],
    correct: 0,
  },

  // Historical Music (5)
  {
    question: "The first Albanian radio broadcast featured what music?",
    hint: "📻 Historic moment",
    answers: ["Folk", "Classical", "Pop", "Mixed"],
    correct: 0,
  },
  {
    question: "Which Albanian folk ensemble toured internationally in the 1960s?",
    hint: "🎭 Cultural ambassadors",
    answers: ["Shota", "Albanian Folklore Ensemble", "Valle Group", "Tirana Ensemble"],
    correct: 1,
  },
  {
    question: "Communist-era music had to follow what guideline?",
    hint: "🚫 Restriction",
    answers: ["No restrictions", "Socialist realism", "Western only", "Religious only"],
    correct: 1,
  },
  {
    question: "When were Western music styles allowed in Albania?",
    hint: "📅 Freedom timeline",
    answers: ["1970s", "1980s", "Early 1990s", "2000s"],
    correct: 2,
  },
  {
    question: "The first Albanian rock band formed in which decade?",
    hint: "🎸 Rock origins",
    answers: ["1960s", "1970s", "1980s", "1990s"],
    correct: 1,
  },

  // Instruments (5)
  {
    question: "The 'fyell' is what type of instrument?",
    hint: "🎶 Sound type",
    answers: ["String", "Wind/flute", "Percussion", "Electronic"],
    correct: 1,
  },
  {
    question: "What is a 'def' in Albanian music?",
    hint: "🥁 Rhythm",
    answers: ["Violin", "Frame drum", "Flute", "Guitar"],
    correct: 1,
  },
  {
    question: "The 'sharki' is used in which context?",
    hint: "🎵 Usage",
    answers: ["Weddings", "Funerals", "Battles", "Harvests"],
    correct: 0,
  },
  {
    question: "Which modern instrument replaced the çifteli in urban music?",
    hint: "🎸 Evolution",
    answers: ["Violin", "Guitar", "Piano", "Synthesizer"],
    correct: 1,
  },
  {
    question: "Traditional Albanian drums are called what?",
    hint: "🥁 Percussion",
    answers: ["Def and tupan", "Bongo", "Djembe", "Conga"],
    correct: 0,
  },
];

// Randomly select 6 questions for each game
const getRandomMusicQuestions = (count: number = 6): GameQuestion[] => {
  const shuffled = [...ALL_MUSIC_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const MUSIC_QUESTIONS = getRandomMusicQuestions(6);

const GameSessionMusic = () => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: invite, error } = await (supabase as any)
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

      if (error) throw error;

      const opponentData = invite.from_user_id === user?.id ? invite.to_user : invite.from_user;

      setOpponent(opponentData);
      setCurrentTurn(invite.from_user_id);

      if (invite.from_user_id === user?.id) {
        generateMyQuestion();
      }

      setLoading(false);
    } catch (error) {
      logger.error("Error initializing game:", error);
      toast.error("Failed to load game");
      navigate("/game-lobby");
    }
  };

  const subscribeToGameUpdates = () => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`game-session-music-${sessionId}`)
      .on("broadcast", { event: "answer" }, (payload) => {
        logger.log("📡 Received answer:", payload);
        if (payload.payload.userId !== user?.id) {
          if (payload.payload.correct) {
            setOpponentScore((prev) => prev + 1);
          }
          setTimeout(() => {
            setShowResult(false);
          }, 2000);
        }
      })
      .on("broadcast", { event: "turn_switched" }, (payload) => {
        logger.log("🔄 Turn switched:", payload);
        setCurrentTurn(payload.payload.nextTurnUserId);
        if (payload.payload.nextTurnUserId === user?.id) {
          generateMyQuestion();
        }
      })
      .on("broadcast", { event: "game_finished" }, (payload) => {
        logger.log("🏁 Opponent finished the game!");
        setOpponentFinished(true);
      })
      .on("broadcast", { event: "game_cancelled" }, () => {
        toast.info("Opponent left the game");
        navigate("/game-lobby");
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleCancelGame = async () => {
    await supabase.channel(`game-session-music-${sessionId}`).send({
      type: "broadcast",
      event: "game_cancelled",
      payload: { userId: user?.id },
    });
    navigate("/game-lobby");
    toast.info("You left the game");
  };

  const generateMyQuestion = () => {
    let questionIndex: number;
    do {
      questionIndex = Math.floor(Math.random() * MUSIC_QUESTIONS.length);
    } while (usedQuestions.has(questionIndex) && usedQuestions.size < MUSIC_QUESTIONS.length);

    const question = MUSIC_QUESTIONS[questionIndex];
    logger.log(`🎵 Generated music question #${questionIndex}:`, question.question);
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

    await supabase.channel(`game-session-music-${sessionId}`).send({
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
        setGameFinished(true);
        supabase.channel(`game-session-music-${sessionId}`).send({
          type: "broadcast",
          event: "game_finished",
          payload: { userId: user?.id },
        });
        switchTurn();
      } else {
        switchTurn();
      }
    }, 2000);
  };

  const switchTurn = () => {
    const nextTurnUserId = currentTurn === user?.id ? opponent?.id : user?.id;
    setCurrentTurn(nextTurnUserId);

    supabase.channel(`game-session-music-${sessionId}`).send({
      type: "broadcast",
      event: "turn_switched",
      payload: { nextTurnUserId },
    });

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
        toast.success("It's a Match! 🎉", {
          description: `You and ${opponent.full_name} can now chat!`,
        });
      } else {
        toast.success(`You liked ${opponent.full_name}! 💕`);
      }

      navigate("/game-lobby");
    } catch (error) {
      logger.error("Error liking profile:", error);
      toast.error("Failed to like profile");
      setActionTaken(false);
    }
  };

  const handlePass = () => {
    if (actionTaken) return;
    setActionTaken(true);
    toast("Returning to lobby...");
    navigate("/game-lobby");
  };

  if (loading || !opponent) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-primary/10 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading music game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/10 to-pink-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {!gameFinished ? (
          <Card className="p-6 space-y-6 shadow-card">
            {/* Cancel button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelGame}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" /> Exit Game
              </Button>
            </div>

            {/* Header */}
            <div className="text-center mb-4">
              <Music className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="text-2xl font-bold text-primary">Music Lovers 🎵</h2>
              <p className="text-sm text-muted-foreground">Albanian Music Trivia</p>
            </div>

            {/* Players */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/80">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-pink-400 text-white">
                    You
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">You</p>
                  <p className="text-2xl font-bold text-primary">{yourScore}</p>
                </div>
              </div>

              <div className="text-center">
                <Sparkles
                  className={`h-8 w-8 mx-auto mb-1 ${
                    currentTurn === user?.id ? "text-primary" : "text-pink-500"
                  } animate-pulse`}
                />
                <p className="text-sm font-semibold">
                  {currentTurn === user?.id ? "Your Turn" : "Opponent's Turn"}
                </p>
                <Badge variant="outline" className="mt-1">
                  Question {questionNumber + 1}/6
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {bothFinished ? opponent.full_name : "???"}
                  </p>
                  <p className="text-2xl font-bold text-pink-500">{opponentScore}</p>
                </div>
                <Avatar
                  className={`h-12 w-12 border-2 border-pink-400 ${!bothFinished ? "blur-md" : ""}`}
                >
                  {bothFinished && <AvatarImage src={opponent.profile_image_url || ""} />}
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-primary/80 text-white">
                    {bothFinished ? opponent.full_name[0] : "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Question */}
            {currentQuestion && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary/20 to-pink-100 p-6 rounded-xl">
                  <p className="text-xl font-semibold text-center text-foreground mb-2">
                    {currentQuestion.question}
                  </p>
                  <p className="text-sm text-center text-muted-foreground">
                    {currentQuestion.hint}
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
                          : currentTurn !== user?.id || gameFinished
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-primary/10 hover:border-primary"
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
                      {selectedAnswer === currentQuestion.correct ? "✅ Correct!" : "❌ Incorrect!"}
                    </p>
                    {selectedAnswer !== currentQuestion.correct && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Answer: {currentQuestion.answers[currentQuestion.correct]}
                      </p>
                    )}
                  </div>
                )}

                {/* Waiting states */}
                {currentTurn !== user?.id && !showResult && !gameFinished && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground animate-pulse">
                      Your opponent is thinking...
                    </p>
                  </div>
                )}

                {gameFinished && !opponentFinished && (
                  <div className="text-center py-4 bg-yellow-50 rounded-lg p-4">
                    <p className="text-lg font-semibold text-yellow-800">
                      ✨ You've completed all questions!
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Waiting for your opponent to finish...
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-8 space-y-6 shadow-card">
            {!bothFinished ? (
              <div className="text-center py-12">
                <Music className="h-20 w-20 text-primary mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-bold mb-4">You Finished!</h2>
                <p className="text-xl text-foreground mb-2">
                  Your Score: <span className="font-bold text-primary">{yourScore}/6</span>
                </p>
                <div className="mt-8">
                  <p className="text-lg text-muted-foreground animate-pulse">
                    Waiting for your opponent to finish...
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Trophy className="h-20 w-20 text-primary mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-6">Game Finished!</h2>

                <div className="flex justify-center gap-12 mb-8">
                  <div className="text-center">
                    <Avatar className="h-20 w-20 border-4 border-primary/80 mx-auto mb-2">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-pink-400 text-white text-2xl">
                        You
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                    <p className="text-5xl font-bold text-primary">{yourScore}</p>
                  </div>

                  <div className="text-center">
                    <Avatar className="h-20 w-20 border-4 border-pink-400 mx-auto mb-2">
                      <AvatarImage src={opponent.profile_image_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-primary/80 text-white text-2xl">
                        {opponent.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground mb-1">{opponent.full_name}</p>
                    <p className="text-5xl font-bold text-pink-500">{opponentScore}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {yourScore > opponentScore && "You Won! 🏆"}
                    {yourScore === opponentScore && "It's a Tie! 🤝"}
                    {yourScore < opponentScore && `${opponent.full_name} Won! 🌟`}
                  </p>
                  <p className="text-muted-foreground">
                    Did you enjoy playing with {opponent.full_name}?
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={handlePass}
                    disabled={actionTaken}
                    className="w-32 h-32 rounded-full border-4 border-border hover:border-red-400 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center">
                      <X className="h-12 w-12 text-muted-foreground" />
                      <span className="text-sm mt-2">Pass</span>
                    </div>
                  </Button>

                  <Button
                    onClick={handleLike}
                    disabled={actionTaken}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-pink-600 hover:from-primary hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center">
                      <Heart className="h-12 w-12 text-white fill-white" />
                      <span className="text-sm mt-2 text-white">Like</span>
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

export default GameSessionMusic;

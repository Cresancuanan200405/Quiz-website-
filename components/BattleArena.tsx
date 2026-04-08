"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Swords, LoaderCircle, Image, CircleCheck, Type, Flame, BookOpen, Sparkles, Radar, Crown, Clock3, Target, AlertTriangle, Lightbulb, ArrowRight, Flag, CircleX, Users, RefreshCw, X } from "lucide-react";
import CategoryCard from "@/components/CategoryCard";
import ProfilePhoto from "@/components/ProfilePhoto";
import Timer from "@/components/Timer";
import { categoryMeta, currentUser, leaderboardUsers, questions } from "@/lib/mockData";
import type { BattleState } from "@/lib/types";
import AnswerButton from "@/components/AnswerButton";
import { useProfilePhotoStore } from "@/lib/profilePhotoStore";
import { useProfileStore } from "@/lib/profileStore";
import { loadBattleOpponentsFromSupabase, persistBattleSessionToSupabase } from "@/lib/supabase/battlePersistence";
import { useSettingsStore } from "@/lib/settingsStore";
import { cx } from "@/lib/utils";

const letters = ["A", "B", "C", "D"];
const RANDOM_CATEGORY_ID = "__random__";
const questionCountOptions = [10, 15, 20, 25, 30] as const;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const triviaApiCategoryMap: Record<string, string | null> = {
  Science: "science",
  History: "history",
  Tech: "science",
  Nature: "geography",
  Anime: "film_and_tv",
  Food: "food_and_drink",
  Animals: "science",
  Business: "society_and_culture",
};

const categorySemanticHints: Record<string, string[]> = {
  Science: ["laboratory", "experiment", "molecule", "physics", "astronomy", "biology"],
  History: ["ancient", "civilization", "empire", "war", "monument", "artifact"],
  Tech: ["computer", "circuit", "robotics", "software", "internet", "innovation"],
  Nature: ["forest", "mountain", "ocean", "wildlife", "ecosystem", "landscape"],
  Anime: ["animation", "manga", "character", "studio", "cosplay", "fanart"],
  Food: ["cuisine", "dish", "ingredient", "restaurant", "chef", "cooking"],
  Animals: ["wildlife", "species", "zoo", "habitat", "creature", "fauna"],
  Business: ["office", "market", "finance", "startup", "leadership", "strategy"],
};

const stopWords = new Set([
  "what", "which", "where", "when", "who", "why", "how", "does", "did", "was", "were", "is", "the", "a", "an", "of", "in", "on", "to", "for", "and", "or", "with", "from",
]);

type BattleModeId = "classic" | "pics-word" | "true-false" | "guess-word" | "rapid-fire";

interface BattleMode {
  id: BattleModeId;
  label: string;
  icon: typeof BookOpen;
  description: string;
  rounds: number;
  secondsPerRound: number;
}

interface PreparedBattleQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  picsWord?: PicsWordPuzzle;
}

interface PicsWordPuzzle {
  targetWord: string;
  letterBank: string[];
  imageUrls: string[];
  clue: string;
}

interface BattleSetupResult {
  questions: PreparedBattleQuestion[];
  resolvedCategoryName: string;
}

interface TriviaApiQuestion {
  id: string;
  question: { text: string };
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: string;
}

interface BattleRoundResult {
  id: number;
  round: number;
  question: string;
  correctAnswer: string;
  userAnswer: string | null;
  userCorrect: boolean;
  userTimeSpent: number;
  userPoints: number;
  userStreakAfter: number;
  opponentAnswer: string | null;
  opponentCorrect: boolean;
  opponentTimeSpent: number;
  opponentPoints: number;
  opponentStreakAfter: number;
}

interface RoundBurst {
  userPoints: number;
  opponentPoints: number;
  userMultiplier: number;
  opponentMultiplier: number;
  userHintPenalty: number;
}

interface BattleOpponent {
  username: string;
  rank: string;
  photo: {
    type: "initials" | "icon" | "image";
    value: string;
  };
}

interface QueuePlayer extends BattleOpponent {
  id: string;
  preferredMode: BattleModeId;
  preferredCategory: string;
  waitingSeconds: number;
}

const battleModes: BattleMode[] = [
  {
    id: "classic",
    label: "Classic Quiz",
    icon: BookOpen,
    description: "Balanced 1v1 with standard timer and rounds.",
    rounds: 5,
    secondsPerRound: 12,
  },
  {
    id: "pics-word",
    label: "4 Pics 1 Word",
    icon: Image,
    description: "Visual clue style pacing with longer read time.",
    rounds: 4,
    secondsPerRound: 14,
  },
  {
    id: "true-false",
    label: "True or False",
    icon: CircleCheck,
    description: "Fast verdict rounds with binary choices.",
    rounds: 6,
    secondsPerRound: 8,
  },
  {
    id: "guess-word",
    label: "Guess the Word",
    icon: Type,
    description: "Interpret clue-heavy prompts under pressure.",
    rounds: 5,
    secondsPerRound: 10,
  },
  {
    id: "rapid-fire",
    label: "Rapid Fire",
    icon: Flame,
    description: "Maximum speed mode with minimal thinking time.",
    rounds: 7,
    secondsPerRound: 6,
  },
];

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeWord = (value: string) => value.replace(/[^a-zA-Z]/g, "").toUpperCase();

const pickPuzzleWord = (correctAnswer: string, questionText: string) => {
  const answerTokens = correctAnswer
    .split(/[^a-zA-Z]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && token.length <= 10);

  if (answerTokens.length) {
    return normalizeWord(answerTokens.sort((a, b) => b.length - a.length)[0]);
  }

  const questionTokens = questionText
    .split(/[^a-zA-Z]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && token.length <= 10);

  if (questionTokens.length) {
    return normalizeWord(questionTokens.sort((a, b) => b.length - a.length)[0]);
  }

  return "QUIZ";
};

const buildLetterBank = (targetWord: string) => {
  const lettersNeeded = Math.max(10, Math.min(14, targetWord.length + 4));
  const bank = targetWord.split("");

  while (bank.length < lettersNeeded) {
    bank.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
  }

  return shuffleArray(bank);
};

const getSemanticTerms = (categoryName: string, clueText: string, targetWord: string) => {
  const textTerms = clueText
    .split(/[^a-zA-Z]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 4 && !stopWords.has(token));

  const uniqueTerms = Array.from(new Set(textTerms));
  const categoryTerms = categorySemanticHints[categoryName] ?? [categoryName.toLowerCase()];

  const terms: string[] = [targetWord.toLowerCase()];
  for (const token of uniqueTerms) {
    if (terms.length >= 2) break;
    terms.push(token);
  }

  for (const token of categoryTerms) {
    if (terms.length >= 4) break;
    if (!terms.includes(token)) terms.push(token);
  }

  while (terms.length < 4) {
    terms.push(categoryName.toLowerCase());
  }

  return terms.slice(0, 4);
};

const buildPicsWordImageUrls = (targetWord: string, categoryName: string, questionText: string, answerText: string) => {
  const semanticTerms = getSemanticTerms(categoryName, questionText, targetWord);
  const answerTerms = answerText
    .split(/[^a-zA-Z]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 4 && !stopWords.has(term));

  const distinctTerms = Array.from(new Set([targetWord.toLowerCase(), ...answerTerms, ...semanticTerms])).slice(0, 6);
  const queryVariants = [
    `${distinctTerms[0] ?? targetWord.toLowerCase()},portrait`,
    `${distinctTerms[1] ?? distinctTerms[0] ?? targetWord.toLowerCase()},symbol`,
    `${distinctTerms[2] ?? distinctTerms[0] ?? targetWord.toLowerCase()},scene`,
    `${distinctTerms[3] ?? distinctTerms[0] ?? targetWord.toLowerCase()},artifact`,
  ];

  const seed = Math.floor(Math.random() * 100000);
  return queryVariants.map((query, idx) => {
    const safeTags = query
      .toLowerCase()
      .replace(/\s+/g, ",")
      .replace(/[^a-z,]/g, "")
      .replace(/,+/g, ",")
      .replace(/^,|,$/g, "");
    return `https://loremflickr.com/640/480/${safeTags}?lock=${seed + idx}`;
  });
};

const isSimpleQuestionText = (value: string) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  const wordCount = normalized.split(" ").filter(Boolean).length;
  const hasTrickyTerms = /\b(except|least|most|incorrect|false|never|always|not)\b/i.test(normalized);
  return wordCount <= 14 && !hasTrickyTerms;
};

const getPicsFallbackImage = (categoryName: string, index: number) => {
  const localImages = ["/images/Quiz1.png", "/images/Quiz2.png", "/images/Quiz3.png", "/images/Quiz.jpg"];
  const categoryOffset = categoryName.length % localImages.length;
  return localImages[(categoryOffset + index) % localImages.length];
};

const toPicsWordQuestion = (questionText: string, correctAnswer: string, categoryName: string): PreparedBattleQuestion => {
  const targetWord = pickPuzzleWord(correctAnswer, questionText);

  return {
    question: questionText,
    options: [],
    correctAnswer: targetWord,
    picsWord: {
      targetWord,
      letterBank: buildLetterBank(targetWord),
      imageUrls: buildPicsWordImageUrls(targetWord, categoryName, questionText, correctAnswer),
      clue: questionText,
    },
  };
};

const getBattlePoints = (timeSpent: number, streakAfter: number, totalSeconds: number) => {
  const safeTotal = Math.max(1, totalSeconds);
  const safeTimeSpent = Math.max(0, Math.min(safeTotal, timeSpent));
  const speedScore = Math.max(0, Math.round(((safeTotal - safeTimeSpent) / safeTotal) * 80));
  const streakMultiplier = 1 + Math.min(1.65, Math.max(0, streakAfter - 1) * 0.18);
  const basePoints = 100 + speedScore;

  return {
    points: Math.max(0, Math.round(basePoints * streakMultiplier)),
    speedScore,
    streakMultiplier: Number(streakMultiplier.toFixed(2)),
  };
};

const getOpponentTimeSpent = (totalSeconds: number) => {
  const safeTotal = Math.max(2, totalSeconds);
  const lower = Math.max(1, Math.floor(safeTotal * 0.22));
  const upper = Math.max(lower + 1, Math.floor(safeTotal * 0.88));
  return Math.min(safeTotal - 1, Math.max(1, Math.floor(lower + Math.random() * (upper - lower))));
};

const formatElapsedTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const toTrueFalseQuestion = (question: PreparedBattleQuestion): PreparedBattleQuestion => {
  const incorrectOption = question.options.find((option) => option !== question.correctAnswer) ?? question.correctAnswer;
  const showsCorrectAnswer = Math.random() > 0.5;
  const displayedAnswer = showsCorrectAnswer ? question.correctAnswer : incorrectOption;

  return {
    question: `${question.question} Answer: ${displayedAnswer}`,
    options: ["True", "False"],
    correctAnswer: showsCorrectAnswer ? "True" : "False",
  };
};

const buildLocalBattleQuestions = (categoryName: string, modeId: BattleModeId, amount: number): BattleSetupResult => {
  const resolvedCategoryName = categoryName === RANDOM_CATEGORY_ID
    ? categoryMeta[Math.floor(Math.random() * categoryMeta.length)]?.name
    : categoryName;
  const selectedCategory = categoryMeta.find((category) => category.name === resolvedCategoryName);
  const selectedMode = battleModes.find((mode) => mode.id === modeId);

  if (!selectedCategory || !selectedMode) return { questions: [], resolvedCategoryName: resolvedCategoryName ?? "Random" };

  const categoryPool = questions.filter((question) => question.category === selectedCategory.name);
  const easyCategoryPool = categoryPool.filter((item) => item.difficulty === "Easy");
  const easyGlobalPool = questions.filter((item) => item.difficulty === "Easy");
  const simpleEasyCategoryPool = easyCategoryPool.filter((item) => isSimpleQuestionText(item.question));
  const simpleEasyGlobalPool = easyGlobalPool.filter((item) => isSimpleQuestionText(item.question));
  const fallbackPool =
    simpleEasyCategoryPool.length ? simpleEasyCategoryPool :
    simpleEasyGlobalPool.length ? simpleEasyGlobalPool :
    easyCategoryPool.length ? easyCategoryPool :
    easyGlobalPool.length ? easyGlobalPool :
    categoryPool.length ? categoryPool :
    questions;
  const picked = shuffleArray(fallbackPool).slice(0, amount);

  const preparedQuestions = picked.map((question) => {
    if (modeId === "pics-word") {
      return toPicsWordQuestion(question.question, question.correctAnswer, selectedCategory.name);
    }

    const base: PreparedBattleQuestion = {
      question:
        modeId === "guess-word"
            ? `Guess the Word: ${question.question}`
            : question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
    };

    if (modeId === "true-false") {
      return toTrueFalseQuestion(base);
    }

    return base;
  });

  return { questions: preparedQuestions, resolvedCategoryName: selectedCategory.name };
};

const buildBattleQuestions = async (categoryName: string, modeId: BattleModeId, amount: number): Promise<BattleSetupResult> => {
  const local = buildLocalBattleQuestions(categoryName, modeId, amount);
  const selectedMode = battleModes.find((mode) => mode.id === modeId);
  if (!selectedMode || !local.resolvedCategoryName) return local;

  try {
    const mapped = triviaApiCategoryMap[local.resolvedCategoryName] ?? null;
    const params = new URLSearchParams({
      limit: String(amount),
      difficulties: "easy",
    });

    if (mapped) {
      params.set("categories", mapped);
    }

    const response = await fetch(`https://the-trivia-api.com/v2/questions?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) return local;

    const data = (await response.json()) as TriviaApiQuestion[];
    if (!Array.isArray(data) || !data.length) return local;

    const easyData = data.filter((item) => (item.difficulty ?? "easy").toLowerCase() === "easy");
    const simpleEasyData = easyData.filter((item) => isSimpleQuestionText(item.question.text));
    const sourceData = simpleEasyData.length ? simpleEasyData : easyData;
    if (!sourceData.length) return local;

    const onlineQuestions: PreparedBattleQuestion[] = sourceData.map((item) => {
      if (modeId === "pics-word") {
        return toPicsWordQuestion(item.question.text, item.correctAnswer, local.resolvedCategoryName);
      }

      const options = shuffleArray([item.correctAnswer, ...item.incorrectAnswers]).slice(0, 4);
      const question: PreparedBattleQuestion = {
        question:
          modeId === "guess-word"
              ? `Guess the Word: ${item.question.text}`
              : item.question.text,
        options,
        correctAnswer: item.correctAnswer,
      };

      if (modeId === "true-false") {
        return toTrueFalseQuestion(question);
      }

      return question;
    });

    const merged = [...onlineQuestions, ...local.questions].slice(0, amount);
    return {
      resolvedCategoryName: local.resolvedCategoryName,
      questions: merged,
    };
  } catch {
    return local;
  }
};

export default function BattleArena() {
  const { photo: profilePhoto } = useProfilePhotoStore();
  const { displayName, tier } = useProfileStore();
  const nextQuestionDelaySeconds = useSettingsStore((state) => state.nextQuestionDelaySeconds);

  const [state, setState] = useState<BattleState>("idle");
  const [setupTab, setSetupTab] = useState<"mode" | "category" | "queue">("mode");
  const [countdown, setCountdown] = useState(5);
  const [timeLeft, setTimeLeft] = useState<number>(12);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [resolvingRound, setResolvingRound] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [youCorrectCount, setYouCorrectCount] = useState(0);
  const [opponentCorrectCount, setOpponentCorrectCount] = useState(0);
  const [youStreak, setYouStreak] = useState(0);
  const [opponentStreak, setOpponentStreak] = useState(0);
  const [bestYouStreak, setBestYouStreak] = useState(0);
  const [bestOpponentStreak, setBestOpponentStreak] = useState(0);
  const [roundResults, setRoundResults] = useState<BattleRoundResult[]>([]);
  const [roundBurst, setRoundBurst] = useState<RoundBurst | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);
  const [isPreparingMatch, setIsPreparingMatch] = useState(false);
  const [picsSelectedIndices, setPicsSelectedIndices] = useState<number[]>([]);
  const [picsShake, setPicsShake] = useState(false);
  const [usedHintIndices, setUsedHintIndices] = useState<number[]>([]);
  const [currentHintPenalty, setCurrentHintPenalty] = useState(0);
  const [pendingHintDebt, setPendingHintDebt] = useState(0);
  const [matchElapsedSeconds, setMatchElapsedSeconds] = useState(0);
  const [answeredRoundMap, setAnsweredRoundMap] = useState<Record<number, { answer: string | null; correct: boolean }>>({});
  const [roundNotification, setRoundNotification] = useState<{ title: string; body: string } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; alt: string } | null>(null);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [hasSurrendered, setHasSurrendered] = useState(false);
  const [queuePlayers, setQueuePlayers] = useState<QueuePlayer[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [selectedQueuePlayer, setSelectedQueuePlayer] = useState<QueuePlayer | null>(null);
  const [queuedOpponentOverride, setQueuedOpponentOverride] = useState<BattleOpponent | null>(null);
  const [selectedMode, setSelectedMode] = useState<BattleModeId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [resolvedCategoryName, setResolvedCategoryName] = useState<string | null>(null);
  const [battleQuestions, setBattleQuestions] = useState<PreparedBattleQuestion[]>([]);
  const [matchedOpponent, setMatchedOpponent] = useState<BattleOpponent>({
    username: "RogueNeuron",
    rank: "Pro",
    photo: { type: "initials", value: "RN" },
  });

  const persistedBattleKeyRef = useRef<string | null>(null);
  const roundResultIdRef = useRef(1);
  const arenaRef = useRef<HTMLElement | null>(null);
  const forfeitRecordedRef = useRef(false);
  const roundStartedAtRef = useRef<number | null>(null);

  const activeMode = useMemo(
    () => battleModes.find((mode) => mode.id === selectedMode) ?? null,
    [selectedMode]
  );

  const activeCategory = useMemo(() => categoryMeta.find((category) => category.name === selectedCategory) ?? null, [selectedCategory]);
  const selectedCategoryLabel = selectedCategory === RANDOM_CATEGORY_ID ? "Random" : activeCategory?.name ?? null;
  const battleCategoryLabel = selectedCategory === RANDOM_CATEGORY_ID ? `Random • ${resolvedCategoryName ?? "Picking category..."}` : resolvedCategoryName ?? activeCategory?.name ?? null;
  const isBattleOngoing = state === "searching" || state === "found" || state === "countdown" || state === "playing";

  const question = battleQuestions[index];
  const currentPicsPuzzle = activeMode?.id === "pics-word" ? question?.picsWord ?? null : null;

  const picsPickedLetters = useMemo(
    () => currentPicsPuzzle ? picsSelectedIndices.map((idx) => currentPicsPuzzle.letterBank[idx]) : [],
    [currentPicsPuzzle, picsSelectedIndices]
  );

  const picsComposedAnswer = useMemo(() => picsPickedLetters.join(""), [picsPickedLetters]);
  const answeredRound = answeredRoundMap[index];
  const displayedPicsLetters = useMemo(
    () => (revealed && currentPicsPuzzle ? currentPicsPuzzle.targetWord.split("") : picsPickedLetters),
    [currentPicsPuzzle, picsPickedLetters, revealed]
  );
  const isPicsWordMode = activeMode?.id === "pics-word";

  const toBattleOpponent = useCallback((player: QueuePlayer): BattleOpponent => ({
    username: player.username,
    rank: player.rank,
    photo: player.photo,
  }), []);

  const battleSummary = useMemo(() => {
    const totalRounds = roundResults.length || 1;
    const userAverageTime = roundResults.length ? roundResults.reduce((sum, round) => sum + round.userTimeSpent, 0) / roundResults.length : 0;
    const opponentAverageTime = roundResults.length ? roundResults.reduce((sum, round) => sum + round.opponentTimeSpent, 0) / roundResults.length : 0;
    const bestRound = roundResults.reduce<BattleRoundResult | null>((best, round) => {
      if (!best) return round;
      return round.userPoints + round.opponentPoints > best.userPoints + best.opponentPoints ? round : best;
    }, null);

    return {
      totalRounds: roundResults.length,
      userAccuracy: roundResults.length ? Math.round((youCorrectCount / roundResults.length) * 100) : 0,
      opponentAccuracy: roundResults.length ? Math.round((opponentCorrectCount / roundResults.length) * 100) : 0,
      userAverageTime: Number(userAverageTime.toFixed(1)),
      opponentAverageTime: Number(opponentAverageTime.toFixed(1)),
      bestRound,
      margin: Math.abs(youScore - opponentScore),
      winner: youScore === opponentScore ? "draw" : youScore > opponentScore ? "you" : "opponent",
      winningScore: Math.max(youScore, opponentScore),
      losingScore: Math.min(youScore, opponentScore),
      roundProgress: Math.round((roundResults.length / Math.max(1, battleQuestions.length)) * 100),
      averagePointsPerRound: roundResults.length ? Math.round((youScore + opponentScore) / roundResults.length) : 0,
      totalRoundsLabel: `${roundResults.length}/${battleQuestions.length || totalRounds}`,
    };
  }, [battleQuestions.length, opponentCorrectCount, opponentScore, roundResults, youCorrectCount, youScore]);

  const pickFallbackOpponent = useCallback((): BattleOpponent => {
    const candidateOpponents = leaderboardUsers.filter((user) => user.id !== currentUser.id);
    const randomOpponent = candidateOpponents[Math.floor(Math.random() * candidateOpponents.length)];

    if (!randomOpponent) {
      return {
        username: "RogueNeuron",
        rank: "Pro",
        photo: { type: "initials", value: "RN" },
      };
    }

    return {
      username: randomOpponent.username,
      rank: randomOpponent.tier,
      photo: { type: "initials", value: randomOpponent.avatar },
    };
  }, []);

  const pickOpponent = useCallback(async (): Promise<BattleOpponent> => {
    const supabaseOpponents = await loadBattleOpponentsFromSupabase();
    if (!supabaseOpponents.length) return pickFallbackOpponent();

    const randomOpponent = supabaseOpponents[Math.floor(Math.random() * supabaseOpponents.length)];
    if (!randomOpponent) return pickFallbackOpponent();

    return {
      username: randomOpponent.username,
      rank: randomOpponent.tier,
      photo: randomOpponent.photo,
    };
  }, [pickFallbackOpponent]);

  const loadQueuePlayers = useCallback(async () => {
    setIsQueueLoading(true);
    try {
      const supabaseOpponents = await loadBattleOpponentsFromSupabase();
      const normalizedSource: Array<{ id: string; username: string; tier: string; photo: BattleOpponent["photo"] }> = supabaseOpponents.length
        ? supabaseOpponents
            .map((player) => ({
              id: player.profileKey,
              username: player.username,
              tier: player.tier,
              photo: player.photo,
            }))
        : leaderboardUsers.filter((user) => user.id !== currentUser.id).map((user) => ({
            id: user.id,
            username: user.username,
            tier: user.tier,
            photo: { type: "initials" as const, value: user.avatar },
          }));

      const shuffled = shuffleArray(normalizedSource).slice(0, 8);
      const queued = shuffled.map((player, idx) => ({
        id: player.id,
        username: player.username,
        rank: player.tier,
        photo: player.photo,
        preferredMode: battleModes[(idx + 1) % battleModes.length].id,
        preferredCategory: categoryMeta[idx % categoryMeta.length]?.name ?? "Science",
        waitingSeconds: 6 + ((idx + 2) * 9),
      }));

      setQueuePlayers(queued);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  const persistForfeitResult = useCallback(() => {
    if (forfeitRecordedRef.current || !selectedMode) return;
    forfeitRecordedRef.current = true;

    const forfeitOpponentScore = Math.max(opponentScore + 160, youScore + 120);
    void persistBattleSessionToSupabase({
      mode: selectedMode,
      category: battleCategoryLabel ?? selectedCategoryLabel ?? selectedCategory ?? "Unknown",
      result: "loss",
      userScore: youScore,
      opponentScore: forfeitOpponentScore,
      opponentName: matchedOpponent.username,
    });
  }, [battleCategoryLabel, matchedOpponent.username, opponentScore, selectedCategory, selectedCategoryLabel, selectedMode, youScore]);

  const confirmLeaveBattle = () => {
    persistForfeitResult();
    const href = pendingLeaveHref;
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);

    if (href) {
      window.location.assign(href);
      return;
    }

    resetToSetup();
  };

  const stayInBattle = () => {
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);
  };

  const advanceRound = useCallback(() => {
    if (index >= battleQuestions.length - 1) {
      setState("finished");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setResolvingRound(false);
    setRoundBurst(null);
    setUsedHintIndices([]);
    setCurrentHintPenalty(0);
    roundStartedAtRef.current = Date.now();
  }, [battleQuestions.length, index]);

  const jumpToRound = useCallback((roundIndex: number) => {
    setIndex(Math.max(0, Math.min(roundIndex, Math.max(0, battleQuestions.length - 1))));
  }, [battleQuestions.length]);

  const finishBattle = useCallback(() => {
    setState("finished");
  }, []);

  const surrenderBattle = useCallback(() => {
    if (state !== "playing") return;
    setShowSurrenderConfirm(false);
    setHasSurrendered(true);
    persistForfeitResult();
    setOpponentScore((score) => Math.max(score, youScore + 120));
    setState("finished");
  }, [persistForfeitResult, state, youScore]);

  const resolveRound = useCallback(
    (userAnswer: string | null, userTimeSpent: number) => {
      if (!question || resolvingRound || answeredRoundMap[index]) return;

      const totalSeconds = activeMode?.secondsPerRound ?? 12;
      const userCorrect = userAnswer === question.correctAnswer;
      const nextYouStreak = userCorrect ? youStreak + 1 : 0;
      const userCalc = userCorrect
        ? getBattlePoints(userTimeSpent, nextYouStreak, totalSeconds)
        : { points: 0, speedScore: 0, streakMultiplier: 1 };
      const appliedPenalty = userCorrect ? Math.min(userCalc.points, pendingHintDebt) : 0;
      const userPoints = userCorrect ? Math.max(0, userCalc.points - appliedPenalty) : 0;

      const opponentCorrect = Math.random() > 0.35;
      const opponentTimeSpent = opponentCorrect ? getOpponentTimeSpent(totalSeconds) : totalSeconds;
      const nextOpponentStreak = opponentCorrect ? opponentStreak + 1 : 0;
      const opponentCalc = opponentCorrect
        ? getBattlePoints(opponentTimeSpent, nextOpponentStreak, totalSeconds)
        : { points: 0, speedScore: 0, streakMultiplier: 1 };
      const opponentPoints = opponentCalc.points;

      setResolvingRound(true);
      setRevealed(true);
      setRoundBurst({
        userPoints,
        opponentPoints,
        userMultiplier: userCalc.streakMultiplier,
        opponentMultiplier: opponentCalc.streakMultiplier,
        userHintPenalty: appliedPenalty,
      });
      setAnsweredRoundMap((prev) => ({
        ...prev,
        [index]: { answer: userAnswer, correct: userCorrect },
      }));
      setPendingHintDebt(userCorrect ? pendingHintDebt - appliedPenalty : pendingHintDebt);

      setYouScore((score) => score + userPoints);
      setOpponentScore((score) => score + opponentPoints);
      setYouCorrectCount((count) => count + (userCorrect ? 1 : 0));
      setOpponentCorrectCount((count) => count + (opponentCorrect ? 1 : 0));
      setYouStreak(nextYouStreak);
      setOpponentStreak(nextOpponentStreak);
      setBestYouStreak((best) => Math.max(best, nextYouStreak));
      setBestOpponentStreak((best) => Math.max(best, nextOpponentStreak));
      setRoundResults((results) => [
        ...results,
        {
          id: roundResultIdRef.current++,
          round: index + 1,
          question: question.question,
          correctAnswer: question.correctAnswer,
          userAnswer,
          userCorrect,
          userTimeSpent,
          userPoints,
          userStreakAfter: nextYouStreak,
          opponentAnswer: opponentCorrect ? question.correctAnswer : null,
          opponentCorrect,
          opponentTimeSpent,
          opponentPoints,
          opponentStreakAfter: nextOpponentStreak,
        },
      ]);
      setResolvingRound(false);

      setRoundNotification({
        title: userCorrect ? "Correct Answer" : "Incorrect Answer",
        body: index >= battleQuestions.length - 1
          ? "Final round completed."
          : userCorrect
            ? "Nice work! Moving to the next round..."
            : "Moving to the next question...",
      });

      const shouldAutoAdvance = activeMode?.id !== "pics-word" || userCorrect;
      if (shouldAutoAdvance) {
        const nextDelayMs = Math.max(1, nextQuestionDelaySeconds) * 1000;
        setTimeout(() => {
          if (index >= battleQuestions.length - 1) {
            setState("finished");
            return;
          }
          advanceRound();
        }, nextDelayMs);
      }
    },
    [
      activeMode?.secondsPerRound,
      advanceRound,
      answeredRoundMap,
      battleQuestions.length,
      index,
      opponentStreak,
      pendingHintDebt,
      question,
      resolvingRound,
      activeMode?.id,
      nextQuestionDelaySeconds,
      youStreak,
    ]
  );

  useEffect(() => {
    if (!roundNotification) return;
    const timer = setTimeout(() => setRoundNotification(null), 1200);
    return () => clearTimeout(timer);
  }, [roundNotification]);

  useEffect(() => {
    if (state !== "playing") return;

    const answeredRound = answeredRoundMap[index];
    if (answeredRound) {
      setSelected(answeredRound.answer);
      setRevealed(true);
    } else {
      setSelected(null);
      setRevealed(false);
    }

    setResolvingRound(false);
    setRoundBurst(null);
    setUsedHintIndices([]);
    setCurrentHintPenalty(0);
    setPicsSelectedIndices([]);
    roundStartedAtRef.current = Date.now();
  }, [answeredRoundMap, index, state]);

  useEffect(() => {
    if (!isBattleOngoing) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isBattleOngoing]);

  useEffect(() => {
    if (!isBattleOngoing) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const insideArena = arenaRef.current?.contains(anchor);
      if (insideArena) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingLeaveHref(anchor.href);
      setShowLeaveConfirm(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isBattleOngoing]);

  useEffect(() => {
    if (state !== "searching") return;
    const timer = setTimeout(() => {
      setCountdown(5);
      setState("found");
    }, 1800);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "found") return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setState("playing");
          roundStartedAtRef.current = Date.now();
          setMatchElapsedSeconds(0);
          setTimeLeft(activeMode?.secondsPerRound ?? 12);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMode?.secondsPerRound, state]);

  useEffect(() => {
    if (state !== "playing") return;
    const interval = setInterval(() => {
      setMatchElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (setupTab !== "queue" || state !== "idle") return;
    void loadQueuePlayers();
  }, [loadQueuePlayers, setupTab, state]);

  useEffect(() => {
    if (setupTab !== "queue" || state !== "idle" || !queuePlayers.length) return;
    const interval = setInterval(() => {
      setQueuePlayers((current) => current.map((player) => ({ ...player, waitingSeconds: player.waitingSeconds + 1 })));
    }, 1000);
    return () => clearInterval(interval);
  }, [queuePlayers.length, setupTab, state]);

  useEffect(() => {
    if (state !== "playing" || isPicsWordMode || revealed || resolvingRound) return;
    const interval = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          const totalSeconds = activeMode?.secondsPerRound ?? 12;
          resolveRound(null, totalSeconds);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode?.secondsPerRound, isPicsWordMode, resolveRound, resolvingRound, revealed, state]);

  useEffect(() => {
    if (state !== "playing" || isPicsWordMode) return;
    setTimeLeft(activeMode?.secondsPerRound ?? 12);
  }, [activeMode?.secondsPerRound, index, isPicsWordMode, state]);

  const startSearch = async () => {
    if (!selectedMode || !selectedCategory) return;
    setIsPreparingMatch(true);

    try {
      const prepared = await buildBattleQuestions(selectedCategory, selectedMode, selectedQuestionCount);
      if (!prepared.questions.length) return;

      setBattleQuestions(prepared.questions);
      setResolvedCategoryName(prepared.resolvedCategoryName);
      setState("searching");
      setIndex(0);
      setSelected(null);
      setRevealed(false);
      setResolvingRound(false);
      setYouScore(0);
      setOpponentScore(0);
      setYouCorrectCount(0);
      setOpponentCorrectCount(0);
      setYouStreak(0);
      setOpponentStreak(0);
      setBestYouStreak(0);
      setBestOpponentStreak(0);
      setRoundResults([]);
      setRoundBurst(null);
      setUsedHintIndices([]);
      setCurrentHintPenalty(0);
      setPendingHintDebt(0);
      setAnsweredRoundMap({});
      setShowSurrenderConfirm(false);
      setHasSurrendered(false);
      setShowLeaveConfirm(false);
      setPendingLeaveHref(null);
      forfeitRecordedRef.current = false;
      setRoundNotification(null);
      setZoomedImage(null);
      setSelectedQueuePlayer(null);
      setMatchElapsedSeconds(0);
      setTimeLeft(activeMode?.secondsPerRound ?? 12);
      setCountdown(5);
      if (queuedOpponentOverride) {
        setMatchedOpponent(queuedOpponentOverride);
      } else {
        void pickOpponent().then((opponent) => setMatchedOpponent(opponent));
      }
    } finally {
      setIsPreparingMatch(false);
    }
  };

  const resetToSetup = () => {
    setState("idle");
    setSetupTab("mode");
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setResolvingRound(false);
    setYouScore(0);
    setOpponentScore(0);
    setYouCorrectCount(0);
    setOpponentCorrectCount(0);
    setYouStreak(0);
    setOpponentStreak(0);
    setBestYouStreak(0);
    setBestOpponentStreak(0);
    setRoundResults([]);
    setRoundBurst(null);
    setUsedHintIndices([]);
    setCurrentHintPenalty(0);
    setPendingHintDebt(0);
    setAnsweredRoundMap({});
    setShowSurrenderConfirm(false);
    setHasSurrendered(false);
    setResolvedCategoryName(null);
    setMatchElapsedSeconds(0);
    setTimeLeft(activeMode?.secondsPerRound ?? 12);
    setIsPreparingMatch(false);
    setShowLeaveConfirm(false);
    setPendingLeaveHref(null);
    setRoundNotification(null);
    setZoomedImage(null);
    setSelectedQueuePlayer(null);
    setQueuedOpponentOverride(null);
    forfeitRecordedRef.current = false;
  };

  useEffect(() => {
    if (state !== "finished" || !selectedMode || !selectedCategory) return;

    const playedCategory = battleCategoryLabel ?? selectedCategoryLabel ?? selectedCategory;
    const battleKey = `${selectedMode}:${playedCategory}:${youScore}:${opponentScore}:${battleQuestions.length}:${matchedOpponent.username}`;
    if (persistedBattleKeyRef.current === battleKey) return;
    persistedBattleKeyRef.current = battleKey;

    const result = youScore > opponentScore ? "win" : youScore < opponentScore ? "loss" : "draw";
    void persistBattleSessionToSupabase({
      mode: selectedMode,
      category: playedCategory,
      result,
      userScore: youScore,
      opponentScore,
      opponentName: matchedOpponent.username,
    });
  }, [battleCategoryLabel, battleQuestions.length, matchedOpponent.username, opponentScore, selectedCategory, selectedCategoryLabel, selectedMode, state, youScore]);

  const chooseAnswer = (value: string) => {
    if (revealed || state !== "playing" || !question || answeredRoundMap[index]) return;
    setSelected(value);
    setResolvingRound(true);
    const userTimeSpent = roundStartedAtRef.current ? Math.max(0, Math.round((Date.now() - roundStartedAtRef.current) / 1000)) : 0;
    setTimeout(() => resolveRound(value, userTimeSpent), 450);
  };

  const usePicsHint = () => {
    if (!currentPicsPuzzle || state !== "playing" || revealed || resolvingRound) return;
    const targetChars = currentPicsPuzzle.targetWord.split("");

    const candidateSlots = targetChars
      .map((char, slotIndex) => ({ char, slotIndex }))
      .filter(({ slotIndex, char }) => {
        const currentChar = picsPickedLetters[slotIndex] ?? null;
        return currentChar !== char;
      });

    if (!candidateSlots.length) return;

    const selectedSlot = candidateSlots[Math.floor(Math.random() * candidateSlots.length)];
    const bankIndex = currentPicsPuzzle.letterBank.findIndex(
      (char, idx) => char === selectedSlot.char && !picsSelectedIndices.includes(idx) && !usedHintIndices.includes(idx)
    );

    if (bankIndex < 0) return;

    const nextSelection = [...picsSelectedIndices];
    if (selectedSlot.slotIndex >= nextSelection.length) {
      while (nextSelection.length < selectedSlot.slotIndex) {
        const filler = currentPicsPuzzle.letterBank.findIndex((_, idx) => !nextSelection.includes(idx) && idx !== bankIndex);
        if (filler < 0) break;
        nextSelection.push(filler);
      }
      nextSelection.push(bankIndex);
    } else {
      nextSelection[selectedSlot.slotIndex] = bankIndex;
    }

    setPicsSelectedIndices(nextSelection.slice(0, currentPicsPuzzle.targetWord.length));
    setUsedHintIndices((prev) => [...prev, bankIndex]);
    setCurrentHintPenalty((value) => value + 25);

    const hintCost = 25;
    const immediateDeduction = Math.min(hintCost, youScore);
    if (immediateDeduction > 0) {
      setYouScore((score) => score - immediateDeduction);
    }
    if (immediateDeduction < hintCost) {
      setPendingHintDebt((value) => value + (hintCost - immediateDeduction));
    }

    setRoundNotification({
      title: "Hint Used",
      body: immediateDeduction < hintCost
        ? `-${immediateDeduction} now, -${hintCost - immediateDeduction} pending.`
        : "-25 points applied.",
    });
  };

  const addPicsLetter = (indexInBank: number) => {
    if (!currentPicsPuzzle || state !== "playing" || revealed || resolvingRound) return;
    if (picsSelectedIndices.includes(indexInBank)) return;
    if (picsSelectedIndices.length >= currentPicsPuzzle.targetWord.length) return;

    setPicsSelectedIndices((prev) => [...prev, indexInBank]);
  };

  const removePicsLetterAt = (slotIndex: number) => {
    if (state !== "playing" || revealed || resolvingRound) return;
    setPicsSelectedIndices((prev) => prev.filter((_, indexInSelection) => indexInSelection !== slotIndex));
  };

  const clearPicsSelection = () => {
    if (state !== "playing" || revealed || resolvingRound) return;
    setPicsSelectedIndices([]);
  };

  useEffect(() => {
    setPicsSelectedIndices([]);
    setPicsShake(false);
  }, [index, state]);

  useEffect(() => {
    if (!currentPicsPuzzle || state !== "playing" || revealed || resolvingRound) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        setPicsSelectedIndices((prev) => prev.slice(0, -1));
        return;
      }

      if (event.key.length !== 1 || !/[a-z]/i.test(event.key)) return;

      const typed = event.key.toUpperCase();
      const bankIndex = currentPicsPuzzle.letterBank.findIndex(
        (char, idx) => char === typed && !picsSelectedIndices.includes(idx)
      );

      if (bankIndex < 0) return;
      if (picsSelectedIndices.length >= currentPicsPuzzle.targetWord.length) return;

      event.preventDefault();
      setPicsSelectedIndices((prev) => [...prev, bankIndex]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPicsPuzzle, picsSelectedIndices, resolvingRound, revealed, state]);

  useEffect(() => {
    if (!currentPicsPuzzle || state !== "playing" || revealed || resolvingRound) return;
    if (picsComposedAnswer.length !== currentPicsPuzzle.targetWord.length) return;

    const userTimeSpent = roundStartedAtRef.current
      ? Math.max(0, Math.round((Date.now() - roundStartedAtRef.current) / 1000))
      : 0;

    if (picsComposedAnswer === currentPicsPuzzle.targetWord) {
      setResolvingRound(true);
      setTimeout(() => resolveRound(picsComposedAnswer, userTimeSpent), 300);
      return;
    }

    setPicsShake(true);
    const timer = setTimeout(() => {
      setPicsSelectedIndices([]);
      setPicsShake(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentPicsPuzzle, picsComposedAnswer, resolveRound, resolvingRound, revealed, state]);

  return (
    <section ref={arenaRef} className="quiz-shell relative overflow-hidden rounded-[28px] border border-black/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.7),rgba(255,255,255,0.42))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(15,23,42,0.45))] dark:shadow-[0_26px_68px_rgba(2,8,25,0.52)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-500/25" />
      <div className="pointer-events-none absolute -bottom-16 left-12 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-400/20" />
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative z-[1] space-y-5">
            <div className="grid gap-4 rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur md:grid-cols-[1fr_auto] dark:border-white/10 dark:bg-slate-900/42">
              <div>
                <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-200">
                  <Radar className="h-3.5 w-3.5" /> 1v1 Match Configuration
                </p>
                <h2 className="font-sora text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">Build Your Duel</h2>
                <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
                  Choose a mode first, then move to the category tab and finalize your battle setup.
                </p>
              </div>
              <div className="grid min-w-[200px] gap-2 self-start text-sm">
                <div className="rounded-card border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[var(--text-muted)]">Mode</p>
                  <p className="font-semibold text-[var(--text-primary)]">{activeMode?.label ?? "Not selected"}</p>
                </div>
                <div className="rounded-card border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[var(--text-muted)]">Category</p>
                  <p className="font-semibold text-[var(--text-primary)]">{selectedCategoryLabel ?? "Not selected"}</p>
                </div>
                <div className="rounded-card border border-black/10 bg-black/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[var(--text-muted)]">Questions</p>
                  <p className="font-semibold text-[var(--text-primary)]">{selectedQuestionCount}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <button
                  type="button"
                  aria-label="Mode setup tab"
                  onClick={() => setSetupTab("mode")}
                  className={cx(
                    "focus-ring rounded-button border px-4 py-2 text-sm font-semibold",
                    setupTab === "mode"
                      ? "border-violet-400/45 bg-violet-500/12 text-violet-700 dark:text-violet-200"
                      : "border-black/10 bg-white/50 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5"
                  )}
                >
                  1. Select Mode
                </button>
                <button
                  type="button"
                  aria-label="Category setup tab"
                  onClick={() => selectedMode && setSetupTab("category")}
                  disabled={!selectedMode}
                  className={cx(
                    "focus-ring rounded-button border px-4 py-2 text-sm font-semibold",
                    setupTab === "category"
                      ? "border-cyan-400/45 bg-cyan-500/12 text-cyan-700 dark:text-cyan-200"
                      : "border-black/10 bg-white/50 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5",
                    !selectedMode && "cursor-not-allowed opacity-55"
                  )}
                >
                  2. Choose Category
                </button>
                <button
                  type="button"
                  aria-label="Open player queue tab"
                  onClick={() => setSetupTab("queue")}
                  className={cx(
                    "focus-ring rounded-button border px-3 py-2 text-sm font-semibold",
                    setupTab === "queue"
                      ? "border-cyan-500/45 bg-cyan-500/12 text-cyan-700 dark:text-cyan-100"
                      : "border-black/10 bg-white/50 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5"
                  )}
                  title="Player Queue"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>

              {setupTab === "mode" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {battleModes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = selectedMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        aria-label={`Select ${mode.label}`}
                        onClick={() => {
                          setSelectedMode(mode.id);
                          setSetupTab("category");
                        }}
                        className={cx(
                          "focus-ring arcade-btn group rounded-[18px] border p-3.5 text-left",
                          isActive
                            ? "border-violet-400/50 bg-violet-500/14 shadow-[0_10px_22px_rgba(124,58,237,0.2)]"
                            : "border-black/10 bg-white/65 hover:-translate-y-0.5 hover:border-violet-300 dark:border-white/10 dark:bg-white/5"
                        )}
                      >
                        <p className="mb-1 inline-flex items-center gap-2 font-sora text-base font-semibold text-[var(--text-primary)]">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/12 text-violet-600 dark:text-violet-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          {mode.label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{mode.description}</p>
                        <div className="mt-2 flex gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                          <span>{mode.rounds} rounds</span>
                          <span>•</span>
                          <span>{mode.secondsPerRound}s each</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : setupTab === "category" ? (
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                    <Sparkles className="h-4 w-4 text-cyan-500" /> {activeMode?.label ?? "Selected mode"} • Choose category
                  </p>
                  <div className="rounded-[16px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Question Count</p>
                    <div className="flex flex-wrap gap-2">
                      {questionCountOptions.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSelectedQuestionCount(count)}
                          className={cx(
                            "focus-ring arcade-btn rounded-full border px-3 py-1.5 text-xs font-semibold",
                            selectedQuestionCount === count
                              ? "border-cyan-500/45 bg-cyan-500/14 text-cyan-700 dark:text-cyan-100"
                              : "border-black/10 bg-white/55 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5"
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <button
                      type="button"
                      aria-label="Select Random category"
                      onClick={() => setSelectedCategory(RANDOM_CATEGORY_ID)}
                      className={cx(
                        "focus-ring arcade-btn relative overflow-hidden rounded-[18px] border p-2.5 text-left",
                        selectedCategory === RANDOM_CATEGORY_ID
                          ? "border-cyan-400/60 bg-cyan-500/12 shadow-[0_10px_22px_rgba(34,211,238,0.18)]"
                          : "border-black/10 bg-white/65 hover:-translate-y-0.5 hover:border-cyan-300 dark:border-white/10 dark:bg-white/5"
                      )}
                    >
                      <div className="absolute right-3 top-3 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                        Mix
                      </div>
                      <div className="mb-2 flex items-center justify-between pr-12">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-cyan-500/15 text-cyan-300">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>
                      <h3 className="mb-1 font-sora text-lg font-semibold text-[var(--text-primary)]">Random</h3>
                      <p className="text-sm text-[var(--text-secondary)]">Auto-picks a dashboard category for each battle.</p>
                    </button>
                    {categoryMeta.map((category) => (
                      <CategoryCard
                        key={category.name}
                        iconName={category.iconName}
                        name={category.name}
                        difficulty={category.difficulty}
                        color={category.color}
                        active={selectedCategory === category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        hideDifficulty
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                      <Users className="h-4 w-4 text-cyan-400" /> Live Match Queue
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadQueuePlayers()}
                      className="focus-ring arcade-btn rounded-full border border-cyan-500/40 bg-cyan-500/12 px-2.5 py-1.5 text-xs text-cyan-700 dark:border-cyan-400/35 dark:text-cyan-100"
                      aria-label="Refresh queue"
                      title="Refresh queue"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="rounded-[16px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    {isQueueLoading ? (
                      <div className="grid place-items-center py-8 text-sm text-[var(--text-secondary)]">
                        <LoaderCircle className="mb-2 h-5 w-5 animate-spin text-cyan-300" /> Loading players in queue...
                      </div>
                    ) : queuePlayers.length ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {queuePlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => setSelectedQueuePlayer(player)}
                            className="focus-ring group relative overflow-hidden text-left rounded-[18px] border border-cyan-500/30 bg-[linear-gradient(155deg,rgba(14,165,233,0.14),rgba(56,189,248,0.08)_55%,rgba(255,255,255,0.85))] p-3.5 shadow-[0_8px_20px_rgba(6,95,140,0.12)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-[0_14px_30px_rgba(6,95,140,0.22)] dark:border-cyan-400/25 dark:bg-[linear-gradient(155deg,rgba(14,165,233,0.18),rgba(30,64,175,0.12)_45%,rgba(15,23,42,0.2))] dark:shadow-[0_10px_26px_rgba(8,47,73,0.2)] dark:hover:border-cyan-300/55 dark:hover:shadow-[0_16px_34px_rgba(8,47,73,0.32)]"
                          >
                            <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-400/15 blur-2xl transition group-hover:bg-cyan-400/25 dark:bg-cyan-300/20 dark:group-hover:bg-cyan-300/30" />
                            <span className="pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                            <div className="flex items-center gap-2">
                              <ProfilePhoto photo={player.photo} fallbackText={player.username} className="h-10 w-10 border-cyan-400/45" />
                              <div className="min-w-0">
                                <p className="truncate font-sora text-base font-semibold text-[var(--text-primary)]">{player.username}</p>
                                <p className="text-xs font-semibold text-cyan-700/90 dark:text-cyan-100/85">{player.rank}</p>
                              </div>
                            </div>
                            <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-secondary)]">
                              <p>Mode: {battleModes.find((mode) => mode.id === player.preferredMode)?.label ?? "Classic Quiz"}</p>
                              <p>Category: {player.preferredCategory}</p>
                              <p className="inline-flex items-center gap-1 font-semibold text-cyan-700/90 dark:text-cyan-100/90"><Clock3 className="h-3 w-3" /> Waiting: {player.waitingSeconds}s</p>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700/95 dark:text-cyan-100/95">Tap to challenge</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid place-items-center py-8 text-sm text-[var(--text-secondary)]">
                        No players are currently waiting. Try refreshing.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid grid-cols-3 items-center text-center">
                  <div className="grid gap-1">
                    <ProfilePhoto
                      photo={profilePhoto}
                      fallbackText={displayName}
                      className="mx-auto h-11 w-11 border-violet-400/40"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">{displayName}</span>
                  </div>
                  <span className="font-sora text-2xl font-bold text-violet-500">VS</span>
                  <div className="grid gap-1">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-orange-400/45 bg-orange-500/16 font-semibold text-orange-700 dark:text-orange-200">?</span>
                    <span className="text-xs text-[var(--text-secondary)]">Opponent</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Find opponent"
                  onClick={() => void startSearch()}
                  disabled={!selectedMode || !selectedCategory || isPreparingMatch}
                  className={cx(
                    "focus-ring arcade-btn btn-success inline-flex w-full items-center justify-center gap-2 rounded-button px-5 py-3 text-sm font-semibold sm:w-auto",
                    (!selectedMode || !selectedCategory || isPreparingMatch) && "cursor-not-allowed opacity-55"
                  )}
                >
                  <Swords className="h-4 w-4" /> {isPreparingMatch ? "Loading Questions..." : `Find Opponent (${selectedQuestionCount} Q)`}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {state === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] grid place-items-center gap-4 py-12 text-center">
            <LoaderCircle className="h-10 w-10 animate-spin text-violet-300" />
            <p className="font-sora text-xl text-[var(--text-primary)]">Finding opponent...</p>
            <p className="text-sm text-[var(--text-secondary)]">Matching you with a player near your skill tier</p>
            {activeMode && selectedCategoryLabel && (
              <p className="text-xs text-[var(--text-muted)]">
                {activeMode.label} • {selectedCategoryLabel}
              </p>
            )}
            <button
              type="button"
              aria-label="Cancel matchmaking"
              onClick={resetToSetup}
              className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-red-400 hover:text-red-700 dark:border-white/15 dark:text-white/75 dark:hover:text-red-200"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {state === "found" && (
          <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] py-4">
            <div className="quiz-meta grid grid-cols-3 items-center gap-4 text-center">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-violet-400/25 bg-violet-500/10 p-4">
                <ProfilePhoto
                  photo={profilePhoto}
                  fallbackText={displayName}
                  className="mx-auto mb-2 h-12 w-12 border-violet-400/40"
                />
                <p className="text-[var(--text-primary)]">{displayName}</p>
                <p className="text-xs text-[var(--text-secondary)]">{tier}</p>
              </motion.div>
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-sora text-3xl font-bold text-violet-300">
                VS
              </motion.div>
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="rounded-card border border-orange-400/25 bg-orange-500/10 p-4">
                <ProfilePhoto
                  photo={matchedOpponent.photo}
                  fallbackText={matchedOpponent.username}
                  className="mx-auto mb-2 h-12 w-12 border-orange-400/40"
                />
                <p className="text-[var(--text-primary)]">{matchedOpponent.username}</p>
                <p className="text-xs text-[var(--text-secondary)]">{matchedOpponent.rank}</p>
              </motion.div>
            </div>
            <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
              {activeMode?.label} • {selectedCategoryLabel}
            </p>
            <p className="mt-1 text-center text-xs text-cyan-700/90 dark:text-cyan-200/90">
              {selectedCategory === RANDOM_CATEGORY_ID
                ? `Random picked: ${resolvedCategoryName ?? "Loading..."}`
                : `Category locked: ${resolvedCategoryName ?? activeCategory?.name ?? "Loading..."}`}
            </p>
            <div className="mt-5 flex justify-center">
              <div className="glass inline-flex items-center gap-3 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm text-[var(--text-primary)]">
                <span className="font-semibold text-cyan-200"></span>
                <span className="text-[var(--text-secondary)]">Match begins in {countdown}s</span>
              </div>
            </div>
          </motion.div>
        )}

        {state === "countdown" && (
          <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] grid place-items-center gap-3 py-12 text-center">
            <p className="font-sora text-lg text-[var(--text-secondary)]">Get ready...</p>
            <p className="font-sora text-6xl font-bold text-[var(--text-primary)]">{countdown}</p>
            <p className="text-sm text-[var(--text-muted)]">Battle starts now</p>
          </motion.div>
        )}

        {state === "playing" && question && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-[1] quiz-shell">
            {(() => {
              const maxBattlePoints = Math.max(1, battleQuestions.length * 250);

              return (
            <div className={cx("quiz-meta mb-3 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center", !isPicsWordMode && "hidden")}>
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="h-2 rounded-full bg-violet-400" style={{ width: `${(youScore / maxBattlePoints) * 100}%` }} />
              </div>
              <div className="grid h-12 min-w-[74px] place-items-center rounded-full border border-cyan-500/35 bg-cyan-100/75 px-3 text-[11px] font-semibold text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-cyan-100">
                {formatElapsedTime(matchElapsedSeconds)}
              </div>
              <div className="rounded-full bg-black/5 p-1 dark:bg-white/8">
                <div className="ml-auto h-2 rounded-full bg-orange-400" style={{ width: `${(opponentScore / maxBattlePoints) * 100}%` }} />
              </div>
            </div>
              );
            })()}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-black/10 bg-black/5 p-2.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center gap-1.5">
                {battleQuestions.map((_, roundIndex) => {
                  const answered = answeredRoundMap[roundIndex];
                  const isActive = roundIndex === index;
                  return (
                    <div key={`round-strip-${roundIndex + 1}`} className="grid justify-items-center gap-1">
                      <button
                        type="button"
                        onClick={() => jumpToRound(roundIndex)}
                        className={cx(
                          "focus-ring arcade-btn h-8 min-w-8 rounded-full border px-2 text-xs font-semibold",
                          isActive
                            ? "border-violet-500/45 bg-violet-200/75 text-violet-800 dark:border-violet-400/50 dark:bg-violet-500/16 dark:text-violet-100"
                            : answered
                              ? answered.correct
                                ? "border-emerald-500/45 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/12 dark:text-emerald-100"
                                : "border-rose-500/45 bg-rose-100 text-rose-800 dark:border-rose-400/40 dark:bg-rose-500/12 dark:text-rose-100"
                              : "border-black/10 bg-white/80 text-slate-600 dark:border-white/15 dark:bg-white/8 dark:text-[var(--text-secondary)]"
                        )}
                        aria-label={`Go to round ${roundIndex + 1}`}
                        title={`Round ${roundIndex + 1}`}
                      >
                        {roundIndex + 1}
                      </button>
                      <span className="grid h-3.5 w-3.5 place-items-center text-[10px] text-[var(--text-muted)]">
                        {!answered ? (
                          <span>•</span>
                        ) : answered.correct ? (
                          <CircleCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                        ) : (
                          <CircleX className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowSurrenderConfirm(true)}
                className="focus-ring arcade-btn grid h-9 w-9 place-items-center rounded-full border border-rose-500/40 bg-rose-500/14 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/12 dark:text-rose-100"
                aria-label="Surrender match"
                title="Surrender"
              >
                <Flag className="h-4 w-4" />
              </button>
            </div>

            {!isPicsWordMode ? (
              <div className="mb-3 flex justify-center">
                <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5">
                  <Timer timeLeft={timeLeft} total={activeMode?.secondsPerRound ?? 12} />
                </div>
              </div>
            ) : null}

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <div className="relative overflow-hidden rounded-[16px] border border-violet-400/25 bg-gradient-to-br from-violet-500/14 via-violet-500/8 to-transparent p-3 text-left">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">You</p>
                <motion.p
                  key={`you-${youScore}`}
                  initial={{ opacity: 0.45, scale: 0.84, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="font-sora text-2xl font-bold text-[var(--text-primary)]"
                >
                  {youScore}
                </motion.p>
                <AnimatePresence>
                  {revealed && roundBurst && roundBurst.userPoints > 0 ? (
                    <motion.div
                      key={`burst-you-${index}-${youScore}`}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="pointer-events-none absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-500/14 px-2.5 py-1 text-[11px] font-semibold text-emerald-100"
                    >
                      +{roundBurst.userPoints}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>Streak x{youStreak}</span>
                  <AnimatePresence>
                    {revealed && roundBurst && roundBurst.userPoints > 0 ? (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2 py-0.5 font-semibold text-emerald-200"
                      >
                        +{roundBurst.userPoints} x{roundBurst.userMultiplier}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[16px] border border-orange-400/25 bg-gradient-to-br from-orange-500/14 via-orange-500/8 to-transparent p-3 text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent</p>
                <motion.p
                  key={`opp-${opponentScore}`}
                  initial={{ opacity: 0.45, scale: 0.84, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="font-sora text-2xl font-bold text-[var(--text-primary)]"
                >
                  {opponentScore}
                </motion.p>
                <AnimatePresence>
                  {revealed && roundBurst && roundBurst.opponentPoints > 0 ? (
                    <motion.div
                      key={`burst-opp-${index}-${opponentScore}`}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="pointer-events-none absolute right-3 top-3 rounded-full border border-orange-400/40 bg-orange-500/14 px-2.5 py-1 text-[11px] font-semibold text-orange-50"
                    >
                      +{roundBurst.opponentPoints}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)] sm:justify-end">
                  <span>Streak x{opponentStreak}</span>
                  <AnimatePresence>
                    {revealed && roundBurst && roundBurst.opponentPoints > 0 ? (
                      <motion.span
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-full border border-orange-400/35 bg-orange-500/12 px-2 py-0.5 font-semibold text-orange-100"
                      >
                        +{roundBurst.opponentPoints} x{roundBurst.opponentMultiplier}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="quiz-question glass mb-3 rounded-card p-4 text-center">
              <p className="mb-2 text-xs text-violet-700 dark:text-violet-200">Round {index + 1} / {battleQuestions.length}</p>
              <p className="font-sora text-[1.5rem] font-semibold text-[var(--text-primary)] sm:text-[1.7rem]">{question.question}</p>
              {answeredRound ? (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  <CircleCheck className="h-3.5 w-3.5" /> Round already answered
                </p>
              ) : null}
            </div>

            {activeMode?.id === "pics-word" && currentPicsPuzzle ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {currentPicsPuzzle.imageUrls.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="overflow-hidden rounded-[14px] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Picture clue ${idx + 1}`}
                        className="h-28 w-full cursor-zoom-in object-cover sm:h-36"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = getPicsFallbackImage(resolvedCategoryName ?? activeCategory?.name ?? "quiz", idx);
                        }}
                        onClick={() => setZoomedImage({ url, alt: `Picture clue ${idx + 1}` })}
                      />
                    </div>
                  ))}
                </div>

                <motion.div
                  animate={picsShake ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                  transition={{ duration: 0.32, ease: "easeOut" }}
                  className="rounded-[14px] border border-cyan-500/30 bg-cyan-100/65 p-3 dark:border-cyan-400/25 dark:bg-cyan-500/8"
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Arrange letters</p>
                  <div className="mb-2 flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: currentPicsPuzzle.targetWord.length }).map((_, slotIndex) => {
                      const letter = displayedPicsLetters[slotIndex] ?? "";
                      return (
                        <button
                          key={`slot-${slotIndex}`}
                          type="button"
                          onClick={() => removePicsLetterAt(slotIndex)}
                          className={cx(
                            "focus-ring grid h-10 w-9 place-items-center rounded-[10px] border text-sm font-bold",
                            letter
                              ? "border-cyan-500/45 bg-cyan-200/80 text-cyan-900 dark:border-cyan-300/45 dark:bg-cyan-500/16 dark:text-cyan-100"
                              : "border-slate-300/70 bg-white/80 text-slate-500 dark:border-white/20 dark:bg-white/5 dark:text-white/35"
                          )}
                          aria-label={`Answer slot ${slotIndex + 1}`}
                        >
                          {letter || "_"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7">
                    {currentPicsPuzzle.letterBank.map((char, bankIndex) => {
                      const used = picsSelectedIndices.includes(bankIndex);
                      return (
                        <button
                          key={`${char}-${bankIndex}`}
                          type="button"
                          disabled={used || revealed || resolvingRound}
                          onClick={() => addPicsLetter(bankIndex)}
                          className={cx(
                            "focus-ring h-9 rounded-[10px] border text-sm font-bold transition",
                            used
                              ? "cursor-not-allowed border-slate-300/70 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white/25"
                              : "border-cyan-500/45 bg-cyan-100 text-cyan-900 hover:bg-cyan-200 dark:border-cyan-300/35 dark:bg-cyan-500/12 dark:text-cyan-100 dark:hover:bg-cyan-500/20"
                          )}
                          aria-label={`Letter ${char}`}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex justify-end">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={usePicsHint}
                        disabled={revealed || resolvingRound}
                        className="focus-ring arcade-btn grid h-9 w-9 place-items-center rounded-full border border-amber-500/50 bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)] dark:border-amber-400/35 dark:bg-amber-500/12 dark:text-amber-100"
                        aria-label="Use hint"
                        title="Use hint (-25)"
                      >
                        <Lightbulb className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={clearPicsSelection}
                        disabled={revealed || resolvingRound || !picsSelectedIndices.length}
                        className="focus-ring arcade-btn rounded-button border border-black/10 px-3 py-1.5 text-xs text-[var(--text-secondary)] dark:border-white/15 dark:text-white/80"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className={cx(
                "quiz-options grid gap-2.5",
                activeMode?.id === "true-false"
                  ? "grid-cols-2"
                  : question.options.length > 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-1 sm:max-w-md sm:mx-auto"
              )}>
                {question.options.map((opt, i) => (
                  <AnswerButton
                    key={`${opt}-${i}`}
                    label={letters[i]}
                    value={opt}
                    selected={selected === opt}
                    revealed={revealed}
                    isCorrect={question.correctAnswer === opt}
                    onClick={() => chooseAnswer(opt)}
                  />
                ))}
              </div>
            )}

            {revealed && isPicsWordMode ? (
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={finishBattle}
                  className="focus-ring arcade-btn btn-primary inline-flex items-center gap-2 rounded-button px-4 py-2 text-sm font-semibold"
                >
                  Finish Match <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {isPicsWordMode && pendingHintDebt > 0 ? (
              <div className="mt-2 text-center text-xs text-amber-200/90">
                Pending hint deduction: -{pendingHintDebt} points on your next successful answer.
              </div>
            ) : null}
            {isPicsWordMode && currentHintPenalty > 0 ? (
              <div className="mt-1 text-center text-xs text-amber-100/80">
                Hint used this round: -{currentHintPenalty} points.
              </div>
            ) : null}
          </motion.div>
        )}

        {state === "finished" && (
          <motion.div key="finished" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="relative z-[1] space-y-4">
            <section className={cx(
              "overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] backdrop-blur-xl",
              battleSummary.winner === "you"
                ? "border-emerald-400/30 bg-emerald-500/10 dark:bg-emerald-500/10"
                : battleSummary.winner === "opponent"
                  ? "border-rose-400/30 bg-rose-500/10 dark:bg-rose-500/10"
                  : "border-amber-400/30 bg-amber-500/10 dark:bg-amber-500/10"
            )}>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-white/70">
                    <Crown className="h-3.5 w-3.5 text-violet-200" /> Match Complete
                  </p>
                  <h2 className="font-sora text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                    {hasSurrendered ? "Surrendered" : battleSummary.winner === "you" ? "Victory" : battleSummary.winner === "opponent" ? "Defeat" : "Draw"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
                    {selectedMode ? `${battleModes.find((mode) => mode.id === selectedMode)?.label ?? "Battle"} • ` : ""}
                    {battleCategoryLabel ?? selectedCategoryLabel ?? "Selected category"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-[var(--text-muted)]">
                    Winner is determined by the total score gathered across the match. Faster answers and longer streaks earn more points.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <div className="rounded-[18px] border border-black/10 bg-white/70 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-[var(--text-muted)]">Winner</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      {battleSummary.winner === "you" ? displayName : battleSummary.winner === "opponent" ? matchedOpponent.username : "Tie"}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-white/70 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-[var(--text-muted)]">Margin</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">+{battleSummary.margin}</p>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-white/70 p-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-[var(--text-muted)]">Rounds</p>
                    <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">{battleSummary.totalRoundsLabel}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[18px] border border-violet-400/25 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Your Score</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{youScore}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Accuracy {battleSummary.userAccuracy}% • Best streak {bestYouStreak}</p>
                </div>
                <div className="rounded-[18px] border border-orange-400/25 bg-orange-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent Score</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{opponentScore}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Accuracy {battleSummary.opponentAccuracy}% • Best streak {bestOpponentStreak}</p>
                </div>
                <div className="rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Your Avg Time</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{battleSummary.userAverageTime}s</p>
                  <p className="text-xs text-[var(--text-secondary)]">Points per round {battleSummary.averagePointsPerRound}</p>
                </div>
                <div className="rounded-[18px] border border-cyan-400/25 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Opponent Avg Time</p>
                  <p className="mt-1 font-sora text-3xl font-bold text-[var(--text-primary)]">{battleSummary.opponentAverageTime}s</p>
                  <p className="text-xs text-[var(--text-secondary)]">{battleSummary.bestRound ? `Best combined round: #${battleSummary.bestRound.round}` : "No recap yet"}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      <Target className="h-4 w-4 text-violet-400" /> Match Stats
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Round performance and battle signals.</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-[var(--text-secondary)]">
                    {battleSummary.roundProgress}% complete
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Best user streak</span>
                      <span className="font-semibold text-[var(--text-primary)]">x{bestYouStreak}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, bestYouStreak * 18)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Best opponent streak</span>
                      <span className="font-semibold text-[var(--text-primary)]">x{bestOpponentStreak}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-400" style={{ width: `${Math.min(100, bestOpponentStreak * 18)}%` }} />
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Resolved category</span>
                      <span className="font-semibold text-[var(--text-primary)]">{battleCategoryLabel ?? resolvedCategoryName ?? selectedCategoryLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-black/10 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/42">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                      <Clock3 className="h-4 w-4 text-cyan-400" /> Round Recap
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">Latest round-by-round scoring snapshot.</p>
                  </div>
                  <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-[var(--text-secondary)]">
                    {roundResults.length} rounds
                  </span>
                </div>

                <div className="max-h-[300px] space-y-2 overflow-auto pr-1">
                  {roundResults.map((round) => (
                    <article key={round.id} className="rounded-[18px] border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">Round {round.round}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{round.question}</p>
                        </div>
                        <span className={cx(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                          round.userPoints >= round.opponentPoints
                            ? "border border-emerald-500/35 bg-emerald-100 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200"
                            : "border border-rose-500/35 bg-rose-100 text-rose-700 dark:border-rose-400/35 dark:bg-rose-500/10 dark:text-rose-200"
                        )}>
                          {round.userPoints >= round.opponentPoints ? "Won" : "Lost"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-[14px] border border-violet-400/20 bg-violet-500/8 p-2.5 text-xs text-[var(--text-secondary)]">
                          <p className="font-semibold text-[var(--text-primary)]">You</p>
                          <p>Answer: {round.userAnswer ?? "No answer"}</p>
                          <p>Points: {round.userPoints} • Streak x{round.userStreakAfter}</p>
                          <p>Time: {round.userTimeSpent}s</p>
                        </div>
                        <div className="rounded-[14px] border border-orange-400/20 bg-orange-500/8 p-2.5 text-xs text-[var(--text-secondary)]">
                          <p className="font-semibold text-[var(--text-primary)]">Opponent</p>
                          <p>Answer: {round.opponentAnswer ?? "Wrong / timeout"}</p>
                          <p>Points: {round.opponentPoints} • Streak x{round.opponentStreakAfter}</p>
                          <p>Time: {round.opponentTimeSpent}s</p>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!roundResults.length ? (
                    <div className="rounded-[18px] border border-black/10 bg-black/5 p-4 text-sm text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5">
                      Round data will appear here once the match is completed.
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                aria-label="Rematch"
                onClick={startSearch}
                disabled={!selectedMode || !selectedCategory}
                className={cx(
                  "focus-ring arcade-btn btn-primary rounded-button px-4 py-2 text-sm",
                  (!selectedMode || !selectedCategory) && "cursor-not-allowed opacity-55"
                )}
              >
                Rematch
              </button>
              <button
                type="button"
                aria-label="Find new opponent"
                onClick={resetToSetup}
                className="focus-ring arcade-btn rounded-button border border-black/8 px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-green-400 hover:text-green-700 dark:border-white/15 dark:text-white/80 dark:hover:text-green-200"
              >
                New Opponent
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roundNotification ? (
          (() => {
            const isIncorrect = roundNotification.title === "Incorrect Answer";
            const notificationClass = isIncorrect
              ? "border-rose-500/45 bg-[linear-gradient(145deg,rgba(255,241,242,0.98),rgba(254,226,226,0.95))] shadow-[0_22px_56px_rgba(153,27,27,0.24)] dark:border-rose-400/35 dark:bg-[linear-gradient(145deg,rgba(239,68,68,0.22),rgba(190,24,93,0.16))] dark:shadow-[0_22px_56px_rgba(153,27,27,0.35)]"
              : "border-emerald-500/45 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(209,250,229,0.95))] shadow-[0_22px_56px_rgba(5,150,105,0.2)] dark:border-emerald-400/35 dark:bg-[linear-gradient(145deg,rgba(16,185,129,0.22),rgba(6,182,212,0.16))] dark:shadow-[0_22px_56px_rgba(5,150,105,0.35)]";
            const titleClass = isIncorrect ? "text-rose-700 dark:text-rose-100" : "text-emerald-700 dark:text-emerald-100";
            const bodyClass = isIncorrect ? "text-rose-600/95 dark:text-rose-50/90" : "text-emerald-700/95 dark:text-emerald-50/90";

            return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`w-full max-w-sm rounded-[20px] border p-5 text-center backdrop-blur-xl ${notificationClass}`}
            >
                <p className={`font-sora text-xl font-bold ${titleClass}`}>{roundNotification.title}</p>
                <p className={`mt-1 text-sm ${bodyClass}`}>{roundNotification.body}</p>
            </motion.div>
          </motion.div>
            );
          })()
        ) : null}

        {zoomedImage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/75 p-4"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-4xl overflow-hidden rounded-[20px] border border-white/20 bg-black/40"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImage.url} alt={zoomedImage.alt} className="max-h-[78vh] w-full object-contain" />
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="focus-ring arcade-btn rounded-button border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {selectedQueuePlayer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="relative w-full max-w-lg rounded-[22px] border border-cyan-400/35 bg-[var(--bg-card)] p-5 shadow-[0_22px_56px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={() => setSelectedQueuePlayer(null)}
                aria-label="Close challenge modal"
                className="focus-ring absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-black/10 text-[var(--text-secondary)] hover:border-cyan-500/45 hover:text-cyan-700 dark:border-white/15 dark:hover:text-cyan-200"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3">
                <ProfilePhoto photo={selectedQueuePlayer.photo} fallbackText={selectedQueuePlayer.username} className="h-11 w-11 border-cyan-400/45" />
                <div>
                  <p className="font-sora text-lg font-semibold text-[var(--text-primary)]">Challenge {selectedQueuePlayer.username}?</p>
                  <p className="text-xs text-[var(--text-secondary)]">{selectedQueuePlayer.rank} • Waiting {selectedQueuePlayer.waitingSeconds}s</p>
                </div>
              </div>

              <div className="mt-3 rounded-[14px] border border-cyan-400/25 bg-black/15 p-3 text-xs text-[var(--text-secondary)]">
                <p>Preferred Mode: {battleModes.find((mode) => mode.id === selectedQueuePlayer.preferredMode)?.label ?? "Classic Quiz"}</p>
                <p>Preferred Category: {selectedQueuePlayer.preferredCategory}</p>
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const opponent = toBattleOpponent(selectedQueuePlayer);
                    setQueuedOpponentOverride(opponent);
                    setMatchedOpponent(opponent);
                    setSelectedMode(selectedQueuePlayer.preferredMode);
                    setSelectedCategory(selectedQueuePlayer.preferredCategory);
                    setSetupTab("category");
                    setSelectedQueuePlayer(null);
                    setTimeout(() => {
                      void startSearch();
                    }, 0);
                  }}
                  className="focus-ring arcade-btn btn-success rounded-button px-4 py-2 text-sm font-semibold"
                >
                  Challenge Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {showSurrenderConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-[22px] border border-rose-400/35 bg-[var(--bg-card)] p-5 shadow-[0_22px_56px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                <Flag className="h-5 w-5 text-rose-500 dark:text-rose-300" /> Confirm Surrender?
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                This will end the match immediately and count as a loss.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSurrenderConfirm(false)}
                  className="focus-ring arcade-btn rounded-button border border-black/10 px-4 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:text-white/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={surrenderBattle}
                  className="focus-ring arcade-btn rounded-button border border-rose-500/45 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/45 dark:bg-rose-500/12 dark:text-rose-100"
                >
                  Surrender
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {showLeaveConfirm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/55 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-[22px] border border-rose-400/35 bg-[var(--bg-card)] p-5 shadow-[0_22px_56px_rgba(15,23,42,0.35)] backdrop-blur-xl"
            >
              <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                <AlertTriangle className="h-5 w-5 text-rose-300" /> Leave Ongoing 1v1 Battle?
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                If you leave now, the opponent wins by default and this match will be saved as a loss.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={stayInBattle}
                  className="focus-ring arcade-btn rounded-button border border-black/10 px-4 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:text-white/80"
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveBattle}
                  className="focus-ring arcade-btn rounded-button border border-rose-400/45 bg-rose-500/16 px-4 py-2 text-sm font-semibold text-rose-100"
                >
                  Leave Battle
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

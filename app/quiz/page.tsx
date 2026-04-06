"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Timer from "@/components/Timer";
import AnswerButton from "@/components/AnswerButton";
import CategoryCard from "@/components/CategoryCard";
import { categoryMeta, questions } from "@/lib/mockData";
import type { AnswerRecord, Difficulty, Question } from "@/lib/types";
import { calculatePoints } from "@/lib/utils";

const letters = ["A", "B", "C", "D"];
const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function QuizPage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<{ status: "correct" | "wrong"; text: string } | null>(null);
  const [quizStart, setQuizStart] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);

  const currentQuestion = quizQuestions[currentIndex];
  const currentOptions = useMemo(() => currentQuestion?.options ?? [], [currentQuestion]);

  const buildQuizQuestions = useCallback((category: string, difficulty: Difficulty) => {
    const exactMatch = questions.filter((question) => question.category === category && question.difficulty === difficulty);
    const categoryMatch = questions.filter((question) => question.category === category);
    const difficultyMatch = questions.filter((question) => question.difficulty === difficulty);

    const orderedPool = [...exactMatch, ...categoryMatch, ...difficultyMatch, ...questions];
    const uniquePool = orderedPool.filter((question, index, all) => all.findIndex((item) => item.id === question.id) === index);

    return uniquePool.slice(0, 10);
  }, []);

  const goToNextQuestion = useCallback(() => {
    const isLastQuestion = currentIndex >= quizQuestions.length - 1;
    if (isLastQuestion) {
      const totalTime = quizStart ? Math.round((Date.now() - quizStart) / 1000) : 0;
      router.push(
        `/results?score=${score}&total=${quizQuestions.length}&category=Mixed&timeTaken=${totalTime}&points=${calculatePoints(answers)}`
      );
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setFeedback(null);
    setTimeLeft(15);
  }, [answers, currentIndex, quizQuestions.length, quizStart, router, score]);

  const startQuiz = () => {
    if (!selectedCategory || !selectedDifficulty) return;
    const nextQuestions = buildQuizQuestions(selectedCategory, selectedDifficulty);
    setQuizQuestions(nextQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setStreak(0);
    setAnswers([]);
    setFeedback(null);
    setQuizStart(Date.now());
    setHasStarted(true);
    setTimeLeft(15);
  };

  const revealAnswer = useCallback(
    (answer: string | null, timedOut?: boolean) => {
      if (isRevealed || !currentQuestion) return;

      const isCorrect = answer === currentQuestion.correctAnswer;
      const timeSpent = 15 - timeLeft;

      setIsRevealed(true);
      setSelectedAnswer(answer);
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selectedAnswer: answer,
          isCorrect,
          timeSpent,
        },
      ]);

      if (isCorrect) {
        setScore((prev) => prev + 1);
        setStreak((prev) => prev + 1);
        setFeedback({ status: "correct", text: currentQuestion.explanation });
      } else {
        setStreak(0);
        setFeedback({
          status: "wrong",
          text: timedOut
            ? `Time's up. Correct answer: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation}`
            : `Correct answer: ${currentQuestion.correctAnswer}. ${currentQuestion.explanation}`,
        });
      }
    },
    [currentQuestion, isRevealed, timeLeft]
  );

  const onSelect = useCallback(
    (option: string) => {
      if (!hasStarted || isRevealed) return;
      setSelectedAnswer(option);
      setTimeout(() => revealAnswer(option), 600);
    },
    [hasStarted, isRevealed, revealAnswer]
  );

  useEffect(() => {
    if (!hasStarted || isRevealed) return;
    const timer = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            revealAnswer(null, true);
            setTimeout(goToNextQuestion, 1100);
          }, 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [goToNextQuestion, hasStarted, isRevealed, revealAnswer]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasStarted || !currentQuestion) return;

      if (event.key >= "1" && event.key <= "4" && !isRevealed) {
        const optionIndex = Number(event.key) - 1;
        const option = currentOptions[optionIndex];
        if (option) onSelect(option);
      }
      if (event.key === "Enter" && isRevealed) {
        goToNextQuestion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentOptions, currentQuestion, goToNextQuestion, hasStarted, isRevealed, onSelect]);

  const progress = hasStarted && quizQuestions.length ? ((currentIndex + (isRevealed ? 1 : 0)) / quizQuestions.length) * 100 : 0;

  return (
    <div className="h-screen overflow-hidden text-[var(--text-primary)]">
      <Sidebar />
      <TopBar title="Play Quiz" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="quiz-shell flex h-[calc(100vh-60px)] w-full flex-col overflow-hidden px-2.5 pb-1.5 pt-1.5 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-4"
      >
        <div className="mx-auto flex w-full max-w-[1040px] min-h-0 flex-1 flex-col items-center">
        {!hasStarted ? (
          <section className="glass mt-2 w-full rounded-card border border-violet-400/20 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">Ready to Play?</p>
                <h2 className="mt-0.5 font-sora text-base font-bold text-[var(--text-primary)] sm:text-lg">Pick category and difficulty</h2>
              </div>
              {selectedCategory && selectedDifficulty && (
                <div className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-200">
                  {selectedCategory} · {selectedDifficulty}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Category</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {categoryMeta.map((category) => (
                    <CategoryCard
                      key={category.name}
                      iconName={category.iconName}
                      name={category.name}
                      difficulty={category.difficulty}
                      color={category.color}
                      active={selectedCategory === category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      hideDifficulty={true}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Difficulty</p>
                <div className="grid gap-1.5 sm:grid-cols-3">
                  {difficultyOptions.map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`focus-ring rounded-card border px-3 py-2 text-xs font-medium transition-all duration-150 ${
                        selectedDifficulty === difficulty
                          ? "border-violet-400 bg-violet-500/15 text-violet-700 dark:text-violet-200"
                          : "border-black/8 bg-white/70 text-[var(--text-secondary)] hover:border-violet-400 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                aria-label="Start quiz"
                onClick={startQuiz}
                disabled={!selectedCategory || !selectedDifficulty}
                className="focus-ring arcade-btn btn-primary w-full inline-flex items-center justify-center gap-2 rounded-button px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Quiz <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : currentQuestion ? (
          <>
        <div className="quiz-meta mb-1 flex w-full flex-wrap items-center justify-center gap-1 text-xs">
          <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400" animate={{ width: `${progress}%` }} />
          </div>
          <span className="rounded-full border border-black/8 bg-white/70 px-2 py-0.5 text-xs text-[var(--text-primary)] shadow-sm dark:border-white/10 dark:bg-white/5">
            {currentIndex + 1}/{quizQuestions.length}
          </span>
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-200">S {streak}</span>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 dark:text-violet-200">P {score}</span>
          <Timer timeLeft={timeLeft} total={15} />
        </div>

        <section className="quiz-question glass mb-1 w-full rounded-card p-2.5 text-center">
          <p className="mb-0.5 inline-flex self-center rounded-full border border-violet-400/35 bg-violet-500/20 px-2 py-0.5 text-[10px] text-violet-700 dark:text-violet-200">
            {currentQuestion.category} • {currentQuestion.difficulty}
          </p>
          <h2 className="font-sora text-sm font-semibold leading-snug sm:text-base">{currentQuestion.question}</h2>
        </section>

        <div className="quiz-options grid h-full max-h-[320px] w-full min-h-[160px] flex-1 auto-rows-fr gap-1 overflow-hidden sm:grid-cols-2">
          {currentOptions.map((option, index) => (
            <AnswerButton
              key={option}
              label={letters[index]}
              value={option}
              selected={selectedAnswer === option}
              revealed={isRevealed}
              isCorrect={currentQuestion.correctAnswer === option}
              disabled={isRevealed}
              onClick={() => onSelect(option)}
            />
          ))}
        </div>

        <div className="quiz-footer mt-0.5 flex w-full flex-col gap-1">
          <AnimatePresence mode="wait" initial={false}>
            {feedback ? (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`quiz-feedback flex-1 rounded-card border overflow-hidden p-2 text-[10px] leading-tight ${
                  feedback.status === "correct"
                    ? "border-green-400/35 bg-green-500/10 text-green-800 dark:text-green-200"
                    : "border-red-400/35 bg-red-500/10 text-red-800 dark:text-red-200"
                }`}
              >
                <div className="font-medium mb-0.5">
                  {feedback.status === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                </div>
                <div className="opacity-90">{feedback.text}</div>
              </motion.div>
            ) : (
              <div key="placeholder" className="quiz-feedback-placeholder flex-1 rounded-card border border-transparent p-2" aria-hidden="true" />
            )}
          </AnimatePresence>

          <button
            type="button"
            aria-label="Go to next question"
            onClick={goToNextQuestion}
            disabled={!isRevealed}
            className={`quiz-next focus-ring arcade-btn btn-primary rounded-button px-4 py-2.5 font-medium ${
              isRevealed ? "" : "invisible pointer-events-none"
            }`}
          >
            Continue
          </button>
        </div>
          </>
        ) : (
          <section className="glass mt-4 w-full rounded-card border border-violet-400/20 p-4 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No quiz questions were loaded. Please go back and pick another category and difficulty.</p>
          </section>
        )}
        </div>
      </motion.main>
    </div>
  );
}

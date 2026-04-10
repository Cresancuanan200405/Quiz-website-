export type Difficulty = "Easy" | "Medium" | "Hard";
export type TriviaCategory = "Science" | "History" | "Tech" | "Nature" | "Arts";
export type QuizCategory = "Science" | "History" | "Tech" | "Nature" | "Arts" | "Anime" | "Food" | "Animals" | "Business";
export type BoardTab = "global" | "daily" | "weekly";
export type ProfileTab = "stats" | "history" | "saved";
export type BattleState = "idle" | "searching" | "found" | "countdown" | "playing" | "finished";

export interface Question {
  id: string;
  category: QuizCategory;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string;
}

export interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string;
  score: number;
  accuracy: number;
  quizCount: number;
  rank: number;
  tier: "Legendary" | "Expert" | "Pro" | "Rising";
}

export interface TriviaFact {
  id: string;
  category: TriviaCategory;
  title: string;
  body: string;
  likes: number;
}

export interface QuizHistoryItem {
  id: string;
  category: TriviaCategory;
  name: string;
  date: string;
  score: string;
}

export interface CurrentUser extends LeaderboardUser {
  email?: string;
  handle: string;
  joinDate: string;
  streak: number;
  points: number;
  weeklyGoal: number;
  badges: string[];
  savedFactIds: string[];
  quizHistory: QuizHistoryItem[];
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeSpent: number;
}

export type IconName = "flask" | "landmark" | "microchip" | "leaf" | "clapperboard" | "utensils" | "paw" | "briefcase";

export interface CategoryMeta {
  name: string;
  iconName: IconName;
  color: string;
  difficulty: Difficulty;
  questionCount: number;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, Compass, Crown, Flag, Flame, Lock, Route, Sparkles, Target, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Timer from "@/components/Timer";
import AnswerButton from "@/components/AnswerButton";
import CategoryCard from "@/components/CategoryCard";
import ProgressionInfoDialog from "@/components/ProgressionInfoDialog";
import { categoryMeta, questions } from "@/lib/mockData";
import type { AnswerRecord, Difficulty, Question } from "@/lib/types";
import { calculatePoints, cx } from "@/lib/utils";
import { useSettingsStore } from "@/lib/settingsStore";
import { usePlayerStatsStore } from "@/lib/playerStatsStore";
import { getPassedQuestionCounts, getUnlockedDifficultiesForCategory, questionCountOptions } from "@/lib/quizProgression";
import { persistQuizSessionToSupabase } from "@/lib/supabase/quizPersistence";

const letters = ["A", "B", "C", "D"];
const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Hard"];
const QUESTION_POOL_TARGET = 96;
const categoryDifficultyPrefixPattern = /^[A-Za-z][\w&+\-/ ]{1,32}\s+(?:Easy|Medium|Hard)(?:\s+Challenge\s+\d+)?\s*:\s*/i;

interface TriviaApiQuestion {
  id?: string;
  question: {
    text: string;
  };
  correctAnswer: string;
  incorrectAnswers: string[];
}

interface JourneyQuestionSeed {
  key: string;
  prompt: string;
  correct: string;
  wrong: [string, string, string];
  explanation: string;
}

const triviaApiCategoryMap: Record<string, string[]> = {
  Science: ["science"],
  History: ["history"],
  Tech: ["science", "general_knowledge"],
  Nature: ["geography", "science"],
  Arts: ["arts_and_literature"],
  Anime: ["film_and_tv"],
  Food: ["food_and_drink"],
  Animals: ["science"],
  Business: ["society_and_culture", "general_knowledge"],
};

const categorySemanticHints: Record<string, string[]> = {
  Tech: ["computer", "software", "internet", "program", "coding", "digital", "cpu", "ram"],
  Anime: ["anime", "manga", "studio", "naruto", "one piece", "dragon ball", "attack on titan", "my hero"],
  Nature: ["ocean", "forest", "mountain", "river", "climate", "ecosystem", "wildlife", "earth"],
  Animals: ["animal", "mammal", "bird", "reptile", "species", "habitat", "zebra", "bat"],
  Business: ["market", "company", "finance", "startup", "profit", "equity", "ipo", "economy"],
};

const strictlyFilteredCategories = new Set(["Tech", "Anime", "Animals", "Business"]);

const journeySeedBank: Record<string, JourneyQuestionSeed[]> = {
  Science: [
    { key: "gold-symbol", prompt: "What is the chemical symbol for gold?", correct: "Au", wrong: ["Ag", "Gd", "Go"], explanation: "Gold uses the symbol Au from the Latin word aurum." },
    { key: "red-planet", prompt: "Which planet is known as the Red Planet?", correct: "Mars", wrong: ["Venus", "Jupiter", "Mercury"], explanation: "Mars appears reddish due to iron oxide on its surface." },
    { key: "adult-bones", prompt: "How many bones are in an adult human body?", correct: "206", wrong: ["198", "212", "220"], explanation: "An adult human skeleton typically contains 206 bones." },
    { key: "photosynthesis-gas", prompt: "What gas do plants absorb during photosynthesis?", correct: "Carbon dioxide", wrong: ["Oxygen", "Hydrogen", "Helium"], explanation: "Plants absorb carbon dioxide and release oxygen." },
    { key: "h2o", prompt: "What is H2O commonly called?", correct: "Water", wrong: ["Hydrogen peroxide", "Salt", "Ozone"], explanation: "H2O is the chemical formula for water." },
    { key: "gravity-force", prompt: "What force pulls objects toward Earth?", correct: "Gravity", wrong: ["Magnetism", "Friction", "Tension"], explanation: "Gravity attracts objects with mass toward one another." },
    { key: "boiling-celsius", prompt: "At sea level, water boils at what temperature in Celsius?", correct: "100", wrong: ["90", "110", "120"], explanation: "Water boils at 100 C at standard atmospheric pressure." },
    { key: "cell-dna", prompt: "In most organisms, which cell part contains DNA?", correct: "Nucleus", wrong: ["Ribosome", "Cell membrane", "Cytoplasm"], explanation: "DNA is primarily stored in the nucleus of eukaryotic cells." },
    { key: "universal-donor", prompt: "Which blood type is known as the universal red-cell donor?", correct: "O negative", wrong: ["AB positive", "A positive", "B positive"], explanation: "O negative blood can generally be donated to all blood types." },
    { key: "nearest-star", prompt: "What is the nearest star to Earth?", correct: "The Sun", wrong: ["Sirius", "Polaris", "Alpha Centauri"], explanation: "Our nearest star is the Sun." },
  ],
  History: [
    { key: "ww2-end", prompt: "In what year did World War II end?", correct: "1945", wrong: ["1944", "1946", "1939"], explanation: "World War II ended in 1945." },
    { key: "first-us-president", prompt: "Who was the first President of the United States?", correct: "George Washington", wrong: ["Thomas Jefferson", "John Adams", "James Madison"], explanation: "George Washington was the first U.S. President." },
    { key: "machu-picchu", prompt: "Which civilization built Machu Picchu?", correct: "Inca", wrong: ["Maya", "Aztec", "Roman"], explanation: "Machu Picchu was built by the Inca civilization." },
    { key: "renaissance-origin", prompt: "The Renaissance began in which country?", correct: "Italy", wrong: ["France", "Germany", "Spain"], explanation: "The Renaissance emerged first in Italy." },
    { key: "magna-carta", prompt: "Who agreed to the Magna Carta in 1215?", correct: "King John of England", wrong: ["Richard I", "Henry VIII", "Edward I"], explanation: "King John agreed to the Magna Carta in 1215." },
    { key: "ww1-treaty", prompt: "Which treaty formally ended World War I?", correct: "Treaty of Versailles", wrong: ["Treaty of Paris", "Treaty of Ghent", "Treaty of Tordesillas"], explanation: "World War I ended with the Treaty of Versailles in 1919." },
    { key: "moon-landing", prompt: "In what year did humans first land on the Moon?", correct: "1969", wrong: ["1965", "1972", "1959"], explanation: "Apollo 11 landed on the Moon in 1969." },
    { key: "berlin-wall", prompt: "In what year did the Berlin Wall fall?", correct: "1989", wrong: ["1985", "1991", "1979"], explanation: "The Berlin Wall fell in 1989." },
    { key: "pyramid-region", prompt: "The Great Pyramid of Giza is in which modern country?", correct: "Egypt", wrong: ["Iraq", "Greece", "Turkey"], explanation: "The Great Pyramid of Giza is in Egypt." },
    { key: "printing-press", prompt: "Who is credited with inventing the movable-type printing press in Europe?", correct: "Johannes Gutenberg", wrong: ["Isaac Newton", "Leonardo da Vinci", "Galileo Galilei"], explanation: "Johannes Gutenberg pioneered the printing press in Europe." },
  ],
  Tech: [
    { key: "cpu-meaning", prompt: "What does CPU stand for?", correct: "Central Processing Unit", wrong: ["Central Process Utility", "Core Program Unit", "Computer Processing Utility"], explanation: "CPU means Central Processing Unit." },
    { key: "ram-meaning", prompt: "What does RAM stand for?", correct: "Random Access Memory", wrong: ["Rapid Access Module", "Read Active Memory", "Runtime Allocation Memory"], explanation: "RAM means Random Access Memory." },
    { key: "css-purpose", prompt: "Which language is mainly used to style web pages?", correct: "CSS", wrong: ["SQL", "Python", "C"], explanation: "CSS controls presentation and layout on web pages." },
    { key: "html-purpose", prompt: "Which markup language structures web page content?", correct: "HTML", wrong: ["JSON", "C++", "YAML"], explanation: "HTML structures content for web browsers." },
    { key: "git-purpose", prompt: "Git is primarily used for what?", correct: "Version control", wrong: ["Image editing", "Video rendering", "Game hosting"], explanation: "Git tracks code changes and supports collaboration." },
    { key: "https", prompt: "Which protocol is the secure version of HTTP?", correct: "HTTPS", wrong: ["FTP", "SMTP", "SSH"], explanation: "HTTPS uses TLS encryption for secure web communication." },
    { key: "binary", prompt: "Computers use which base number system internally?", correct: "Binary", wrong: ["Decimal", "Hexadecimal", "Octal"], explanation: "Computer hardware fundamentally operates in binary (0 and 1)." },
    { key: "os-role", prompt: "What software manages computer hardware and runs programs?", correct: "Operating system", wrong: ["Spreadsheet", "Browser extension", "Firewall rule"], explanation: "The operating system coordinates hardware and software resources." },
    { key: "back-stack", prompt: "A browser back button behaves most like which data structure?", correct: "Stack", wrong: ["Queue", "Tree", "Graph"], explanation: "Back history uses last-in, first-out behavior like a stack." },
    { key: "url-meaning", prompt: "What does URL stand for?", correct: "Uniform Resource Locator", wrong: ["Universal Routing Link", "Unified Resource Link", "User Reference Locator"], explanation: "URL means Uniform Resource Locator." },
  ],
  Nature: [
    { key: "largest-ocean", prompt: "What is the largest ocean on Earth?", correct: "Pacific Ocean", wrong: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], explanation: "The Pacific is the largest ocean." },
    { key: "tallest-mountain", prompt: "What is the tallest mountain above sea level?", correct: "Mount Everest", wrong: ["K2", "Kangchenjunga", "Mont Blanc"], explanation: "Mount Everest has the highest elevation above sea level." },
    { key: "largest-hot-desert", prompt: "What is the largest hot desert in the world?", correct: "Sahara", wrong: ["Gobi", "Kalahari", "Arabian"], explanation: "The Sahara is the largest hot desert." },
    { key: "ozone-layer", prompt: "Which atmospheric layer protects Earth from most UV radiation?", correct: "Ozone layer", wrong: ["Troposphere", "Mesosphere", "Ionosphere"], explanation: "The ozone layer absorbs much of the Sun's harmful UV rays." },
    { key: "photosynthesis-product", prompt: "What gas do plants release during photosynthesis?", correct: "Oxygen", wrong: ["Carbon dioxide", "Nitrogen", "Methane"], explanation: "Photosynthesis releases oxygen." },
    { key: "water-cycle", prompt: "What is the process of water turning from liquid to vapor called?", correct: "Evaporation", wrong: ["Condensation", "Precipitation", "Sublimation"], explanation: "Evaporation is liquid water changing into vapor." },
    { key: "continents", prompt: "How many continents are there on Earth?", correct: "7", wrong: ["5", "6", "8"], explanation: "Earth is commonly divided into seven continents." },
    { key: "amazon-rainforest", prompt: "The Amazon rainforest is mainly located on which continent?", correct: "South America", wrong: ["Africa", "Asia", "Australia"], explanation: "Most of the Amazon rainforest is in South America." },
    { key: "earth-tilt", prompt: "What mainly causes seasons on Earth?", correct: "Earth's axial tilt", wrong: ["Distance from the Sun", "Moon phases", "Ocean tides"], explanation: "Seasons are driven by Earth's axial tilt relative to the Sun." },
    { key: "cheetah", prompt: "What is the fastest land animal?", correct: "Cheetah", wrong: ["Lion", "Horse", "Greyhound"], explanation: "The cheetah is the fastest land animal." },
  ],
  Anime: [
    { key: "naruto-series", prompt: "Naruto Uzumaki is the main character of which anime?", correct: "Naruto", wrong: ["Bleach", "One Piece", "Attack on Titan"], explanation: "Naruto Uzumaki is from Naruto." },
    { key: "ghibli-country", prompt: "Studio Ghibli is based in which country?", correct: "Japan", wrong: ["South Korea", "China", "Canada"], explanation: "Studio Ghibli is a Japanese animation studio." },
    { key: "dragonball-hero", prompt: "Who is the main hero in Dragon Ball?", correct: "Goku", wrong: ["Vegeta", "Gohan", "Piccolo"], explanation: "Goku is the central protagonist in Dragon Ball." },
    { key: "onepiece-captain", prompt: "Who is the captain of the Straw Hat Pirates?", correct: "Monkey D. Luffy", wrong: ["Roronoa Zoro", "Sanji", "Shanks"], explanation: "Luffy leads the Straw Hat crew in One Piece." },
    { key: "death-note", prompt: "In Death Note, what item allows Light to kill by writing names?", correct: "Death Note", wrong: ["Black Ledger", "Soul Scroll", "Spirit Journal"], explanation: "The Death Note notebook has that power in the series." },
    { key: "aot-form", prompt: "Eren Yeager can transform into which titan?", correct: "Attack Titan", wrong: ["Jaw Titan", "Armored Titan", "Cart Titan"], explanation: "Eren inherits the Attack Titan." },
    { key: "demon-slayer", prompt: "Who is the main protagonist in Demon Slayer?", correct: "Tanjiro Kamado", wrong: ["Zenitsu Agatsuma", "Inosuke Hashibira", "Giyu Tomioka"], explanation: "Tanjiro is the lead character in Demon Slayer." },
    { key: "pokemon-mascot", prompt: "Who is the electric mouse mascot of Pokemon?", correct: "Pikachu", wrong: ["Eevee", "Charmander", "Squirtle"], explanation: "Pikachu is the iconic electric-type mascot." },
    { key: "myhero-school", prompt: "In My Hero Academia, students train at which academy?", correct: "U.A. High School", wrong: ["Shiketsu College", "Hero Central Academy", "Musutafu Prep"], explanation: "The main cast trains at U.A. High School." },
    { key: "sailor-moon", prompt: "What is Usagi Tsukino's magical hero name?", correct: "Sailor Moon", wrong: ["Sailor Venus", "Sailor Mars", "Sailor Jupiter"], explanation: "Usagi transforms into Sailor Moon." },
  ],
  Food: [
    { key: "guacamole", prompt: "What fruit is the main ingredient in guacamole?", correct: "Avocado", wrong: ["Mango", "Banana", "Papaya"], explanation: "Guacamole is primarily made with avocado." },
    { key: "sushi-origin", prompt: "Sushi is most associated with which country?", correct: "Japan", wrong: ["Korea", "Thailand", "Vietnam"], explanation: "Sushi is a classic dish from Japan." },
    { key: "bread-base", prompt: "What is the main dry ingredient in basic bread dough?", correct: "Flour", wrong: ["Sugar", "Cornstarch", "Baking soda"], explanation: "Flour is the primary ingredient in bread dough." },
    { key: "pasta-origin", prompt: "Pasta is strongly associated with which cuisine?", correct: "Italian", wrong: ["Mexican", "Indian", "French"], explanation: "Pasta is a staple in Italian cuisine." },
    { key: "chocolate-source", prompt: "Chocolate is made from beans of which plant?", correct: "Cacao", wrong: ["Coffee", "Vanilla", "Hazelnut"], explanation: "Chocolate comes from cacao beans." },
    { key: "tofu-source", prompt: "Tofu is made from which ingredient?", correct: "Soybeans", wrong: ["Chickpeas", "Lentils", "Peanuts"], explanation: "Tofu is a soy-based product." },
    { key: "rice-type", prompt: "Which grain is commonly used in risotto?", correct: "Arborio rice", wrong: ["Basmati rice", "Jasmine rice", "Brown rice"], explanation: "Risotto traditionally uses Arborio rice." },
    { key: "omelet", prompt: "An omelet is primarily made from what?", correct: "Eggs", wrong: ["Milk", "Flour", "Potatoes"], explanation: "Eggs are the main ingredient of an omelet." },
    { key: "yogurt", prompt: "Yogurt is made by fermenting what?", correct: "Milk", wrong: ["Cream", "Butter", "Cheese"], explanation: "Yogurt is fermented milk." },
    { key: "curry-color", prompt: "Which spice gives many curries a yellow color?", correct: "Turmeric", wrong: ["Paprika", "Cinnamon", "Cumin"], explanation: "Turmeric provides the yellow color in many curries." },
  ],
  Animals: [
    { key: "baby-cat", prompt: "What is a baby cat called?", correct: "Kitten", wrong: ["Puppy", "Cub", "Foal"], explanation: "A baby cat is called a kitten." },
    { key: "fastest-land", prompt: "What is the fastest land animal?", correct: "Cheetah", wrong: ["Lion", "Horse", "Leopard"], explanation: "The cheetah is the fastest land animal." },
    { key: "largest-mammal", prompt: "What is the largest mammal on Earth?", correct: "Blue whale", wrong: ["Elephant", "Giraffe", "Hippopotamus"], explanation: "The blue whale is the largest known mammal." },
    { key: "flying-mammal", prompt: "Which mammal is capable of true flight?", correct: "Bat", wrong: ["Flying squirrel", "Sugar glider", "Colugo"], explanation: "Bats are the only mammals with true powered flight." },
    { key: "zebra-stripes", prompt: "Which animal is known for black-and-white stripes?", correct: "Zebra", wrong: ["Panda", "Skunk", "Okapi"], explanation: "Zebras are known for their striped coats." },
    { key: "lion-group", prompt: "A group of lions is called what?", correct: "Pride", wrong: ["Pack", "Herd", "School"], explanation: "A lion group is called a pride." },
    { key: "spider-legs", prompt: "How many legs does a spider have?", correct: "8", wrong: ["6", "10", "12"], explanation: "Spiders are arachnids with eight legs." },
    { key: "penguin", prompt: "Which bird cannot fly but swims very well?", correct: "Penguin", wrong: ["Eagle", "Parrot", "Falcon"], explanation: "Penguins are flightless birds adapted for swimming." },
    { key: "kangaroo-home", prompt: "Kangaroos are native to which country?", correct: "Australia", wrong: ["New Zealand", "South Africa", "Brazil"], explanation: "Kangaroos are native to Australia." },
    { key: "dog-baby", prompt: "What is a baby dog called?", correct: "Puppy", wrong: ["Cub", "Kitten", "Calf"], explanation: "A baby dog is called a puppy." },
  ],
  Business: [
    { key: "profit", prompt: "What is money left after expenses are subtracted from revenue?", correct: "Profit", wrong: ["Debt", "Equity", "Tax"], explanation: "Profit is revenue minus expenses." },
    { key: "ipo", prompt: "What does IPO stand for?", correct: "Initial Public Offering", wrong: ["Internal Price Order", "Indexed Profit Option", "International Purchase Offer"], explanation: "An IPO is a company's first public stock sale." },
    { key: "equity", prompt: "Ownership value in a company is called what?", correct: "Equity", wrong: ["Liability", "Inventory", "Liquidity"], explanation: "Equity represents ownership interest in a business." },
    { key: "ceo", prompt: "What does CEO stand for?", correct: "Chief Executive Officer", wrong: ["Central Executive Operator", "Chief Expansion Officer", "Corporate Executive Owner"], explanation: "CEO means Chief Executive Officer." },
    { key: "startup", prompt: "A newly founded company aiming to grow quickly is called a what?", correct: "Startup", wrong: ["Conglomerate", "Franchise", "Monopoly"], explanation: "A startup is an early-stage growth-focused company." },
    { key: "budget", prompt: "A plan for expected income and spending is called a what?", correct: "Budget", wrong: ["Receipt", "Invoice", "Dividend"], explanation: "A budget estimates income and expenses." },
    { key: "stock-market", prompt: "Where are publicly traded company shares bought and sold?", correct: "Stock exchange", wrong: ["Warehouse", "Credit union", "Auction house"], explanation: "Shares are traded on stock exchanges." },
    { key: "invoice", prompt: "A document requesting payment for goods or services is called what?", correct: "Invoice", wrong: ["Memo", "Payroll", "Prospectus"], explanation: "An invoice is a bill sent to a customer." },
    { key: "supply-demand", prompt: "If demand rises and supply stays the same, what usually happens to price?", correct: "It increases", wrong: ["It decreases", "It stays zero", "It becomes fixed"], explanation: "Higher demand with fixed supply generally pushes prices up." },
    { key: "entrepreneur", prompt: "A person who starts and runs a business is called what?", correct: "Entrepreneur", wrong: ["Auditor", "Broker", "Analyst"], explanation: "An entrepreneur creates and runs business ventures." },
  ],
};

const categoryTopicMap: Record<string, string[]> = {
  Science: ["atoms", "energy", "ecosystems", "genetics", "astronomy", "climate"],
  History: ["civilizations", "empires", "revolutions", "treaties", "leaders", "timelines"],
  Tech: ["algorithms", "networks", "hardware", "security", "ai", "databases"],
  Nature: ["biomes", "species", "weather", "rivers", "forests", "oceans"],
  Arts: ["painting", "sculpture", "music", "cinema", "theater", "literature"],
  Anime: ["studios", "genres", "soundtracks", "characters", "story arcs", "worldbuilding"],
  Food: ["ingredients", "techniques", "cuisines", "nutrition", "spices", "fermentation"],
  Animals: ["habitats", "adaptations", "behavior", "migration", "taxonomy", "conservation"],
  Business: ["strategy", "marketing", "finance", "operations", "leadership", "growth"],
};

const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const decodeHtmlEntities = (value: string) => {
  if (typeof window === "undefined") return value;
  const parser = new DOMParser();
  return parser.parseFromString(value, "text/html").documentElement.textContent ?? value;
};

const normalizeQuestionText = (value: string) => decodeHtmlEntities(value).replace(categoryDifficultyPrefixPattern, "").replace(/\s+/g, " ").trim();

const hasCategorySemanticMatch = (category: string, text: string) => {
  const hints = categorySemanticHints[category];
  if (!hints?.length) return true;
  const normalized = text.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
};

const buildSeededCategoryDifficultyPool = (category: string, difficulty: Difficulty) => {
  const seeds = journeySeedBank[category] ?? [];
  if (!seeds.length) return [] as Question[];

  const easyTemplates = [
    (prompt: string) => prompt,
    (prompt: string) => `Quick check: ${prompt}`,
    (prompt: string) => `Pick the correct answer: ${prompt}`,
    (prompt: string) => `Warm-up: ${prompt}`,
    (prompt: string) => `Easy round: ${prompt}`,
    (prompt: string) => `Starter question: ${prompt}`,
    (prompt: string) => `Basic quiz: ${prompt}`,
    (prompt: string) => `Level 1: ${prompt}`,
  ];

  const mediumTemplates = [
    (prompt: string) => `A learner notes this fact: ${prompt}`,
    (prompt: string) => `Choose the best completion for this item: ${prompt}`,
    (prompt: string) => `Which option best answers this mid-level question: ${prompt}`,
    (prompt: string) => `Intermediate check: ${prompt}`,
    (prompt: string) => `Apply your understanding: ${prompt}`,
    (prompt: string) => `Think and choose: ${prompt}`,
    (prompt: string) => `Medium route: ${prompt}`,
    (prompt: string) => `Concept practice: ${prompt}`,
  ];

  const hardTemplates = [
    (prompt: string) => `Select the most precise answer: ${prompt}`,
    (prompt: string) => `Concept check: identify the accurate option for ${prompt.toLowerCase()}`,
    (prompt: string) => `Expert round: ${prompt}`,
    (prompt: string) => `High-difficulty check: ${prompt}`,
    (prompt: string) => `Advanced challenge: ${prompt}`,
    (prompt: string) => `Precision required: ${prompt}`,
    (prompt: string) => `Hard route quiz: ${prompt}`,
    (prompt: string) => `Mastery test: ${prompt}`,
  ];

  const templatesByDifficulty: Record<Difficulty, Array<(prompt: string) => string>> = {
    Easy: easyTemplates,
    Medium: mediumTemplates,
    Hard: hardTemplates,
  };

  const templates = templatesByDifficulty[difficulty];
  const generated: Question[] = [];

  seeds.forEach((seed, seedIndex) => {
    templates.forEach((template, templateIndex) => {
      const options = shuffleArray([seed.correct, ...seed.wrong]) as [string, string, string, string];
      generated.push({
        id: `seed-${category.toLowerCase()}-${difficulty.toLowerCase()}-${seed.key}-${seedIndex}-${templateIndex}`,
        category: category as Question["category"],
        difficulty,
        question: template(seed.prompt),
        options,
        correctAnswer: seed.correct,
        explanation: seed.explanation,
      });
    });
  });

  return generated;
};

const createGeneratedQuestion = (category: string, difficulty: Difficulty, sequence: number): Question => {
  const topics = categoryTopicMap[category] ?? ["concept", "pattern", "system", "theory", "model", "insight"];
  const primary = topics[sequence % topics.length];
  const secondary = topics[(sequence + 2) % topics.length];

  const promptByDifficulty: Record<Difficulty, string> = {
    Easy: `Which statement is the best match for ${primary} in ${category.toLowerCase()}?`,
    Medium: `Which option best applies ${primary} with ${secondary} in ${category.toLowerCase()}?`,
    Hard: `Which option is most accurate for a deep ${primary}-${secondary} scenario in ${category.toLowerCase()}?`,
  };

  const optionsByDifficulty: Record<Difficulty, [string, string, string, string]> = {
    Easy: [
      `${primary} is the main idea in this ${category.toLowerCase()} case.`,
      `${secondary} is mentioned, but it is not the main focus.`,
      `The statement is about an unrelated topic, not ${category.toLowerCase()}.`,
      `It ignores the basic ${primary} concept completely.`,
    ],
    Medium: [
      `It uses ${primary} correctly and supports it with ${secondary}.`,
      `It names ${primary}, but applies it in the wrong ${category.toLowerCase()} context.`,
      `It only discusses ${secondary} and misses ${primary}.`,
      `It avoids both ${primary} and ${secondary} evidence.`,
    ],
    Hard: [
      `It connects ${primary} and ${secondary} with a precise ${category.toLowerCase()} explanation.`,
      `It sounds technical, but misinterprets ${primary}.`,
      `It overgeneralizes ${secondary} without category-specific support.`,
      `It rejects evidence from both ${primary} and ${secondary}.`,
    ],
  };

  const options = optionsByDifficulty[difficulty];
  const correctIndex = 0;

  return {
    id: `gen-${category.toLowerCase()}-${difficulty.toLowerCase()}-${sequence}`,
    category: category as Question["category"],
    difficulty,
    question: promptByDifficulty[difficulty],
    options,
    correctAnswer: options[correctIndex],
    explanation: `This question is aligned to ${category}. The best answer keeps ${primary} central and applies it appropriately for ${difficulty} level.`,
  };
};

const categoryDescriptions: Record<string, { description: string }> = {
  Science: { description: "Experiments, discoveries, and wild science facts." },
  History: { description: "Civilizations, wars, and moments that changed the world." },
  Tech: { description: "Code, gadgets, and digital-era breakthroughs." },
  Nature: { description: "Wildlife, ecosystems, and the planet's wonders." },
  Arts: { description: "Masterpieces, music, and performance culture." },
  Anime: { description: "Iconic characters, studios, and anime universes." },
  Food: { description: "Cuisine, ingredients, and global food culture." },
  Animals: { description: "Species, behavior, and fascinating creature trivia." },
  Business: { description: "Markets, strategy, and entrepreneurial insights." },
};

export default function QuizPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const controlsRef = useRef<HTMLDivElement>(null);
  const bypassBackGuardRef = useRef(false);
  const nextQuestionDelaySeconds = useSettingsStore((state) => state.nextQuestionDelaySeconds);
  const showDifficultyProgressionDialog = useSettingsStore((state) => state.showDifficultyProgressionDialog);
  const setShowDifficultyProgressionDialog = useSettingsStore((state) => state.setShowDifficultyProgressionDialog);
  const { recordQuizSession, quizHistory, bestStreak: lifetimeBestStreak, totalPoints: lifetimePoints } = usePlayerStatsStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(10);
  const [openMenu, setOpenMenu] = useState<"difficulty" | "questions" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nextQuestionCountdown, setNextQuestionCountdown] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [feedback, setFeedback] = useState<{ status: "correct" | "wrong"; text: string } | null>(null);
  const [quizStart, setQuizStart] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [showProgressionDialog, setShowProgressionDialog] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);
  const [activeCampaignModal, setActiveCampaignModal] = useState<"status" | "map" | "rules" | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [insufficientQuestionsError, setInsufficientQuestionsError] = useState<string | null>(null);

  const currentQuestion = quizQuestions[currentIndex];
  const currentOptions = useMemo(() => currentQuestion?.options ?? [], [currentQuestion]);
  const displayQuestionText = useMemo(() => {
    if (!currentQuestion?.question) return "";
    return currentQuestion.question.replace(categoryDifficultyPrefixPattern, "").trim();
  }, [currentQuestion]);
  const unlockedByCategory = useMemo(() => getUnlockedDifficultiesForCategory(quizHistory, selectedCategory), [quizHistory, selectedCategory]);
  const unlockedDifficulties: Record<Difficulty, boolean> = useMemo(
    () => ({
      Easy: true,
      Medium: unlockedByCategory.Medium,
      Hard: unlockedByCategory.Hard,
    }),
    [unlockedByCategory.Hard, unlockedByCategory.Medium]
  );
  const effectiveDifficulty: Difficulty | null = selectedCategory
    ? selectedDifficulty && unlockedDifficulties[selectedDifficulty]
      ? selectedDifficulty
      : "Easy"
    : null;
  const passedQuestionCounts = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, effectiveDifficulty), [effectiveDifficulty, quizHistory, selectedCategory]);
  const easyPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Easy").size, [quizHistory, selectedCategory]);
  const mediumPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Medium").size, [quizHistory, selectedCategory]);
  const hardPassedCount = useMemo(() => getPassedQuestionCounts(quizHistory, selectedCategory, "Hard").size, [quizHistory, selectedCategory]);
  const clearedJourneysCount = useMemo(() => quizHistory.filter((entry) => entry.passed).length, [quizHistory]);

  const fetchLiveQuestions = useCallback(async (category: string, difficulty: Difficulty, questionCount: number) => {
    const categorySlugs = triviaApiCategoryMap[category] ?? [];
    if (!categorySlugs.length) return [] as Question[];

    const difficultySlug = difficulty.toLowerCase();
    const desired = Math.max(questionCount, 5);
    const seen = new Set<string>();
    const collected: Question[] = [];

    for (const slug of categorySlugs) {
      if (collected.length >= desired) break;

      const limit = Math.min(50, Math.max(desired * 2, 18));
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);

      try {
        const endpoint = `https://the-trivia-api.com/v2/questions?limit=${limit}&difficulties=${difficultySlug}&categories=${slug}`;
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) continue;

        const payload = (await response.json()) as TriviaApiQuestion[];
        const mapped = payload
          .map((item, index) => {
            const prompt = normalizeQuestionText(item.question?.text ?? "");
            const correctAnswer = decodeHtmlEntities(item.correctAnswer ?? "").trim();
            const wrong = (item.incorrectAnswers ?? []).map((option) => decodeHtmlEntities(option).trim()).filter(Boolean);

            if (!prompt || !correctAnswer || wrong.length < 3) return null;

            const options = shuffleArray([correctAnswer, ...wrong.slice(0, 3)]) as [string, string, string, string];
            const semanticCorpus = `${prompt} ${options.join(" ")}`;
            if (strictlyFilteredCategories.has(category) && !hasCategorySemanticMatch(category, semanticCorpus)) {
              return null;
            }

            const normalizedKey = prompt.toLowerCase();
            if (seen.has(normalizedKey)) return null;
            seen.add(normalizedKey);

            return {
              id: `live-${category.toLowerCase()}-${difficulty.toLowerCase()}-${slug}-${item.id ?? index}-${normalizedKey.slice(0, 24).replace(/[^a-z0-9]+/g, "-")}`,
              category: category as Question["category"],
              difficulty,
              question: prompt,
              options,
              correctAnswer,
              explanation: `This ${difficulty.toLowerCase()} ${category.toLowerCase()} question was selected from the live trivia pool for your chosen route.`,
            } as Question;
          })
          .filter((item): item is Question => Boolean(item));

        collected.push(...mapped);
      } catch {
        // Fall back to local curated set if live fetch fails.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    return shuffleArray(collected).slice(0, desired);
  }, []);

  const buildQuizQuestions = useCallback((category: string, difficulty: Difficulty, questionCount: number) => {
    const exactMatch = questions.filter((question) => question.category === category && question.difficulty === difficulty);
    const seededPool = buildSeededCategoryDifficultyPool(category, difficulty);
    const combinedRealPool = shuffleArray([...exactMatch, ...seededPool]);

    const dedupeKeys = new Set<string>();
    const realQuestionPool = combinedRealPool.filter((question) => {
      const normalized = normalizeQuestionText(question.question).toLowerCase();
      if (!normalized || dedupeKeys.has(normalized)) return false;
      dedupeKeys.add(normalized);
      return true;
    });

    // Prefer local curated questions from the chosen category+difficulty.
    if (realQuestionPool.length >= questionCount) {
      return shuffleArray(realQuestionPool).slice(0, Math.max(questionCount, QUESTION_POOL_TARGET));
    }

    // If the category lacks enough questions, fill only the remaining slots.
    const generatedNeeded = Math.max(Math.max(questionCount, QUESTION_POOL_TARGET) - realQuestionPool.length, 0);
    const generated: Question[] = [];
    for (let index = 0; index < generatedNeeded + 16; index += 1) {
      generated.push(createGeneratedQuestion(category, difficulty, index));
    }

    const merged = [...realQuestionPool, ...generated];
    const shuffledPool = shuffleArray(merged).slice(0, Math.max(questionCount, QUESTION_POOL_TARGET));
    return shuffledPool;
  }, []);

  const selectFreshQuestionsForRun = useCallback(
    (category: string, difficulty: Difficulty, questionCount: number, candidates: Question[]): Question[] | null => {
      const dedupeByPrompt = new Map<string, Question>();
      for (const candidate of candidates) {
        const key = normalizeQuestionText(candidate.question).toLowerCase();
        if (!key || dedupeByPrompt.has(key)) continue;
        dedupeByPrompt.set(key, candidate);
      }

      const uniqueCandidates = shuffleArray(Array.from(dedupeByPrompt.values()));

      if (typeof window === "undefined") {
        return uniqueCandidates.slice(0, questionCount);
      }

      const usageKey = `used-quiz-prompts:${category}:${difficulty}`;
      let usedPrompts = new Set<string>();
      try {
        const raw = window.localStorage.getItem(usageKey);
        if (raw) {
          usedPrompts = new Set((JSON.parse(raw) as string[]).filter(Boolean));
        }
      } catch {
        usedPrompts = new Set<string>();
      }

      const fresh = uniqueCandidates.filter((question) => !usedPrompts.has(normalizeQuestionText(question.question).toLowerCase()));

      if (fresh.length < questionCount) {
        return null;
      }

      const picked = fresh.slice(0, questionCount);
      const updatedUsed = new Set(usedPrompts);
      picked.forEach((question) => updatedUsed.add(normalizeQuestionText(question.question).toLowerCase()));

      const serialized = Array.from(updatedUsed).slice(-320);
      window.localStorage.setItem(usageKey, JSON.stringify(serialized));
      return picked;
    },
    []
  );

  const calculateBestStreak = useCallback((records: AnswerRecord[]) => {
    let run = 0;
    let best = 0;

    for (const record of records) {
      if (record.isCorrect) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }

    return best;
  }, []);

  const goToNextQuestion = useCallback(() => {
    const isLastQuestion = currentIndex >= quizQuestions.length - 1;
    if (isLastQuestion) {
      const totalTime = quizStart ? Math.round((Date.now() - quizStart) / 1000) : 0;
      recordQuizSession({
        category: selectedCategory ?? "Mixed",
        difficulty: selectedDifficulty ?? "Mixed",
        questionCount: quizQuestions.length,
        correct: score,
        total: quizQuestions.length,
        passed: score >= quizQuestions.length,
        bestStreak: calculateBestStreak(answers),
        points,
      });
      void persistQuizSessionToSupabase({
        category: selectedCategory ?? "Mixed",
        difficulty: selectedDifficulty ?? "Mixed",
        questionCount: quizQuestions.length,
        correct: score,
        total: quizQuestions.length,
        passed: score >= quizQuestions.length,
        bestStreak: calculateBestStreak(answers),
        points,
      });
      router.push(
        `/results?score=${score}&total=${quizQuestions.length}&category=${encodeURIComponent(selectedCategory ?? "Mixed")}&difficulty=${encodeURIComponent(selectedDifficulty ?? "Easy")}&count=${quizQuestions.length}&timeTaken=${totalTime}&points=${points || calculatePoints(answers)}`
      );
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setFeedback(null);
    setTimeLeft(15);
    setNextQuestionCountdown(0);
  }, [answers, calculateBestStreak, currentIndex, points, quizQuestions.length, quizStart, recordQuizSession, router, score, selectedCategory, selectedDifficulty]);

  const startQuizSession = useCallback(
    async (category: string, difficulty: Difficulty, questionCount: number) => {
      setIsPreparingQuiz(true);
      setInsufficientQuestionsError(null);

      try {
        const [liveQuestions, localQuestions] = await Promise.all([
          fetchLiveQuestions(category, difficulty, questionCount),
          Promise.resolve(buildQuizQuestions(category, difficulty, questionCount)),
        ]);

        const dedupeByPrompt = new Set<string>();
        const mergedQuestions = [...liveQuestions, ...localQuestions].filter((item) => {
          const key = normalizeQuestionText(item.question).toLowerCase();
          if (!key || dedupeByPrompt.has(key)) return false;
          dedupeByPrompt.add(key);
          return true;
        });

        const nextQuestions = selectFreshQuestionsForRun(category, difficulty, questionCount, mergedQuestions);
        if (nextQuestions === null) {
          setInsufficientQuestionsError(
            `No fresh questions available for ${category} (${difficulty}). You have already completed all available unique questions for this category and difficulty. Try a different difficulty or category.`
          );
          setIsPreparingQuiz(false);
          return;
        }
        if (!nextQuestions.length) return;

        setSelectedCategory(category);
        setSelectedDifficulty(difficulty);
        setSelectedQuestionCount(questionCount);
        setQuizQuestions(nextQuestions);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsRevealed(false);
        setScore(0);
        setStreak(0);
        setPoints(0);
        setAnswers([]);
        setFeedback(null);
        setQuizStart(Date.now());
        setHasStarted(true);
        setTimeLeft(15);
        setNextQuestionCountdown(0);
      } finally {
        setIsPreparingQuiz(false);
      }
    },
    [buildQuizQuestions, fetchLiveQuestions, selectFreshQuestionsForRun]
  );

  const startQuiz = async () => {
    if (!selectedCategory || !effectiveDifficulty) return;
    await startQuizSession(selectedCategory, effectiveDifficulty, selectedQuestionCount);
  };

  const handleStartClick = () => {
    if (!selectedCategory || !effectiveDifficulty || isPreparingQuiz) return;

    if (showDifficultyProgressionDialog) {
      setShowProgressionDialog(true);
      return;
    }

    void startQuiz();
  };

  const handleConfirmProgressionDialog = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      setShowDifficultyProgressionDialog(false);
    }
    setShowProgressionDialog(false);
    void startQuiz();
  };

  const revealAnswer = useCallback(
    (answer: string | null, timedOut?: boolean) => {
      if (isRevealed || !currentQuestion) return;

      const isCorrect = answer === currentQuestion.correctAnswer;
      const timeSpent = 15 - timeLeft;

      setIsRevealed(true);
      setSelectedAnswer(answer);
      setNextQuestionCountdown(nextQuestionDelaySeconds);
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
        const timeFactor = Math.max(0, timeLeft) / 15;
        let earnedPoints = 0;
        let multiplier = 1;

        setScore((prev) => prev + 1);
        setStreak((prev) => {
          const nextStreak = prev + 1;
          multiplier = 1 + Math.min(1.5, (nextStreak - 1) * 0.1);
          const basePoints = 60;
          const timeBonus = Math.round(70 * timeFactor);
          earnedPoints = Math.round((basePoints + timeBonus) * multiplier);
          setPoints((currentPoints) => currentPoints + earnedPoints);
          return nextStreak;
        });

        setFeedback({
          status: "correct",
          text: `+${earnedPoints} pts (x${multiplier.toFixed(1)} streak). ${currentQuestion.explanation}`,
        });
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
    [currentQuestion, isRevealed, nextQuestionDelaySeconds, timeLeft]
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
          }, 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [goToNextQuestion, hasStarted, isRevealed, revealAnswer]);

  useEffect(() => {
    if (!hasStarted || !isRevealed) return;

    if (nextQuestionCountdown > 0) {
      const countdownTimer = window.setTimeout(() => {
        setNextQuestionCountdown((value) => Math.max(0, value - 1));
      }, 1000);

      return () => window.clearTimeout(countdownTimer);
    }

    const advanceTimer = window.setTimeout(() => {
      goToNextQuestion();
    }, 0);

    return () => window.clearTimeout(advanceTimer);
  }, [goToNextQuestion, hasStarted, isRevealed, nextQuestionCountdown]);

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

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const instant = searchParams.get("instant");
    if (hasStarted || (instant !== "1" && instant !== "true")) {
      return;
    }

    const categoryParam = searchParams.get("category");
    const difficultyParam = searchParams.get("difficulty") as Difficulty | null;
    const countParam = Number.parseInt(searchParams.get("count") ?? "", 10);
    const replayParam = searchParams.get("replay");
    const shouldResetReplayProgress = replayParam === "1" || replayParam === "true";

    const randomCategory = categoryParam ?? categoryMeta[Math.floor(Math.random() * categoryMeta.length)]?.name ?? "Science";
    const availableDifficulties = difficultyOptions.filter((difficulty) => unlockedDifficulties[difficulty]);
    const randomDifficulty = difficultyParam && unlockedDifficulties[difficultyParam] ? difficultyParam : availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)] ?? "Easy";
    const quickQuestionCount = questionCountOptions.includes(countParam as (typeof questionCountOptions)[number]) ? countParam : 10;

    if (typeof window !== "undefined" && shouldResetReplayProgress) {
      window.localStorage.removeItem(`used-quiz-prompts:${randomCategory}:${randomDifficulty}`);
    }

    const launchTimer = window.setTimeout(() => {
        void startQuizSession(randomCategory, randomDifficulty, quickQuestionCount);
      }, 0);

    return () => window.clearTimeout(launchTimer);
  }, [hasStarted, searchParams, startQuizSession, unlockedDifficulties]);

  useEffect(() => {
    if (!hasStarted) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    window.history.pushState({ quizGuard: true }, "", window.location.href);

    const onPopState = () => {
      if (bypassBackGuardRef.current) return;
      window.history.pushState({ quizGuard: true }, "", window.location.href);
      setPendingPath("__BACK__");
      setShowExitDialog(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const nextUrl = new URL(href, window.location.origin);
      if (nextUrl.pathname === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingPath(`${nextUrl.pathname}${nextUrl.search}`);
      setShowExitDialog(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasStarted, pathname]);

  const confirmExitQuiz = () => {
    if (!pendingPath) {
      setShowExitDialog(false);
      return;
    }

    setShowExitDialog(false);
    if (pendingPath === "__BACK__") {
      bypassBackGuardRef.current = true;
      window.history.back();
      return;
    }

    router.push(pendingPath);
  };

  const surrenderJourney = useCallback(() => {
    if (!hasStarted || !quizQuestions.length) {
      setShowSurrenderConfirm(false);
      return;
    }

    const totalTime = quizStart ? Math.round((Date.now() - quizStart) / 1000) : 0;
    recordQuizSession({
      category: selectedCategory ?? "Mixed",
      difficulty: selectedDifficulty ?? "Mixed",
      questionCount: quizQuestions.length,
      correct: score,
      total: quizQuestions.length,
      passed: false,
      bestStreak: calculateBestStreak(answers),
      points,
    });
    void persistQuizSessionToSupabase({
      category: selectedCategory ?? "Mixed",
      difficulty: selectedDifficulty ?? "Mixed",
      questionCount: quizQuestions.length,
      correct: score,
      total: quizQuestions.length,
      passed: false,
      bestStreak: calculateBestStreak(answers),
      points,
    });

    setShowSurrenderConfirm(false);
    router.push(
      `/results?score=${score}&total=${quizQuestions.length}&category=${encodeURIComponent(selectedCategory ?? "Mixed")}&difficulty=${encodeURIComponent(selectedDifficulty ?? "Easy")}&count=${quizQuestions.length}&timeTaken=${totalTime}&points=${points || calculatePoints(answers)}`
    );
  }, [answers, calculateBestStreak, hasStarted, points, quizQuestions.length, quizStart, recordQuizSession, router, score, selectedCategory, selectedDifficulty]);

  const progress = hasStarted && quizQuestions.length ? ((currentIndex + (isRevealed ? 1 : 0)) / quizQuestions.length) * 100 : 0;
  const selectedMeta = categoryMeta.find((category) => category.name === selectedCategory) ?? null;
  const selectedInfo = selectedCategory ? categoryDescriptions[selectedCategory] : null;
  const timerValue = isRevealed ? nextQuestionCountdown : timeLeft;
  const timerTotal = isRevealed ? Math.max(1, nextQuestionDelaySeconds) : 15;
  const campaignSteps = [
    {
      title: "Choose a realm",
      description: selectedCategory ? `${selectedCategory} is ready for the journey.` : "Pick a category to begin the campaign.",
      done: Boolean(selectedCategory),
    },
    {
      title: "Set the expedition",
      description: selectedCategory ? `${effectiveDifficulty ?? "Easy"} route · ${selectedQuestionCount} questions.` : "Select the difficulty and chapter length.",
      done: Boolean(selectedCategory && effectiveDifficulty && selectedQuestionCount),
    },
    {
      title: "Begin the climb",
      description: hasStarted ? "The campaign is in progress." : "Launch the run and earn your rewards.",
      done: hasStarted,
    },
  ] as const;

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-violet-500/18 blur-3xl" />
        <div className="absolute right-[-6rem] top-36 h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/10 blur-3xl" />
      </div>

      <Sidebar />
      <TopBar title="Trivia Journey" />

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cx(
          "quiz-shell relative flex w-full flex-col px-2.5 pb-1.5 pt-0.5 md:ml-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:px-4",
          hasStarted ? "h-[calc(100dvh-60px)] overflow-y-hidden" : "min-h-[calc(100dvh-60px)] overflow-y-auto"
        )}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-[1240px] flex-1 flex-col gap-3">
          {!hasStarted ? (
            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="pointer-events-none fixed right-10 top-[74px] z-50 flex gap-2 md:right-12 xl:right-[calc((100vw-1240px)/2+2.5rem)]">
                <motion.button
                  type="button"
                  aria-label="Open campaign status"
                  onClick={() => setActiveCampaignModal("status")}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                      "0 0 0 5px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.28)",
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                    ],
                  }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className={`pointer-events-auto focus-ring grid h-8 w-8 place-items-center rounded-lg border text-violet-700 hover:bg-violet-500/12 dark:text-violet-200 ${
                    activeCampaignModal === "status"
                      ? "border-violet-400/60 bg-violet-500/20"
                      : "border-violet-400/30 bg-white/78 dark:bg-white/5"
                  }`}
                >
                  <Target className="h-3.5 w-3.5" />
                </motion.button>
                <motion.button
                  type="button"
                  aria-label="Open campaign map"
                  onClick={() => setActiveCampaignModal("map")}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                      "0 0 0 5px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.28)",
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                    ],
                  }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.24 }}
                  className={`pointer-events-auto focus-ring grid h-8 w-8 place-items-center rounded-lg border text-violet-700 hover:bg-violet-500/12 dark:text-violet-200 ${
                    activeCampaignModal === "map"
                      ? "border-violet-400/60 bg-violet-500/20"
                      : "border-violet-400/30 bg-white/78 dark:bg-white/5"
                  }`}
                >
                  <Route className="h-3.5 w-3.5" />
                </motion.button>
                <motion.button
                  type="button"
                  aria-label="Open unlock rules"
                  onClick={() => setActiveCampaignModal("rules")}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                      "0 0 0 5px rgba(124,58,237,0.12), 0 0 20px rgba(124,58,237,0.28)",
                      "0 0 0 0 rgba(124,58,237,0), 0 0 14px rgba(124,58,237,0.16)",
                    ],
                  }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.48 }}
                  className={`pointer-events-auto focus-ring grid h-8 w-8 place-items-center rounded-lg border text-violet-700 hover:bg-violet-500/12 dark:text-violet-200 ${
                    activeCampaignModal === "rules"
                      ? "border-violet-400/60 bg-violet-500/20"
                      : "border-violet-400/30 bg-white/78 dark:bg-white/5"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              <section className="glass relative overflow-hidden rounded-[28px] border border-violet-400/20 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:bg-slate-950/52">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute left-8 top-8 h-28 w-28 rounded-full bg-violet-500/12 blur-2xl" />
                  <div className="absolute right-6 top-12 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
                </div>

                <div className="relative flex flex-col gap-5">
                  <div className="max-w-2xl space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                        <Compass className="h-3.5 w-3.5" />
                        Campaign Mode
                      </div>
                      <div className="space-y-2">
                        <h1 className="font-sora text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                          Trivia Journey
                        </h1>
                        <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-[15px]">
                          Choose a realm, lock in a difficulty path, and progress through a polished quiz campaign built like a modern glassmorphic experience.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-black/8 bg-white/75 px-3 py-1 font-medium text-[var(--text-primary)] shadow-sm dark:border-white/10 dark:bg-white/5">
                          {categoryMeta.length} realms
                        </span>
                        <span className="rounded-full border border-violet-400/25 bg-violet-500/12 px-3 py-1 font-medium text-violet-700 dark:text-violet-200">
                          Procedural question runs
                        </span>
                      </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-black/8 bg-white/72 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Journeys cleared</p>
                        <Crown className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{clearedJourneysCount}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Cleared journeys from your recorded runs.</p>
                    </div>
                    <div className="rounded-[22px] border border-black/8 bg-white/72 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Best streak</p>
                        <Flame className="h-4 w-4 text-rose-500" />
                      </div>
                      <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{lifetimeBestStreak}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Your strongest chapter run so far.</p>
                    </div>
                    <div className="rounded-[22px] border border-black/8 bg-white/72 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Total points</p>
                        <Sparkles className="h-4 w-4 text-cyan-500" />
                      </div>
                      <p className="mt-2 font-sora text-2xl font-bold text-[var(--text-primary)]">{lifetimePoints}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">Campaign rewards from all cleared runs.</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-violet-400/18 bg-[var(--bg-secondary)]/78 p-4 backdrop-blur-md shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:bg-slate-900/52">
                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div
                        className={cx(
                          "rounded-[14px] border px-4 py-2 text-center text-sm font-semibold",
                          "border-violet-400/45 bg-violet-500/14 text-violet-100"
                        )}
                      >
                        1. Choose Category
                      </div>
                      <div
                        className={cx(
                          "rounded-[14px] border px-4 py-2 text-center text-sm font-semibold",
                          selectedCategory
                            ? "border-cyan-400/45 bg-cyan-500/14 text-cyan-100"
                            : "border-black/10 bg-white/60 text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5"
                        )}
                      >
                        2. Choose Difficulty
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> Choose your realm
                        </p>
                        <h2 className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">Pick a category to unlock the route</h2>
                      </div>
                      <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] dark:border-white/10 dark:bg-white/5">
                        {selectedCategory ?? "No realm selected"}
                      </span>
                    </div>

                    <div className="quiz-category-grid grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {categoryMeta.map((category) => (
                        <CategoryCard
                          key={category.name}
                          iconName={category.iconName}
                          name={category.name}
                          difficulty={category.difficulty}
                          color={category.color}
                          active={selectedCategory === category.name}
                          onClick={() => {
                            setSelectedCategory(category.name);
                            setOpenMenu(null);
                          }}
                          hideDifficulty={true}
                          compact
                        />
                      ))}
                    </div>

                    <div ref={controlsRef} className="mt-4 grid gap-3">
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!selectedCategory}
                          onClick={() => {
                            if (!selectedCategory) return;
                            setOpenMenu((prev) => (prev === "difficulty" ? null : "difficulty"));
                          }}
                          className={cx(
                            "focus-ring flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-sm font-semibold",
                            selectedCategory
                              ? "border-violet-400/30 bg-white/75 text-[var(--text-primary)] dark:bg-white/5"
                              : "cursor-not-allowed border-black/10 bg-white/55 text-[var(--text-muted)] dark:border-white/10 dark:bg-white/5"
                          )}
                        >
                          <span>{selectedCategory ? effectiveDifficulty ?? "Select Difficulty" : "Select category first"}</span>
                          <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "difficulty" ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {openMenu === "difficulty" && selectedCategory ? (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="absolute bottom-full z-20 mb-2 w-full max-h-44 overflow-y-auto rounded-[20px] border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                            >
                              {difficultyOptions.map((difficulty) => {
                                const unlocked = unlockedDifficulties[difficulty];

                                return (
                                  <button
                                    key={difficulty}
                                    type="button"
                                    disabled={!unlocked}
                                    onClick={() => {
                                      if (!unlocked) return;
                                      setSelectedDifficulty(difficulty);
                                      setOpenMenu(null);
                                    }}
                                    className={[
                                      "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                                      !unlocked ? "cursor-not-allowed opacity-55" : "",
                                      effectiveDifficulty === difficulty
                                        ? "bg-violet-500/25 text-violet-100"
                                        : "text-[var(--text-primary)] hover:bg-violet-500/12",
                                    ].join(" ")}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      {difficulty}
                                      {!unlocked ? <Lock className="h-3 w-3" /> : null}
                                    </span>
                                    {effectiveDifficulty === difficulty ? <Check className="h-3.5 w-3.5" /> : null}
                                  </button>
                                );
                              })}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          disabled={!selectedCategory}
                          onClick={() => {
                            if (!selectedCategory) return;
                            setOpenMenu((prev) => (prev === "questions" ? null : "questions"));
                          }}
                          className={cx(
                            "focus-ring flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-sm font-semibold",
                            selectedCategory
                              ? "border-violet-400/30 bg-white/75 text-[var(--text-primary)] dark:bg-white/5"
                              : "cursor-not-allowed border-black/10 bg-white/55 text-[var(--text-muted)] dark:border-white/10 dark:bg-white/5"
                          )}
                        >
                          <span>{selectedCategory ? `${selectedQuestionCount} Questions` : "Choose category first"}</span>
                          <ChevronDown className={`h-4 w-4 text-violet-400 transition-transform ${openMenu === "questions" ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {openMenu === "questions" && selectedCategory ? (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="absolute bottom-full z-20 mb-2 w-full max-h-44 overflow-y-auto rounded-[20px] border border-violet-400/35 bg-[var(--bg-secondary)]/95 p-1 backdrop-blur-md shadow-[0_14px_28px_rgba(124,58,237,0.25)]"
                            >
                              {questionCountOptions.map((count) => (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => {
                                    setSelectedQuestionCount(count);
                                    setOpenMenu(null);
                                  }}
                                  className={[
                                    "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                                    selectedQuestionCount === count
                                      ? "bg-violet-500/25 text-violet-100"
                                      : "text-[var(--text-primary)] hover:bg-violet-500/12",
                                  ].join(" ")}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    {count} Questions
                                    {passedQuestionCounts.has(count) ? <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-200">Passed</span> : null}
                                  </span>
                                  {selectedQuestionCount === count ? <Check className="h-3.5 w-3.5" /> : null}
                                </button>
                              ))}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Start trivia journey"
                      onClick={handleStartClick}
                      disabled={!selectedCategory || !effectiveDifficulty || isPreparingQuiz}
                      className="focus-ring arcade-btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-button px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPreparingQuiz ? "Preparing Questions..." : "Start Trivia Journey"} <Sparkles className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              </section>
            </div>
          ) : currentQuestion ? (
            <div className="min-h-0 flex-1">
              <section className="glass relative flex h-full min-h-0 flex-col rounded-[28px] border border-violet-400/20 bg-white/78 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:bg-slate-950/52">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute left-12 top-8 h-28 w-28 rounded-full bg-violet-500/12 blur-2xl" />
                  <div className="absolute right-16 top-16 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl" />
                </div>

                <div className="relative flex h-full flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">Chapter {currentIndex + 1}</p>
                      <h2 className="mt-1 font-sora text-lg font-bold text-[var(--text-primary)]">{selectedMeta?.name ?? "Campaign Run"}</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-black/8 bg-white/72 px-3 py-1 text-[var(--text-primary)] shadow-sm dark:border-white/10 dark:bg-white/5">
                        {currentIndex + 1}/{quizQuestions.length}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-700 dark:text-amber-200">Streak {streak}</span>
                      <span className="rounded-full bg-violet-500/15 px-3 py-1 text-violet-700 dark:text-violet-200">Points {points}</span>
                      <Timer timeLeft={timerValue} total={timerTotal} />
                      <button
                        type="button"
                        onClick={() => setShowSurrenderConfirm(true)}
                        className="focus-ring arcade-btn grid h-9 w-9 place-items-center rounded-full border border-rose-500/40 bg-rose-500/14 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/12 dark:text-rose-100"
                        aria-label="Surrender journey"
                        title="Surrender"
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" animate={{ width: `${progress}%` }} />
                  </div>

                  <section className="quiz-question glass rounded-[24px] border border-violet-400/18 p-4 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
                    <h2 className="font-sora text-base font-semibold leading-snug sm:text-lg">{displayQuestionText}</h2>
                  </section>

                  <div className="quiz-options grid flex-1 auto-rows-fr content-start gap-3 sm:grid-cols-2">
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

                  <div className="quiz-footer flex w-full flex-col gap-2">
                    <AnimatePresence mode="wait" initial={false}>
                      {feedback ? (
                        <motion.div
                          key="feedback"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className={`quiz-feedback flex-1 rounded-[22px] border overflow-hidden p-3 text-xs leading-snug ${
                            feedback.status === "correct"
                              ? "border-green-400/35 bg-green-500/10 text-green-800 dark:text-green-200"
                              : "border-red-400/35 bg-red-500/10 text-red-800 dark:text-red-200"
                          }`}
                        >
                          <div className="mb-1 font-medium">
                            {feedback.status === "correct" ? "✓ Correct" : "✗ Incorrect"}
                          </div>
                          <div className="opacity-90">{feedback.text}</div>
                        </motion.div>
                      ) : (
                        <div key="placeholder" className="quiz-feedback-placeholder flex-1 rounded-[22px] border border-transparent p-3" aria-hidden="true" />
                      )}
                    </AnimatePresence>

                    {isRevealed ? (
                      <div className="quiz-next rounded-[18px] border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-center text-xs font-medium text-violet-700 dark:text-violet-200">
                        Next question in {Math.max(0, nextQuestionCountdown)}s...
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <section className="glass mt-4 w-full rounded-[28px] border border-violet-400/20 p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">No quiz questions were loaded. Please go back and pick another category and difficulty.</p>
            </section>
          )}
        </div>

        <ProgressionInfoDialog
          isOpen={showProgressionDialog}
          categoryName={selectedCategory ?? "Selected Category"}
          easyPassed={easyPassedCount}
          mediumPassed={mediumPassedCount}
          hardPassed={hardPassedCount}
          onCancel={() => setShowProgressionDialog(false)}
          onConfirm={handleConfirmProgressionDialog}
        />

        <AnimatePresence>
          {activeCampaignModal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[82] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
              onClick={() => setActiveCampaignModal(null)}
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                className="glass w-full max-w-2xl rounded-[24px] border border-violet-400/25 bg-white/90 p-5 dark:bg-slate-900/90"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
                      {activeCampaignModal === "status" ? "Campaign status" : activeCampaignModal === "map" ? "Campaign map" : "Unlock rules"}
                    </p>
                    <h3 className="mt-1 font-sora text-xl font-bold text-[var(--text-primary)]">
                      {activeCampaignModal === "status"
                        ? "Current Campaign Overview"
                        : activeCampaignModal === "map"
                          ? "Route Progress"
                          : "Difficulty Unlock Logic"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-label="Close campaign modal"
                    onClick={() => setActiveCampaignModal(null)}
                    className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-violet-400/30 bg-white/70 text-violet-700 hover:bg-violet-500/12 dark:bg-white/5 dark:text-violet-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {activeCampaignModal === "status" ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                      <p className="text-sm text-[var(--text-secondary)]">Route</p>
                      <p className="mt-1 font-sora text-lg font-semibold text-[var(--text-primary)]">{selectedMeta ? selectedMeta.name : "Awaiting destination"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-black/8 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Difficulty</p>
                        <p className="mt-1 font-sora text-sm font-bold text-[var(--text-primary)]">{effectiveDifficulty ?? "Easy"}</p>
                      </div>
                      <div className="rounded-2xl border border-black/8 bg-white/70 p-3 text-center dark:border-white/10 dark:bg-white/5">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Questions</p>
                        <p className="mt-1 font-sora text-sm font-bold text-[var(--text-primary)]">{selectedQuestionCount}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-violet-400/18 bg-violet-500/10 p-3 text-sm text-[var(--text-secondary)]">
                      {selectedInfo ? selectedInfo.description : "Pick a category to reveal the campaign briefing and route rewards."}
                    </div>
                  </div>
                ) : null}

                {activeCampaignModal === "map" ? (
                  <div className="mt-4 grid gap-2">
                    {campaignSteps.map((step, index) => (
                      <div key={step.title} className="flex items-start gap-3 rounded-2xl border border-black/8 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                        <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${step.done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" : "bg-violet-500/12 text-violet-700 dark:text-violet-200"}`}>
                          {step.done ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-sora text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeCampaignModal === "rules" ? (
                  <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                    <p>Medium unlocks after you clear every Easy route count in a category.</p>
                    <p>Hard unlocks after you clear every Medium route count.</p>
                    <p>The layout stays glassy and compact so it feels like a campaign hub, not a plain settings page.</p>
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {insufficientQuestionsError ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[84] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
              onClick={() => setInsufficientQuestionsError(null)}
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                className="glass w-full max-w-md rounded-[24px] border border-amber-400/35 bg-white/90 p-5 dark:bg-slate-900/90"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                  <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-300" /> Questions Exhausted
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{insufficientQuestionsError}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInsufficientQuestionsError(null)}
                    className="focus-ring arcade-btn rounded-button border border-black/10 px-4 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:text-white/80"
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showSurrenderConfirm ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[83] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
              onClick={() => setShowSurrenderConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                className="glass w-full max-w-md rounded-[24px] border border-rose-400/35 bg-white/90 p-5 dark:bg-slate-900/90"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="inline-flex items-center gap-2 font-sora text-lg font-semibold text-[var(--text-primary)]">
                  <Flag className="h-5 w-5 text-rose-500 dark:text-rose-300" /> Confirm Surrender?
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  This will end the journey immediately and count this run as a failed attempt.
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
                    onClick={surrenderJourney}
                    className="focus-ring arcade-btn rounded-button border border-rose-500/45 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-400/45 dark:bg-rose-500/12 dark:text-rose-100"
                  >
                    Surrender
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showExitDialog ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                className="glass w-full max-w-md rounded-[24px] border border-violet-400/25 bg-white/90 p-5 dark:bg-slate-900/90"
              >
                <h3 className="font-sora text-lg font-bold text-[var(--text-primary)]">Exit Trivia Journey?</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  You have an active campaign. Do you want to leave this run?
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPath(null);
                      setShowExitDialog(false);
                    }}
                    className="focus-ring rounded-button border border-black/10 bg-white/70 px-3 py-2 text-sm text-[var(--text-secondary)] dark:border-white/15 dark:bg-white/5"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={confirmExitQuiz}
                    className="focus-ring rounded-button border border-rose-400/40 bg-rose-500/18 px-4 py-2 text-sm font-semibold text-rose-700 dark:text-rose-200"
                  >
                    Exit Journey
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}

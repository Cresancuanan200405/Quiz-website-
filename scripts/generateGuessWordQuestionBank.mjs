import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionDir = path.join(root, "questions1v1");
const files = fs
  .readdirSync(questionDir)
  .filter((file) => /^Guess_The_Word_mode_set_of_questions_category_.*\.txt$/i.test(file))
  .sort((a, b) => a.localeCompare(b));

const difficultyBySection = {
  10: "Easy",
  15: "Medium",
  20: "Medium",
  25: "Hard",
  30: "Hard",
};

const categoryOrder = ["Science", "History", "Tech", "Nature", "Arts", "Anime", "Food", "Animals", "Business"];
const categoryLabelMap = new Map(categoryOrder.map((category) => [category.toLowerCase(), category]));
const countsByKey = new Map();
const questionEntries = [];

const sectionTitleRegex = /^(.+?)\s*[\-\u2012\u2013\u2014\u2015]\s*GUESS\s*THE\s*WORD\s*\((\d+)\s+QUESTIONS\)?/i;

const toCategoryName = (raw) => {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return categoryLabelMap.get(trimmed) || raw.trim();
};

for (const file of files) {
  const fullPath = path.join(questionDir, file);
  const raw = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!raw.trim()) continue;

  const lines = raw.split("\n").map((line) => line.replace(/\t/g, "    ").trimEnd());

  let currentCategory = null;
  let currentSectionSize = null;
  let currentDifficulty = null;
  let currentQuestion = null;

  const flushQuestion = () => {
    if (!currentQuestion || !currentCategory || !currentSectionSize || !currentDifficulty) return;

    const { prompt, options, correctAnswer } = currentQuestion;
    if (!prompt || options.length !== 4 || !correctAnswer) {
      currentQuestion = null;
      return;
    }

    const sectionKey = `${currentCategory}::${currentSectionSize}`;
    const sectionCount = (countsByKey.get(sectionKey) || 0) + 1;
    countsByKey.set(sectionKey, sectionCount);

    questionEntries.push({
      id: `${currentCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${currentSectionSize}-${sectionCount}`,
      category: currentCategory,
      difficulty: currentDifficulty,
      sectionSize: currentSectionSize,
      sectionIndex: sectionCount,
      question: prompt,
      options,
      correctAnswer,
      explanation: `Correct answer: ${correctAnswer}.`,
    });

    currentQuestion = null;
  };

  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line || /^_+$/.test(line)) continue;

    const titleMatch = line.match(sectionTitleRegex);
    if (titleMatch) {
      flushQuestion();

      const parsedCategory = toCategoryName(titleMatch[1]);
      const parsedSectionSize = Number(titleMatch[2]);
      const parsedDifficulty = difficultyBySection[parsedSectionSize];

      if (!parsedDifficulty) {
        currentCategory = null;
        currentSectionSize = null;
        currentDifficulty = null;
        continue;
      }

      currentCategory = parsedCategory;
      currentSectionSize = parsedSectionSize;
      currentDifficulty = parsedDifficulty;
      continue;
    }

    const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (questionMatch) {
      flushQuestion();
      currentQuestion = {
        prompt: questionMatch[2].trim(),
        options: [],
        correctAnswer: "",
      };
      continue;
    }

    const optionMatch = line.match(/^[A-D]\.\s*(.+)$/);
    if (optionMatch && currentQuestion) {
      const clean = optionMatch[1].replace(/\s*✅\s*$/, "").trim();
      if (line.includes("✅")) {
        currentQuestion.correctAnswer = clean;
      }

      if (currentQuestion.options.length < 4) {
        currentQuestion.options.push(clean);
      }
    }
  }

  flushQuestion();
}

const orderedEntries = questionEntries.sort((a, b) => {
  const categoryCompare = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  if (categoryCompare !== 0) return categoryCompare;
  if (a.sectionSize !== b.sectionSize) return a.sectionSize - b.sectionSize;
  return a.sectionIndex - b.sectionIndex;
});

const out = [];
out.push('import type { Difficulty, Question, QuizCategory } from "@/lib/types";');
out.push("");
out.push("export type GuessWordQuestionCount = 10 | 15 | 20 | 25 | 30;");
out.push("");
out.push("const guessWordQuestionsList: Question[] = [");

for (const entry of orderedEntries) {
  out.push("  {");
  out.push(`    id: ${JSON.stringify(entry.id)},`);
  out.push(`    category: ${JSON.stringify(entry.category)} as QuizCategory,`);
  out.push(`    difficulty: ${JSON.stringify(entry.difficulty)} as Difficulty,`);
  out.push(`    question: ${JSON.stringify(entry.question)},`);
  out.push(`    options: ${JSON.stringify(entry.options)},`);
  out.push(`    correctAnswer: ${JSON.stringify(entry.correctAnswer)},`);
  out.push(`    explanation: ${JSON.stringify(entry.explanation)},`);
  out.push("  },");
}

out.push("];\n");
out.push("export const guessWordQuestions = guessWordQuestionsList;\n");
out.push("export const guessWordQuestionsByCategory: Record<QuizCategory, Question[]> = {");
for (const category of categoryOrder) {
  out.push(`  ${category}: guessWordQuestions.filter((question) => question.category === ${JSON.stringify(category)}),`);
}
out.push("};\n");
out.push("export const guessWordQuestionSectionsByCount: Record<number, Difficulty> = {");
out.push('  10: "Easy",');
out.push('  15: "Medium",');
out.push('  20: "Medium",');
out.push('  25: "Hard",');
out.push('  30: "Hard",');
out.push("};\n");
out.push("export const getGuessWordBankQuestions = (category: string, count: number): Question[] => {");
out.push("  const categoryQuestions = guessWordQuestionsByCategory[category as QuizCategory] ?? [];\n  const expectedDifficulty = guessWordQuestionSectionsByCount[count] ?? null;");
out.push("  if (!expectedDifficulty) return categoryQuestions.slice(0, count);");
out.push("  const sectionQuestions = categoryQuestions.filter((question) => question.difficulty === expectedDifficulty);");
out.push("  if (sectionQuestions.length >= count) return sectionQuestions.slice(0, count);");
out.push("  return categoryQuestions.slice(0, count);");
out.push("};");

const outputPath = path.join(root, "lib", "guessWordQuestionBank.ts");
fs.writeFileSync(outputPath, `${out.join("\n")}\n`, "utf8");
console.log(`Wrote ${outputPath} with ${orderedEntries.length} questions.`);

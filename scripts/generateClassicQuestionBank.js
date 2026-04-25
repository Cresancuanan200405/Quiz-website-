import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionDir = path.join(root, "questions1v1");
const files = fs
  .readdirSync(questionDir)
  .filter((file) => /^Classic_mode_set_of_questions_category_.*\.txt$/i.test(file))
  .sort((a, b) => a.localeCompare(b));

const difficultyBySection = {
  10: 'Easy',
  15: 'Medium',
  20: 'Medium',
  25: 'Hard',
  30: 'Hard',
};

const sectionTitleRegex = /^(.+?)\s*[\-\u2012\u2013\u2014\u2015]\s*(\d+)\s+QUESTIONS$/i;

const categoryOrder = ['Science', 'History', 'Tech', 'Nature', 'Arts', 'Anime', 'Food', 'Animals', 'Business'];
const categoryLabelMap = new Map(categoryOrder.map((category) => [category.toLowerCase(), category]));
const questionEntries = [];
const countsByCategory = new Map();

const toCategoryName = (raw) => {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return categoryLabelMap.get(trimmed) || raw.trim();
};

for (const file of files) {
  const fullPath = path.join(questionDir, file);
  const raw = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!raw.trim()) {
    console.warn(`Skipping empty file: ${file}`);
    continue;
  }
  const lines = raw.split('\n').map((line) => line.replace(/\t/g, '    ').trimEnd());
  const titleMatch = lines[0]?.trim().match(sectionTitleRegex);

  if (!titleMatch) {
    console.warn(`Skipping file with unrecognized title format: ${file}`);
    continue;
  }

  const category = toCategoryName(titleMatch[1]);
  const sectionSize = Number(titleMatch[2]);
  const difficulty = difficultyBySection[sectionSize];

  if (!difficulty) {
    throw new Error(`Unsupported section size ${sectionSize} in ${file}`);
  }

  if (!countsByCategory.has(category)) countsByCategory.set(category, 0);

  let currentQuestion = null;
  let questionNumber = 0;

  const flushQuestion = () => {
    if (!currentQuestion) return;

    const { prompt, options, correctAnswer } = currentQuestion;
    if (!prompt || options.length !== 4 || !correctAnswer) {
      throw new Error(`Invalid question block in ${file} near question ${questionNumber}`);
    }

    const count = countsByCategory.get(category) + 1;
    countsByCategory.set(category, count);
    questionEntries.push({
      id: `${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sectionSize}-${count}`,
      category,
      difficulty,
      question: prompt,
      options,
      correctAnswer,
      explanation: `Correct answer: ${correctAnswer}.`,
    });
    currentQuestion = null;
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();
    if (!line || /^_+$/.test(line)) continue;
    if (sectionTitleRegex.test(line)) {
      flushQuestion();
      continue;
    }

    const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (questionMatch) {
      flushQuestion();
      questionNumber = Number(questionMatch[1]);
      currentQuestion = {
        prompt: questionMatch[2].trim(),
        options: [],
        correctAnswer: '',
      };
      continue;
    }

    const optionMatch = line.match(/^[A-D]\.\s*(.+)$/);
    if (optionMatch) {
      if (!currentQuestion) {
        throw new Error(`Option found before question in ${file}: ${line}`);
      }
      const clean = optionMatch[1].replace(/\s*✅\s*$/, '').trim();
      if (line.includes('✅')) {
        currentQuestion.correctAnswer = clean;
      }
      currentQuestion.options.push(clean);
      if (currentQuestion.options.length > 4) {
        throw new Error(`Too many options in ${file} question ${questionNumber}`);
      }
    }
  }

  flushQuestion();
}

const orderedEntries = questionEntries.sort((a, b) => {
  const categoryCompare = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  if (categoryCompare !== 0) return categoryCompare;
  const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 };
  const difficultyCompare = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  if (difficultyCompare !== 0) return difficultyCompare;
  return a.id.localeCompare(b.id);
});

const lines = [];
lines.push('import type { Difficulty, Question, QuizCategory } from "@/lib/types";');
lines.push('');
lines.push('const questionEntries: Question[] = [');
for (const entry of orderedEntries) {
  lines.push('  {');
  lines.push(`    id: ${JSON.stringify(entry.id)},`);
  lines.push(`    category: ${JSON.stringify(entry.category)} as QuizCategory,`);
  lines.push(`    difficulty: ${JSON.stringify(entry.difficulty)} as Difficulty,`);
  lines.push(`    question: ${JSON.stringify(entry.question)},`);
  lines.push(`    options: ${JSON.stringify(entry.options)},`);
  lines.push(`    correctAnswer: ${JSON.stringify(entry.correctAnswer)},`);
  lines.push(`    explanation: ${JSON.stringify(entry.explanation)},`);
  lines.push('  },');
}
lines.push('];');
lines.push('');
lines.push('export const classicQuestions: Question[] = questionEntries;');
lines.push('');
lines.push('export const classicQuestionsByCategory: Record<QuizCategory, Question[]> = {');
for (const category of categoryOrder) {
  lines.push(`  ${category}: classicQuestions.filter((question) => question.category === ${JSON.stringify(category)}),`);
}
lines.push('};');
lines.push('');
lines.push('export const classicQuestionCountByCategory: Record<QuizCategory, number> = {');
for (const category of categoryOrder) {
  lines.push(`  ${category}: classicQuestionsByCategory[${JSON.stringify(category)}].length,`);
}
lines.push('};');
lines.push('');
lines.push('export const classicQuestionSectionsByCount: Record<number, Difficulty> = {');
lines.push('  10: "Easy",');
lines.push('  15: "Medium",');
lines.push('  20: "Medium",');
lines.push('  25: "Hard",');
lines.push('  30: "Hard",');
lines.push('};');
lines.push('');

const outputPath = path.join(root, 'lib', 'classicQuestionBank.ts');
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${outputPath} with ${orderedEntries.length} questions.`);

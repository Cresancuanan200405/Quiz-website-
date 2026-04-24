import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionDir = path.join(root, "questions1v1");

const files = fs
  .readdirSync(questionDir)
  .filter((file) => /^True_False_mode_set_of_questions_category_.*\.txt$/i.test(file))
  .sort((a, b) => a.localeCompare(b));

const countOrder = [10, 15, 20, 25, 30];
const dashRegex = /[\u2013\u2014-]/;

const parseQuestionLine = (line) => {
  const match = line.match(/^\s*\d+\.\s*(.+?)\s*[\u2013\u2014-]\s*(True|False)\b/i);
  if (!match) return null;

  const statement = match[1]
    .replace(/\s*[✅❌].*$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    statement,
    answer: /^true$/i.test(match[2]),
  };
};

/** @type {Record<string, Partial<Record<number, Array<{ statement: string; answer: boolean }>>>>} */
const bank = {};

for (const file of files) {
  const fullPath = path.join(questionDir, file);
  const raw = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n").map((line) => line.trim());

  const fileCategoryMatch = file.match(/category_(.+)\.txt$/i);
  const fileCategory = fileCategoryMatch ? fileCategoryMatch[1] : "Unknown";
  const category = fileCategory.charAt(0).toUpperCase() + fileCategory.slice(1).toLowerCase();

  if (!bank[category]) bank[category] = {};

  let currentCount = null;

  for (const line of lines) {
    if (!line || /^_+$/.test(line)) continue;

    const sectionMatch = line.match(new RegExp(`^\\s*[A-Z][A-Z\\s]+\\s*${dashRegex.source}\\s*TRUE\\s+OR\\s+FALSE\\s*\\((\\d+)\\)\\s*$`, "i"));
    if (sectionMatch) {
      const parsedCount = Number(sectionMatch[1]);
      currentCount = countOrder.includes(parsedCount) ? parsedCount : null;
      if (currentCount) {
        // Reset section data when header repeats so duplicated pasted blocks do not double counts.
        bank[category][currentCount] = [];
      }
      continue;
    }

    if (!currentCount) continue;

    const parsed = parseQuestionLine(line);
    if (!parsed) continue;
    bank[category][currentCount].push(parsed);
  }

  for (const count of countOrder) {
    const entries = bank[category][count] ?? [];
    if (entries.length !== count) {
      throw new Error(`Expected ${count} entries for ${category} (${file}), got ${entries.length}`);
    }
  }
}

const output = [];
output.push("export type TrueFalseQuestionCount = 10 | 15 | 20 | 25 | 30;");
output.push("");
output.push("export interface TrueFalseBankEntry {");
output.push("  statement: string;");
output.push("  answer: boolean;");
output.push("}");
output.push("");
output.push("export interface PreparedTrueFalseQuestion {");
output.push("  question: string;");
output.push("  options: string[];");
output.push("  correctAnswer: string;");
output.push("}");
output.push("");
output.push("export const trueFalseQuestionBank: Record<string, Partial<Record<TrueFalseQuestionCount, TrueFalseBankEntry[]>>> = {");

for (const category of Object.keys(bank).sort((a, b) => a.localeCompare(b))) {
  output.push(`  ${JSON.stringify(category)}: {`);
  for (const count of countOrder) {
    const entries = bank[category][count] ?? [];
    output.push(`    ${count}: [`);
    for (const entry of entries) {
      output.push(`      { statement: ${JSON.stringify(entry.statement)}, answer: ${entry.answer} },`);
    }
    output.push("    ],");
  }
  output.push("  },");
}

output.push("};");
output.push("");
output.push("export const getTrueFalseBankQuestions = (category: string, count: number): PreparedTrueFalseQuestion[] => {");
output.push("  const byCategory = trueFalseQuestionBank[category];");
output.push("  if (!byCategory) return [];");
output.push("  const entries = byCategory[count as TrueFalseQuestionCount] ?? [];");
output.push("  return entries.map((entry) => ({");
output.push("    question: entry.statement,");
output.push("    options: [\"True\", \"False\"],");
output.push("    correctAnswer: entry.answer ? \"True\" : \"False\",\n  }));");
output.push("};");

const outPath = path.join(root, "lib", "trueFalseQuestionBank.ts");
fs.writeFileSync(outPath, `${output.join("\n")}\n`, "utf8");
console.log(`Wrote ${outPath}`);

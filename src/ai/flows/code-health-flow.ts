
'use server';

/**
 * @fileOverview Flow to analyze the health of a source code file.
 *
 * - analyzeCodeHealth - A function that analyzes a file and returns a health report.
 * - AnalyzeCodeHealthInput - The input type for the analyzeCodeHealth function.
 * - AnalyzeCodeHealthOutput - The return type for the analyzeCodeHealth function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CodeSmellSchema = z.object({
  type: z.string().describe('The type of code smell detected (e.g., "Long Function", "Duplicate Code", "Unused Variable").'),
  description: z.string().describe('A brief description of the code smell and its location.'),
  suggestion: z.string().describe('A concrete suggestion on how to refactor or fix the issue.'),
});

const AnalyzeCodeHealthInputSchema = z.object({
  filePath: z.string().describe('The path of the file being analyzed.'),
  fileContent: z.string().describe('The source code of the file to analyze.'),
  language: z.string().describe('The programming language of the source code.'),
});
export type AnalyzeCodeHealthInput = z.infer<typeof AnalyzeCodeHealthInputSchema>;

const AnalyzeCodeHealthOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('An overall health score for the file from 0 (poor) to 100 (excellent).'),
  overallSummary: z.string().describe('A brief, high-level summary of the code health analysis.'),
  complexity: z.object({
    score: z.number().min(0).max(100),
    summary: z.string().describe('A summary of the code complexity analysis.'),
  }),
  maintainability: z.object({
    score: z.number().min(0).max(100),
    summary: z.string().describe('A summary of the code maintainability, considering factors like readability and structure.'),
  }),
  codeSmells: z.array(CodeSmellSchema).describe('A list of specific code smells or issues found in the file.'),
});
export type AnalyzeCodeHealthOutput = z.infer<typeof AnalyzeCodeHealthOutputSchema>;


const analyzeCodeHealthPrompt = ai.definePrompt({
  name: 'analyzeCodeHealthPrompt',
  input: { schema: AnalyzeCodeHealthInputSchema },
  output: { schema: AnalyzeCodeHealthOutputSchema },
  prompt: `You are an expert static code analysis tool. Your task is to perform a "health check" on the following source code file and provide a structured report in JSON format.

  - File Path: {{{filePath}}}
  - Language: {{{language}}}
  - Source Code:
  \`\`\`{{{language}}}
  {{{fileContent}}}
  \`\`\`

  Please perform the following analysis:

  1.  **Overall Score & Summary:**
      *   Provide an \`overallScore\` from 0 to 100, where 100 is perfect code.
      *   Write a concise \`overallSummary\` of the file's quality.

  2.  **Complexity Analysis:**
      *   Evaluate the cyclomatic complexity and cognitive complexity of the code.
      *   Provide a \`complexity.score\` from 0 to 100 (where 100 is low complexity).
      *   Provide a \`complexity.summary\` explaining the score.

  3.  **Maintainability Analysis:**
      *   Evaluate how easy the code is to read, understand, and modify. Consider variable naming, function length, comments, and structure.
      *   Provide a \`maintainability.score\` from 0 to 100 (where 100 is highly maintainable).
      *   Provide a \`maintainability.summary\` explaining the score.
  
  4.  **Detect Code Smells:**
      *   Identify up to 5 major "code smells" in the file.
      *   For each smell, provide its \`type\` (e.g., "Long Function", "Duplicate Code", "Magic Numbers", "Dead Code"), a \`description\` of where it is and what it is, and a concrete \`suggestion\` for how to fix it.
      *   If no significant code smells are found, return an empty array for \`codeSmells\`.

  Provide the final analysis in the specified JSON format.
  `,
});

export async function analyzeCodeHealth(input: AnalyzeCodeHealthInput): Promise<AnalyzeCodeHealthOutput> {
    const { output } = await analyzeCodeHealthPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a code health analysis.');
    }
    return output;
}

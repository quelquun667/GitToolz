
'use server';

/**
 * @fileOverview Flow to suggest a commit message based on a code diff.
 * 
 * - suggestCommitMessage - A function that analyzes a diff and suggests commit messages.
 * - SuggestCommitMessageInput - The input type for the suggestCommitMessage function.
 * - SuggestCommitMessageOutput - The return type for the suggestCommitMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SuggestCommitMessageInputSchema = z.object({
  diff: z.string().describe('The code diff to analyze.'),
});
export type SuggestCommitMessageInput = z.infer<typeof SuggestCommitMessageInputSchema>;

const SuggestionSchema = z.object({
    type: z.string().describe("The type of the commit (e.g., 'feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore')."),
    message: z.string().describe("The commit message subject line, without the type prefix."),
});

const SuggestCommitMessageOutputSchema = z.object({
  summary: z.string().describe("A brief, one-sentence summary of the changes detected in the diff."),
  suggestions: z.array(SuggestionSchema).describe("A list of 3-5 suggested commit messages following the Conventional Commits specification."),
});
export type SuggestCommitMessageOutput = z.infer<typeof SuggestCommitMessageOutputSchema>;

const suggestCommitMessagePrompt = ai.definePrompt({
  name: 'suggestCommitMessagePrompt',
  input: { schema: SuggestCommitMessageInputSchema },
  output: { schema: SuggestCommitMessageOutputSchema },
  prompt: `You are an expert at writing clean, concise, and conventional commit messages.
  Your task is to analyze the following code diff and generate a summary and a list of commit message suggestions.

  Follow these rules:
  1.  **Analyze the Diff:** Carefully review the provided code changes to understand the overall intent.
  2.  **Write a Summary:** Create a brief, one-sentence summary of what the changes accomplish.
  3.  **Generate Suggestions:** Provide 3 to 5 commit message suggestions that adhere strictly to the Conventional Commits specification.
      - Each suggestion must have a \`type\` and a \`message\`.
      - The \`type\` must be one of: feat, fix, docs, style, refactor, test, chore, perf, build, ci.
      - The \`message\` should be a short, imperative-mood description of the change (e.g., "add new login component" instead of "added new login component"). Do not include the type in the message itself.
      - The suggestions should offer different angles or levels of detail where appropriate.

  Code Diff:
  \`\`\`diff
  {{{diff}}}
  \`\`\`

  Provide your response in the required JSON format with 'summary' and 'suggestions' fields.
  `,
});


export async function suggestCommitMessage(input: SuggestCommitMessageInput): Promise<SuggestCommitMessageOutput> {
    const { output } = await suggestCommitMessagePrompt(input);
    return output || { summary: '', suggestions: [] };
}

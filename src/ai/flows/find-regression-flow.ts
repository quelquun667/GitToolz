'use server';

/**
 * @fileOverview Flow to find potential regressions from a list of commits.
 *
 * - findRegression - A function that analyzes commits based on a bug description.
 * - FindRegressionInput - The input type for the findRegression function.
 * - FindRegressionOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  author: z.string().nullable(),
  date: z.string(),
});

const FindRegressionInputSchema = z.object({
  bugDescription: z.string().describe('A detailed description of the bug or regression.'),
  commits: z.array(CommitSchema).describe('A list of recent commits to analyze.'),
});
export type FindRegressionInput = z.infer<typeof FindRegressionInputSchema>;

const SuspiciousCommitSchema = z.object({
    sha: z.string().describe('The SHA of the suspicious commit.'),
    message: z.string().describe('The commit message.'),
    author: z.string().nullable().describe('The author of the commit.'),
    reasoning: z.string().describe('A detailed explanation of why this commit is considered a potential cause of the regression.'),
});

const FindRegressionOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  suspiciousCommits: z.array(SuspiciousCommitSchema).optional().describe('A list of 1-3 commits that are most likely to have caused the bug.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type FindRegressionOutput = z.infer<typeof FindRegressionOutputSchema>;


const findRegressionPrompt = ai.definePrompt({
  name: 'findRegressionPrompt',
  input: { schema: FindRegressionInputSchema },
  output: { schema: z.object({ suspiciousCommits: z.array(SuspiciousCommitSchema) }) },
  prompt: `You are an expert Senior Software Engineer, specialized in debugging and finding regressions.
  
Your task is to analyze a bug description and a list of recent commits to identify which commit is most likely responsible for the bug.

**Bug Description:**
"{{{bugDescription}}}"

**Recent Commits to Analyze (from newest to oldest):**
{{#each commits}}
- **SHA:** {{{this.sha}}}
  **Author:** {{{this.author}}}
  **Date:** {{{this.date}}}
  **Message:**
  \`\`\`
  {{{this.message}}}
  \`\`\`
{{/each}}

Please perform the following analysis:

1.  **Analyze the Bug Description:** Understand the user-facing problem. What feature is broken? What is the expected behavior vs. the actual behavior?
2.  **Correlate with Commit Messages:** Review each commit message. Does the message describe changes to a feature, file, or component related to the bug description? For example, if the bug is about "login not working", commits with messages like "refactor: user authentication" or "feat: add social login" are highly suspicious.
3.  **Identify Top Suspects:** Identify the top 1 to 3 most suspicious commits. Do not list more than 3.
4.  **Provide Reasoning:** For each suspicious commit, provide a clear and concise \`reasoning\`. Explain *why* you believe this commit could have introduced the bug, based on the commit message and the bug description.

Return your analysis in the specified JSON format. If no commits seem related, return an empty array for \`suspiciousCommits\`.
`,
});

export async function* findRegression(
  input: FindRegressionInput
): AsyncGenerator<FindRegressionOutput> {
  try {
    yield { status: 'Initializing regression analysis...' };
    yield { status: `Analyzing ${input.commits.length} commits...` };
    yield { status: 'Correlating commits with bug description using AI...' };

    const { output } = await findRegressionPrompt(input);

    if (!output?.suspiciousCommits) {
      throw new Error('AI failed to generate a regression analysis.');
    }

    yield { status: 'Finalizing analysis...' };
    yield { suspiciousCommits: output.suspiciousCommits };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
    yield { error };
  }
}

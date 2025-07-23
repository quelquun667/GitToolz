
'use server';

/**
 * @fileOverview Flow to provide a high-level summary of the differences between two branches.
 *
 * - compareBranchesAdvanced - A function that analyzes the diff between two branches.
 * - CompareBranchesAdvancedInput - The input type for the compareBranchesAdvanced function.
 * - CompareBranchesAdvancedOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CompareBranchesAdvancedInputSchema = z.object({
  diff: z.string().describe('The git diff output between the two branches.'),
  commitMessages: z.array(z.string()).describe('A list of commit messages from the head branch.'),
  headBranch: z.string().describe('The name of the head branch (the one with new changes).'),
  baseBranch: z.string().describe('The name of the base branch (the one to compare against).'),
});
export type CompareBranchesAdvancedInput = z.infer<typeof CompareBranchesAdvancedInputSchema>;

const FileChangeSchema = z.object({
    filePath: z.string().describe('The path of the modified file.'),
    changeType: z.enum(['ADDED', 'MODIFIED', 'DELETED', 'RENAMED']).describe('The type of change made to the file.'),
    summary: z.string().describe('A one-sentence summary of what was changed in this file.'),
});

const CompareBranchesAdvancedOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  summary: z.string().optional().describe('A high-level, paragraph-style summary of the changes. Explain the overall purpose of the changes.'),
  impactAnalysis: z.string().optional().describe('An analysis of the potential impact of these changes, including possible risks or areas that need careful testing.'),
  fileChanges: z.array(FileChangeSchema).optional().describe('A list of the most important files that were changed.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type CompareBranchesAdvancedOutput = z.infer<typeof CompareBranchesAdvancedOutputSchema>;


const compareBranchesAdvancedPrompt = ai.definePrompt({
  name: 'compareBranchesAdvancedPrompt',
  input: { schema: CompareBranchesAdvancedInputSchema },
  output: { schema: z.object({
    summary: z.string(),
    impactAnalysis: z.string(),
    fileChanges: z.array(FileChangeSchema),
  })},
  prompt: `You are an expert Senior Software Engineer performing a high-level code review.

Your task is to analyze the provided git diff and commit messages to create a summary of the changes between the \`{{{baseBranch}}}\` and \`{{{headBranch}}}\` branches.

**Commit Messages from \`{{{headBranch}}}\`:**
{{#each commitMessages}}
- {{{.}}}
{{/each}}

**Git Diff:**
\`\`\`diff
{{{diff}}}
\`\`\`

Please perform the following analysis:

1.  **Overall Summary:** Write a concise, high-level paragraph summarizing the purpose and nature of the changes. What was the goal? What kind of work was done (e.g., feature development, bug fixing, refactoring)? Use the commit messages as a primary guide for the intent.

2.  **Impact Analysis:** Based on the diff, analyze the potential impact. What parts of the application are affected? Are there any potential risks, breaking changes, or areas that require thorough testing?

3.  **Key File Changes:** Identify the most significant files that were changed. For each, provide the file path, the type of change (ADDED, MODIFIED, DELETED), and a one-sentence summary of the changes made *to that specific file*. Focus on the most important files, not every single one if there are many.

Provide the final analysis in the specified JSON format.
`,
});

export async function* compareBranchesAdvanced(
  input: CompareBranchesAdvancedInput
): AsyncGenerator<CompareBranchesAdvancedOutput> {
  try {
    yield { status: 'Initializing advanced comparison...' };
    yield { status: `Analyzing commits and diff for branch \`${input.headBranch}\`...` };
    yield { status: 'Generating summary and impact analysis with AI...' };

    const { output } = await compareBranchesAdvancedPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a branch comparison.');
    }

    yield { status: 'Finalizing analysis...' };
    yield { 
        summary: output.summary,
        impactAnalysis: output.impactAnalysis,
        fileChanges: output.fileChanges,
    };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
    yield { error };
  }
}

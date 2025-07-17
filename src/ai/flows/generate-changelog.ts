'use server';

/**
 * @fileOverview Changelog generation flow for a Git repository.
 *
 * - generateChangelog - A function that generates a changelog between two Git refs.
 * - GenerateChangelogInput - The input type for the generateChangelog function.
 * - GenerateChangelogOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getRepoCommitsByDate } from '@/services/github';

const GenerateChangelogInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch to analyze.'),
  startDate: z.string().describe('The starting date for the changelog.'),
  endDate: z.string().describe('The ending date for the changelog.'),
});
export type GenerateChangelogInput = z.infer<typeof GenerateChangelogInputSchema>;

const GenerateChangelogOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  changelog: z.string().optional().describe('The final generated changelog.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateChangelogOutput = z.infer<typeof GenerateChangelogOutputSchema>;

const generateChangelogPrompt = ai.definePrompt({
  name: 'generateChangelogPrompt',
  input: { schema: z.object({ commitMessages: z.array(z.string()) }) },
  output: { schema: z.object({ changelog: z.string() }) },
  prompt: `You are an AI expert at creating release notes and changelogs from Git commit messages.
  
  Your task is to analyze the following list of commit messages and generate a structured and user-friendly changelog in Markdown format.

  Commit Messages:
  {{#each commitMessages}}
  - {{{this}}}
  {{/each}}

  Please adhere to the following structure and guidelines:

  1.  **Group Changes by Type:** Categorize each commit into one of the following sections:
      - \`### ✨ Features\` (for new functionality)
      - \`### 🐛 Bug Fixes\` (for bug fixes)
      - \`### ⚡️ Performance\` (for performance improvements)
      - \`### ♻️ Refactoring\` (for code changes that neither fix a bug nor add a feature)
      - \`### 📝 Documentation\` (for documentation-only changes)
      - \`### ⚙️ Miscellaneous\` (for build process, chore, or other changes)

  2.  **Clean and Concise Summaries:** For each commit, create a clear, one-line summary. 
      - Omit the commit hash.
      - Rewrite the commit message to be past-tense and user-focused. For example, "fix: resolves issue with login button" becomes "Resolved an issue with the login button."
      - If multiple commits relate to the same feature or fix, group them into a single, more comprehensive changelog entry.

  3.  **Format:** Use a bulleted list for the entries within each section. Do not include a main title like '# Changelog'. Start directly with the first category heading (e.g., \`### ✨ Features\`). If a category has no commits, do not include its heading.

  Example Output:
  \`\`\`markdown
  ### ✨ Features
  - Introduced a new dashboard for user analytics.
  - Added the ability to export data to CSV.

  ### 🐛 Bug Fixes
  - Fixed a bug where users could not reset their password.
  - Corrected a styling issue on the main navigation bar.
  \`\`\`
`,
});

export async function* generateChangelog(
  input: GenerateChangelogInput
): AsyncGenerator<GenerateChangelogOutput> {
  try {
    yield { status: 'Initializing changelog generation...' };
    yield { status: `Fetching commits for ${input.repoUrl} on branch '${input.branch}'...` };
    
    const commits = await getRepoCommitsByDate(input.repoUrl, input.branch, input.startDate, input.endDate);
    if (commits.length === 0) {
        throw new Error('No commits found in the specified date range.');
    }

    yield { status: `Found ${commits.length} commits to analyze.` };
    yield { status: 'Generating changelog with AI...' };

    const commitMessages = commits.map(c => c.message);
    const { output } = await generateChangelogPrompt({ commitMessages });

    if (!output?.changelog) {
      throw new Error('AI failed to generate changelog content.');
    }

    yield { status: 'Finalizing changelog...' };
    yield { changelog: output.changelog };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}

    
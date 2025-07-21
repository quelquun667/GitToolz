'use server';

/**
 * @fileOverview User-facing release notes generation flow.
 *
 * - generateReleaseNotes - A function that generates marketing-friendly release notes from commits.
 * - GenerateReleaseNotesInput - The input type for the generateReleaseNotes function.
 * - GenerateReleaseNotesOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateReleaseNotesInputSchema = z.object({
  commitMessages: z.array(z.string()).describe('A list of commit messages to summarize.'),
  versionNumber: z.string().optional().describe('The version number for this release (e.g., "v1.2.0").'),
  releaseDate: z.string().optional().describe('The date of the release.'),
});
export type GenerateReleaseNotesInput = z.infer<typeof GenerateReleaseNotesInputSchema>;

const GenerateReleaseNotesOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  releaseNotes: z.string().optional().describe('The final generated release notes in Markdown.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateReleaseNotesOutput = z.infer<typeof GenerateReleaseNotesOutputSchema>;

const generateReleaseNotesPrompt = ai.definePrompt({
  name: 'generateReleaseNotesPrompt',
  input: { schema: GenerateReleaseNotesInputSchema },
  output: { schema: z.object({ releaseNotes: z.string() }) },
  prompt: `You are an expert product marketing manager, skilled at writing exciting and user-friendly release notes.
  
  Your task is to analyze the following list of technical commit messages and transform them into engaging, benefit-oriented release notes for a non-technical audience.

  {{#if versionNumber}}
  # Release Notes - {{{versionNumber}}}
  {{else}}
  # Release Notes
  {{/if}}
  {{#if releaseDate}}
  **Release Date:** {{{releaseDate}}}
  {{/if}}

  ---

  ## What's New?

  Here's a summary of the latest updates and improvements we've made.

  Commit Messages to Analyze:
  {{#each commitMessages}}
  - {{{this}}}
  {{/each}}

  Please adhere to the following guidelines:

  1.  **Focus on User Benefits:** Do not simply list the commits. Translate the technical changes into what they mean for the user. For example, "fix: resolved null pointer exception in user auth" becomes "### 🚀 Enhanced Stability - We've fixed a critical bug that could cause crashes during login, making the experience much smoother."

  2.  **Group by Theme:** Categorize the changes into logical, user-centric themes. Use emojis to make the sections more engaging. Example sections:
      - \`### ✨ New Features\`
      - \`### 🚀 Performance & Improvements\`
      - \`### 🐛 Bug Squashing\`
      - \`### 🎨 UI & UX Enhancements\`

  3.  **Engaging Tone:** Write in a clear, positive, and exciting tone. Avoid technical jargon.

  4.  **Format as Markdown:** Structure the entire output as a clean Markdown document. Start with the main "Release Notes" heading. If a category has no relevant commits, do not include its heading.

  Example Output:
  \`\`\`markdown
  # Release Notes - v2.5.0
  **Release Date:** August 26, 2024

  ---

  ## What's New?

  We're excited to announce our latest batch of updates, focused on improving your productivity and fixing pesky bugs!

  ### ✨ New Features
  - You can now export your data to a CSV file directly from the dashboard, making it easier to analyze your results.
  - We've added a brand new "Analytics" page to give you deeper insights into your usage.

  ### 🐛 Bug Squashing
  - Fixed an issue where the app could crash if you tried to reset your password.
  - Corrected a visual glitch on the main navigation bar that appeared on smaller screens.
  \`\`\`
`,
});

export async function* generateReleaseNotes(
  input: GenerateReleaseNotesInput
): AsyncGenerator<GenerateReleaseNotesOutput> {
  try {
    yield { status: 'Initializing release notes generation...' };
    yield { status: `Received ${input.commitMessages.length} commits to analyze.` };
    yield { status: 'Generating user-friendly release notes with AI...' };

    const { output } = await generateReleaseNotesPrompt(input);

    if (!output?.releaseNotes) {
      throw new Error('AI failed to generate release notes content.');
    }

    yield { status: 'Finalizing release notes...' };
    yield { releaseNotes: output.releaseNotes };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}

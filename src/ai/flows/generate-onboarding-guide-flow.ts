'use server';

/**
 * @fileOverview Flow to generate a project onboarding guide.
 *
 * - generateOnboardingGuide - A function that generates a GETTING_STARTED.md file.
 * - GenerateOnboardingGuideInput - The input type for the generateOnboardingGuide function.
 * - GenerateOnboardingGuideOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateOnboardingGuideInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  fileTree: z.string().describe('The file tree of the repository, provided as a string.'),
  fileContents: z.record(z.string()).describe('A map of key file paths to their content.'),
});
export type GenerateOnboardingGuideInput = z.infer<typeof GenerateOnboardingGuideInputSchema>;

const GenerateOnboardingGuideOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  guide: z.string().optional().describe('The final generated onboarding guide in Markdown.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateOnboardingGuideOutput = z.infer<typeof GenerateOnboardingGuideOutputSchema>;


const generateOnboardingGuidePrompt = ai.definePrompt({
  name: 'generateOnboardingGuidePrompt',
  input: { schema: GenerateOnboardingGuideInputSchema },
  output: { schema: z.object({ guide: z.string() }) },
  prompt: `You are an expert Staff Engineer, tasked with creating a "GETTING_STARTED.md" guide for new developers joining a project.

Your goal is to create a clear, step-by-step guide that allows a new developer to set up their local development environment and run the project successfully.

Analyze the following project information:
- Repository URL: {{{repoUrl}}}
- Repository File Tree:
  \`\`\`
  {{{fileTree}}}
  \`\`\`
- Content of key files:
  {{#each fileContents}}
  \`\`\`{{@key}}\`\`\`
  {{{this}}}
  \`\`\`
  {{/each}}

Please generate the guide in Markdown format with the following structure:

# Getting Started

A quick guide to setting up your local development environment for this project.

## 1. Prerequisites

Based on the files (like package.json, requirements.txt, pyproject.toml, etc.), list the essential software and tools that need to be installed on the developer's machine *before* they can start. Include specific versions if you can infer them.
- Examples: Node.js (e.g., v18 or later), Python (e.g., v3.9+), Docker, etc.
- Provide links to the official download pages.

## 2. Installation

Provide a clear, step-by-step sequence of commands to install the project dependencies.
1.  **Clone the repository:** Provide the \`git clone\` command.
2.  **Navigate into the directory:** \`cd <repo-name>\`.
3.  **Install dependencies:** Infer the command from the package manager file (e.g., \`npm install\`, \`pip install -r requirements.txt\`, \`poetry install\`).

## 3. Running the Project

Explain how to start the local development server.
- Infer the command from the \`scripts\` section of \`package.json\` (e.g., \`npm run dev\`) or from common practices for the detected framework (e.g., \`python manage.py runserver\`).
- Mention the default port if it's specified (e.g., in vite.config.js or next.config.js).

## 4. Key Scripts

List and explain other important scripts found in \`package.json\` or other configuration files.
- Examples:
  - \`npm run build\`: How to build the project for production.
  - \`npm test\`: How to run the test suite.
  - \`npm run lint\`: How to check for code quality issues.

## 5. Project Structure Overview

Briefly explain the purpose of the main directories to help the new developer find their way around.
- e.g., \`src/components\`: Reusable UI components.
- e.g., \`src/app\`: Next.js App Router pages and layouts.
- e.g., \`src/services\`: Modules for interacting with external APIs.

Be concise, accurate, and focus on the practical steps. The new developer should be able to follow this guide without needing to ask for help.
`,
});

export async function* generateOnboardingGuide(
  input: GenerateOnboardingGuideInput
): AsyncGenerator<GenerateOnboardingGuideOutput> {
  try {
    yield { status: 'Initializing onboarding guide generation...' };
    yield { status: 'Analyzing project structure and configuration files...' };
    
    const { output } = await generateOnboardingGuidePrompt(input);

    if (!output?.guide) {
      throw new Error('AI failed to generate the onboarding guide.');
    }

    yield { status: 'Finalizing guide...' };
    yield { guide: output.guide };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}

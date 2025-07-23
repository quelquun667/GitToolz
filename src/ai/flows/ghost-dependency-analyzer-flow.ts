
'use server';

/**
 * @fileOverview Flow to find "ghost" dependencies in a project.
 *
 * - analyzeGhostDependencies - A function that finds unused but installed packages.
 * - GhostDependencyInput - The input type for the analyzeGhostDependencies function.
 * - GhostDependencyOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GhostDependencyInputSchema = z.object({
  packageJsonContent: z.string().describe('The string content of the package.json file.'),
  allFileContents: z.record(z.string()).describe('A map of file paths to their full content for the entire repository.'),
});
export type GhostDependencyInput = z.infer<typeof GhostDependencyInputSchema>;

const GhostDependency = z.object({
  name: z.string().describe('The name of the dependency package.'),
  reason: z.string().describe('The reason why this dependency is considered a "ghost" (e.g., "Not imported anywhere", "Imported but never used").'),
});

const GhostDependencyOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  ghostDependencies: z.array(GhostDependency).optional().describe('A list of dependencies that seem to be unused in the codebase.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GhostDependencyOutput = z.infer<typeof GhostDependencyOutputSchema>;


const analyzeGhostDependenciesPrompt = ai.definePrompt({
  name: 'analyzeGhostDependenciesPrompt',
  input: { schema: GhostDependencyInputSchema },
  output: { schema: z.object({ ghostDependencies: z.array(GhostDependency) }) },
  prompt: `You are an expert build engineer and code auditor with deep knowledge of Node.js/JavaScript/TypeScript ecosystems.

Your task is to identify "ghost dependencies" from a project's \`package.json\` file. A ghost dependency is a package that is listed in the dependencies or devDependencies but appears to be unused in the actual source code.

**package.json Content:**
\`\`\`json
{{{packageJsonContent}}}
\`\`\`

**All Project File Contents:**
I will now provide the full content of every source file in the repository. Analyze all of them to determine if the packages are actually used.
{{#each allFileContents}}
--- FILE: {{{@key}}} ---
\`\`\`
{{{this}}}
\`\`\`
{{/each}}

Please perform the following analysis:

1.  **List all dependencies:** Extract every package name from \`dependencies\` and \`devDependencies\` in the \`package.json\`.
2.  **Scan all files:** For each package, search through all the provided file contents. A package is considered "used" if it is imported or required (e.g., \`import ... from 'package-name'\` or \`require('package-name')\`).
3.  **Identify Ghosts:** A package is a "ghost" if its name does not appear in any \`import\` or \`require\` statements across the entire codebase.
4.  **Handle exceptions:**
    *   Be aware of packages that are used by configuration files or scripts, even if not explicitly imported in source code (e.g., \`tailwindcss\`, \`eslint\`, \`prettier\`, \`husky\`, \`@types/*\`, \`postcss\`, \`next\`). Exclude these from the ghost list if they seem to be part of the build or tooling process. \`@types/*\` packages are almost never ghosts.
    *   Packages that expose command-line tools (like \`genkit\`, \`patch-package\`) are often used in \`package.json\` scripts and are not ghosts.

Return a list of packages that you are confident are ghosts, along with the reason. If no ghost dependencies are found, return an empty array.
`,
});

export async function* analyzeGhostDependencies(
  input: GhostDependencyInput
): AsyncGenerator<GhostDependencyOutput> {
  try {
    yield { status: 'Initializing ghost dependency analysis...' };
    yield { status: 'Parsing package.json...' };
    yield { status: `Analyzing ${Object.keys(input.allFileContents).length} source files...` };
    yield { status: 'Cross-referencing dependencies with file contents using AI...' };

    const { output } = await analyzeGhostDependenciesPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a dependency analysis.');
    }

    yield { status: 'Finalizing analysis...' };
    yield { ghostDependencies: output.ghostDependencies };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
    yield { error };
  }
}

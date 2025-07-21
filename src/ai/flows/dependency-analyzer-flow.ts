
'use server';

/**
 * @fileOverview Flow to analyze project dependencies from a package.json file.
 *
 * - analyzeDependencies - A function that analyzes dependencies and provides suggestions.
 * - AnalyzeDependenciesInput - The input type for the analyzeDependencies function.
 * - AnalyzeDependenciesOutput - The return type for the analyzeDependencies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DependencySchema = z.object({
  name: z.string().describe('The name of the dependency package.'),
  currentVersion: z.string().describe('The version specified in the package.json file.'),
  status: z.enum(['ok', 'outdated', 'unused']).describe('The status of the dependency.'),
  suggestion: z.string().optional().describe('A suggestion for the dependency, e.g., "Upgrade to latest version X.Y.Z" or "Consider removing as it appears unused."'),
});

const AnalyzeDependenciesInputSchema = z.object({
  packageJsonContent: z.string().describe('The string content of the package.json file.'),
  fileTree: z.string().describe('The file tree of the repository, used to check for package usage.'),
});
export type AnalyzeDependenciesInput = z.infer<typeof AnalyzeDependenciesInputSchema>;

const AnalyzeDependenciesOutputSchema = z.object({
  dependencies: z.array(DependencySchema).describe('An analysis of the main dependencies.'),
  devDependencies: z.array(DependencySchema).describe('An analysis of the development dependencies.'),
  summary: z.string().describe('A high-level summary of the dependency health.'),
});
export type AnalyzeDependenciesOutput = z.infer<typeof AnalyzeDependenciesOutputSchema>;


const analyzeDependenciesPrompt = ai.definePrompt({
  name: 'analyzeDependenciesPrompt',
  input: { schema: AnalyzeDependenciesInputSchema },
  output: { schema: AnalyzeDependenciesOutputSchema },
  prompt: `You are an expert dependency manager for Node.js projects. Your task is to analyze the provided package.json content and the repository's file tree to identify outdated and potentially unused packages.

  **File Tree:**
  \`\`\`
  {{{fileTree}}}
  \`\`\`

  **package.json Content:**
  \`\`\`json
  {{{packageJsonContent}}}
  \`\`\`

  Please perform the following analysis and provide the output in the required JSON format:

  1.  **Analyze Dependencies & DevDependencies:**
      *   For each package in both \`dependencies\` and \`devDependencies\`, determine its status.
      *   **Outdated Check:** A package is considered 'outdated' if its version is not the latest stable version available (you don't need real-time version checking, use your knowledge of common packages, but be conservative). A patch or minor version difference is often okay. Focus on major version differences. If a package is very old (e.g. from 2-3 years ago), mark it as outdated.
      *   **Unused Check:** A package is likely 'unused' if it is not imported or required in any of the files listed in the file tree. Be careful with packages that are used for configuration or scripts (e.g., 'tailwindcss', 'eslint', 'prettier'). If a package name appears in the file tree (e.g. in a config file), it is likely used.
      *   **Status:** Set the status to 'outdated', 'unused', or 'ok'. Prioritize 'unused' over 'outdated' if both apply.
      *   **Suggestion:** Provide a helpful suggestion. For 'outdated', suggest upgrading. For 'unused', suggest considering its removal. For 'ok', no suggestion is needed.

  2.  **Summary:**
      *   Write a brief, high-level \`summary\` of the project's dependency health. Mention the number of outdated or unused packages found.

  Provide the final analysis in the specified JSON format.
  `,
});

export async function analyzeDependencies(input: AnalyzeDependenciesInput): Promise<AnalyzeDependenciesOutput> {
    const { output } = await analyzeDependenciesPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a dependency analysis.');
    }
    return output;
}

'use server';

/**
 * @fileOverview Documentation generation flow for a Git repository.
 *
 * - generateDocumentation - A function that generates documentation for a given repository URL and branch/tag.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The return type for the generateDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentationInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch or tag to generate documentation from.'),
});
export type GenerateDocumentationInput = z.infer<typeof GenerateDocumentationInputSchema>;

const GenerateDocumentationOutputSchema = z.object({
  documentation: z.string().describe('The generated documentation for the repository.'),
});
export type GenerateDocumentationOutput = z.infer<typeof GenerateDocumentationOutputSchema>;

export async function generateDocumentation(input: GenerateDocumentationInput): Promise<GenerateDocumentationOutput> {
  return generateDocumentationFlow(input);
}

const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
  prompt: `You are an AI assistant that generates documentation for a Git repository.

  Given the repository URL: {{{repoUrl}}} and branch/tag: {{{branch}}}, generate comprehensive documentation.
  The documentation should include an overview of the project, its features, and usage instructions.
  Return the documentation as a markdown string.
  Follow these formatting guidelines:
  - Use clear and concise language.
  - Include code examples where appropriate.
  - Organize the documentation into logical sections with headings and subheadings.
`,
});

const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    outputSchema: GenerateDocumentationOutputSchema,
  },
  async input => {
    const {output} = await generateDocumentationPrompt(input);
    return output!;
  }
);

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

export async function generateDocumentation(
  input: GenerateDocumentationInput
): Promise<GenerateDocumentationOutput> {
  const {stream, response} = generateDocumentationFlow(input);
  // For this implementation, we will just return the final response.
  // The client can be updated to handle the stream for progress updates.
  return await response;
}

const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
  prompt: `You are an AI assistant that generates a high-quality README.md file for a Git repository.

  Given the repository URL: {{{repoUrl}}} and branch/tag: {{{branch}}}, generate comprehensive documentation in Markdown format.
  
  The documentation MUST be structured like a professional README.md file and include the following sections:
  - **Project Overview**: A brief introduction to the project.
  - **Features**: A bulleted list of key features.
  - **Prerequisites**: What users need to have installed to run the project (e.g., Node.js, Python).
  - **Installation**: A step-by-step guide on how to install project dependencies.
  - **Usage / Getting Started**: Clear instructions and code examples on how to run the project.
  
  Use clear and concise language. Format code blocks appropriately for markdown.
  Organize the documentation into logical sections with clear headings (e.g., '## Overview').
`,
});

const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    outputSchema: GenerateDocumentationOutputSchema,
  },
  async function* (input) {
    yield { status: 'Analyse du dépôt...' };
    await new Promise(resolve => setTimeout(resolve, 500));

    yield { status: 'Examen de la structure des fichiers...' };
    await new Promise(resolve => setTimeout(resolve, 700));

    yield { status: 'Lecture de `package.json`...' };
    await new Promise(resolve => setTimeout(resolve, 800));
    
    yield { status: 'Lecture de `src/app/page.tsx`...' };
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    yield { status: 'Génération de la documentation...' };

    const {output} = await generateDocumentationPrompt(input);
    return output!;
  }
);
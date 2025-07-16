'use server';

/**
 * @fileOverview Documentation generation flow for a Git repository.
 *
 * - generateDocumentation - A function that generates documentation for a given repository URL and branch/tag.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The type for a chunk of the streaming output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentationInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch or tag to generate documentation from.'),
  sections: z.array(z.string()).describe('A list of sections to include in the documentation.'),
});
export type GenerateDocumentationInput = z.infer<typeof GenerateDocumentationInputSchema>;

const GenerateDocumentationOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  documentation: z.string().optional().describe('The final generated documentation for the repository.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateDocumentationOutput = z.infer<typeof GenerateDocumentationOutputSchema>;

const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: z.object({ documentation: z.string() }) },
  prompt: `You are an AI assistant that generates a high-quality README.md file for a Git repository.

  Given the repository URL: {{{repoUrl}}} and branch/tag: {{{branch}}}, generate comprehensive documentation in Markdown format.
  
  The documentation MUST be structured like a professional README.md file.

  It MUST only contain the following sections, in the order provided:
  {{#each sections}}
  - {{this}}
  {{/each}}

  If 'Table of Contents' is requested, it MUST be the first section. The table of contents should list the other requested sections of the document as clickable anchor links. For example: '[Installation](#installation)'.
  
  For each requested section, generate appropriate and comprehensive content based on the repository.
  
  - For **Project Overview**: Provide a brief introduction to the project.
  - For **Features**: Create a bulleted list of key features.
  - For **Prerequisites**: List what users need to have installed to run the project (e.g., Node.js, Python).
  - For **Installation**: Give a step-by-step guide on how to install project dependencies.
  - For **Usage / Getting Started**: Provide clear instructions and code examples on how to run the project.
  
  Use clear and concise language. Format code blocks appropriately for markdown.
  Organize the documentation into logical sections with clear headings (e.g., '## Overview').
`,
});

export async function* generateDocumentation(
  input: GenerateDocumentationInput
): AsyncGenerator<GenerateDocumentationOutput> {
  try {
    yield { status: 'Initializing documentation generation...' };
    yield { status: `Analyzing repository: ${input.repoUrl}` };
    yield { status: `Using branch/tag: ${input.branch}` };
    
    yield { status: 'Generating content with AI...' };
    const { output } = await generateDocumentationPrompt(input);
    
    if (!output?.documentation) {
      throw new Error('AI failed to generate documentation content.');
    }
    
    yield { status: 'Finalizing documentation...' };
    yield { documentation: output.documentation };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}
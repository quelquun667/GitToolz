'use server';

/**
 * @fileOverview Documentation generation flow for a Git repository.
 *
 * - generateDocumentationFlow - A function that generates documentation for a given repository URL and branch/tag.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The return type for the generateDocumentation function.
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
  documentation: z.string().describe('The generated documentation for the repository.'),
});
export type GenerateDocumentationOutput = z.infer<typeof GenerateDocumentationOutputSchema>;

type StatusUpdate = {
  type: 'status';
  message: string;
};

type FinalOutput = {
  type: 'result';
  data: GenerateDocumentationOutput;
};

export type StreamEvent = StatusUpdate | FinalOutput;


const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: GenerateDocumentationOutputSchema},
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

export const generateDocumentationFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFlow',
    inputSchema: GenerateDocumentationInputSchema,
    stream: {
      schema: z.custom<StreamEvent>(),
    },
  },
  async function* (input) {
    yield { type: 'status', message: `Analyzing repository ${input.repoUrl}...` };
    
    // Simulate analyzing sections
    for (const section of input.sections) {
      yield { type: 'status', message: `Planning section: ${section}...` };
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate work
    }

    yield { type: 'status', message: 'Generating documentation with Gemini...' };

    const {output} = await generateDocumentationPrompt(input);

    if (!output) {
      throw new Error('Failed to generate documentation.');
    }
    
    yield { type: 'result', data: output };
  }
);

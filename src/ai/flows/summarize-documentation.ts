'use server';

/**
 * @fileOverview Summarizes a given document or section of documentation using GenAI.
 *
 * - summarizeDocumentation - A function that handles the documentation summarization process.
 * - SummarizeDocumentationInput - The input type for the summarizeDocumentation function.
 * - SummarizeDocumentationOutput - The return type for the summarizeDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDocumentationInputSchema = z.object({
  documentationContent: z.string().describe('The content of the documentation to summarize.'),
  formatInstructions: z
    .string()
    .optional()
    .describe('Optional instructions on how to format the summary.'),
});
export type SummarizeDocumentationInput = z.infer<typeof SummarizeDocumentationInputSchema>;

const SummarizeDocumentationOutputSchema = z.object({
  summary: z.string().describe('The summary of the documentation content.'),
});
export type SummarizeDocumentationOutput = z.infer<typeof SummarizeDocumentationOutputSchema>;

export async function summarizeDocumentation(
  input: SummarizeDocumentationInput
): Promise<SummarizeDocumentationOutput> {
  return summarizeDocumentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDocumentationPrompt',
  input: {schema: SummarizeDocumentationInputSchema},
  output: {schema: SummarizeDocumentationOutputSchema},
  prompt: `You are an AI expert in summarizing technical documentation.

  Summarize the following documentation content.  The summary should be concise and highlight the key points.

  Documentation Content: {{{documentationContent}}}

  {{#if formatInstructions}}
  Format Instructions: {{{formatInstructions}}}
  {{/if}}
  `,
});

const summarizeDocumentationFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentationFlow',
    inputSchema: SummarizeDocumentationInputSchema,
    outputSchema: SummarizeDocumentationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

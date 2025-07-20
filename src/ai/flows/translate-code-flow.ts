'use server';

/**
 * @fileOverview Flow to translate a code snippet from one language to another.
 * 
 * - translateCode - A function that handles the code translation.
 * - TranslateCodeInput - The input type for the translateCode function.
 * - TranslateCodeOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslateCodeInputSchema = z.object({
  sourceCode: z.string().describe('The source code to translate.'),
  sourceLanguage: z.string().describe('The programming language of the source code.'),
  targetLanguage: z.string().describe('The target programming language to translate the code into.'),
});
export type TranslateCodeInput = z.infer<typeof TranslateCodeInputSchema>;

const TranslateCodeOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  translatedCode: z.string().optional().describe('The final translated code.'),
  explanation: z.string().optional().describe('An explanation of the translation, including any potential issues or necessary library changes.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type TranslateCodeOutput = z.infer<typeof TranslateCodeOutputSchema>;


const translateCodePrompt = ai.definePrompt({
  name: 'translateCodePrompt',
  input: { schema: TranslateCodeInputSchema },
  output: { schema: z.object({
    translatedCode: z.string(),
    explanation: z.string(),
  }) },
  prompt: `You are an expert polyglot programmer who specializes in translating code from one language to another.

Your task is to translate the following code snippet from {{{sourceLanguage}}} to {{{targetLanguage}}}.

Source Code ({{{sourceLanguage}}}):
\`\`\`
{{{sourceCode}}}
\`\`\`

Please provide the following in your response:
1.  **Translated Code:** The equivalent code in {{{targetLanguage}}}. The code should be complete and ready to run.
2.  **Explanation:** A brief explanation of the translation. Highlight any important differences, potential pitfalls, or required changes in libraries or dependencies. For example, if translating a Python script using 'requests' to JavaScript, you might mention that 'axios' or 'fetch' would be the equivalent.

Provide the response in the required JSON format.
`,
});

export async function* translateCode(
  input: TranslateCodeInput
): AsyncGenerator<TranslateCodeOutput> {
  try {
    yield { status: `Translating from ${input.sourceLanguage} to ${input.targetLanguage}...` };
    yield { status: 'Analyzing source code...' };
    yield { status: 'Generating translated code with AI...' };
    
    const { output } = await translateCodePrompt(input);

    if (!output?.translatedCode) {
      throw new Error('AI failed to generate translated code.');
    }

    yield { status: 'Finalizing translation...' };
    yield { translatedCode: output.translatedCode, explanation: output.explanation };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during translation.';
    yield { error };
  }
}

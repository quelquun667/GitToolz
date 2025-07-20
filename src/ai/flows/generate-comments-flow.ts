'use server';

/**
 * @fileOverview Flow to generate documentation comments for source code.
 * 
 * - generateComments - A function that adds comments to a code snippet.
 * - GenerateCommentsInput - The input type for the generateComments function.
 * - GenerateCommentsOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCommentsInputSchema = z.object({
  sourceCode: z.string().describe('The source code to add comments to.'),
  language: z.string().describe('The programming language of the source code (e.g., "JavaScript", "Python").'),
  commentStyle: z.string().describe('The desired comment style (e.g., "JSDoc", "Python Docstrings").'),
});
export type GenerateCommentsInput = z.infer<typeof GenerateCommentsInputSchema>;

const GenerateCommentsOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  commentedCode: z.string().optional().describe('The final source code with added comments.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateCommentsOutput = z.infer<typeof GenerateCommentsOutputSchema>;


const generateCommentsPrompt = ai.definePrompt({
  name: 'generateCommentsPrompt',
  input: { schema: GenerateCommentsInputSchema },
  output: { schema: z.object({
    commentedCode: z.string(),
  }) },
  prompt: `You are an expert developer who writes excellent, clear, and comprehensive documentation comments for code.

Your task is to add documentation comments to the following {{{language}}} code. The comment style should be {{{commentStyle}}}.

- For each function, document its purpose, parameters, and what it returns.
- For complex blocks of logic, add inline comments to explain the reasoning.
- The output should be the complete, original code with the new comments integrated. Do not explain the code, just add the comments to it.

Source Code:
\`\`\`{{{language}}}
{{{sourceCode}}}
\`\`\`

Return the full, commented code in the \`commentedCode\` field.
`,
});

export async function* generateComments(
  input: GenerateCommentsInput
): AsyncGenerator<GenerateCommentsOutput> {
  try {
    yield { status: 'Analyzing source code...' };
    yield { status: `Applying ${input.commentStyle} style...` };
    yield { status: 'Generating comments with AI...' };
    
    const { output } = await generateCommentsPrompt(input);

    if (!output?.commentedCode) {
      throw new Error('AI failed to generate comments.');
    }

    yield { status: 'Finalizing...' };
    yield { commentedCode: output.commentedCode };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during comment generation.';
    yield { error };
  }
}

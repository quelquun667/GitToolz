'use server';

/**
 * @fileOverview Flow to extract function and class names from a source code file.
 * 
 * - extractFunctions - A function that extracts function/class names from file content.
 * - ExtractFunctionsInput - The input type for the extractFunctions function.
 * - ExtractFunctionsOutput - The return type for the extractFunctions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractFunctionsInputSchema = z.object({
  fileContent: z.string().describe('The source code of the file to analyze.'),
});
export type ExtractFunctionsInput = z.infer<typeof ExtractFunctionsInputSchema>;

const ExtractFunctionsOutputSchema = z.object({
  functions: z.array(z.string()).describe('A list of function and class names found in the file.'),
});
export type ExtractFunctionsOutput = z.infer<typeof ExtractFunctionsOutputSchema>;


const extractFunctionsPrompt = ai.definePrompt({
  name: 'extractFunctionsPrompt',
  input: { schema: ExtractFunctionsInputSchema },
  output: { schema: ExtractFunctionsOutputSchema },
  prompt: `You are an expert code parser. Your task is to analyze the following source code and extract the names of all top-level functions, classes, and exported variables that are functions.

  - Identify all function declarations (e.g., \`function myFunction() {}\`).
  - Identify all function expressions assigned to variables (e.g., \`const myFunction = () => {}\` or \`export const myFunction = function() {}\`).
  - Identify all class declarations (e.g., \`class MyClass {}\`).
  - Do not include methods inside classes.
  - Do not include functions inside other functions (closures).
  - Return only the names in the output array.

  Source Code:
  \`\`\`
  {{{fileContent}}}
  \`\`\`
  `,
});


export async function extractFunctions(input: ExtractFunctionsInput): Promise<ExtractFunctionsOutput> {
    const { output } = await extractFunctionsPrompt(input);
    return output || { functions: [] };
}

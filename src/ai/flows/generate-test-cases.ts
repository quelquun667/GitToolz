'use server';

/**
 * @fileOverview Test case generation flow.
 * 
 * - generateTestCases - A function that generates test cases for a specific function in a file.
 * - GenerateTestCasesInput - The input type for the generateTestCases function.
 * - GenerateTestCasesOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { getRepoFileContent } from '@/services/github';
import { z } from 'zod';

const GenerateTestCasesInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch or tag to analyze.'),
  filePath: z.string().describe('The path to the file containing the function to test.'),
  functionName: z.string().describe('The name of the function or class to generate tests for.'),
  testFramework: z.string().describe('The testing framework to use (e.g., Jest, Vitest, Pytest).'),
  fileContent: z.string().optional().describe('The full content of the file to be analyzed.'),
});
export type GenerateTestCasesInput = z.infer<typeof GenerateTestCasesInputSchema>;

const GenerateTestCasesOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  testCases: z.string().optional().describe('The final generated test cases as a block of code.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateTestCasesOutput = z.infer<typeof GenerateTestCasesOutputSchema>;

const generateTestCasesPrompt = ai.definePrompt({
  name: 'generateTestCasesPrompt',
  input: { schema: GenerateTestCasesInputSchema },
  output: { schema: z.object({ testCases: z.string() }) },
  prompt: `You are an expert Quality Assurance Engineer specializing in writing comprehensive and effective unit tests.

Your task is to generate a suite of test cases for a specific function within a given file.

- Testing Framework: {{{testFramework}}}
- File Path: {{{filePath}}}
- Function/Class to Test: {{{functionName}}}

Here is the content of the file:
\`\`\`
{{{fileContent}}}
\`\`\`

Please generate the test cases following these guidelines:
1.  **Use the specified testing framework ({{{testFramework}}}).** The syntax must be correct for this framework.
2.  **Cover multiple scenarios:**
    -   **Happy Path:** Test with typical, expected inputs.
    -   **Edge Cases:** Test with boundary values (e.g., empty strings, 0, null, undefined, large numbers).
    -   **Error Handling:** Test how the function behaves with invalid inputs.
3.  **Clarity:** Write clear and descriptive test descriptions (e.g., \`it('should return the sum of two positive numbers')\`).
4.  **Structure:** The output should be a single, complete block of code that can be directly added to a test file. Do not include any explanatory text or prose outside of the code block. Start the response directly with the code block (e.g., \`\`\`javascript\`).
5.  **Imports:** Include any necessary imports at the top of the test file.

Generate the test code now.`,
});

export async function* generateTestCases(
  input: Omit<GenerateTestCasesInput, 'fileContent'>
): AsyncGenerator<GenerateTestCasesOutput> {
  try {
    yield { status: 'Initializing test generation...' };
    yield { status: `Fetching content for \`${input.filePath}\`...` };

    const fileContent = await getRepoFileContent(input.repoUrl, input.branch, input.filePath);

    if (!fileContent) {
      throw new Error(`Could not read file content for: ${input.filePath}`);
    }

    yield { status: `Analyzing function \`${input.functionName}\`...` };
    yield { status: 'Generating test cases with AI...' };

    const finalInput = { ...input, fileContent };
    const { output } = await generateTestCasesPrompt(finalInput);

    if (!output?.testCases) {
      throw new Error('AI failed to generate test case content.');
    }

    yield { status: 'Finalizing test suite...' };
    yield { testCases: output.testCases };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}

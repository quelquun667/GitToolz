'use server';

/**
 * @fileOverview Test case generation flow.
 * 
 * - generateTestCases - A function that generates test cases for a specific function or an entire file.
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
  functionName: z.string().describe('The name of the function or class to generate tests for. If set to "[Entire File]", test all functions.'),
  testFramework: z.string().describe('The testing framework to use (e.g., Jest, Vitest, Pytest).'),
  fileContent: z.string().optional().describe('The full content of the file to be analyzed.'),
  isEntireFile: z.boolean().optional().describe('Flag to indicate if the entire file should be tested.'),
});
export type GenerateTestCasesInput = z.infer<typeof GenerateTestCasesInputSchema>;

const GenerateTestCasesOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  explanation: z.string().optional().describe('A step-by-step explanation of the generated tests.'),
  code: z.string().optional().describe('The final generated test code as a block of code.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateTestCasesOutput = z.infer<typeof GenerateTestCasesOutputSchema>;

const generateTestCasesPrompt = ai.definePrompt({
  name: 'generateTestCasesPrompt',
  input: { schema: GenerateTestCasesInputSchema },
  output: { schema: z.object({ 
    explanation: z.string().describe("A step-by-step explanation of the test cases being generated. Use Markdown for formatting. Explain what each group of tests does (e.g., happy path, edge cases, error handling)."),
    code: z.string().describe("The complete block of test code, formatted for the specified framework. This should be a single string containing the entire code block.") 
  }) },
  prompt: `You are an expert Quality Assurance Engineer specializing in writing comprehensive and effective unit tests.

Your task is to generate a suite of test cases for a specific target within a given file, and also provide a clear explanation of the tests.

- Testing Framework: {{{testFramework}}}
- File Path: {{{filePath}}}
{{#if isEntireFile}}
- Target: The entire file. You should generate tests for all functions and classes found.
{{else}}
- Function/Class to Test: {{{functionName}}}
{{/if}}

Here is the content of the file:
\`\`\`
{{{fileContent}}}
\`\`\`

Please generate the test cases and the explanation following these guidelines:

1.  **Explanation First:**
    *   Provide a step-by-step explanation in Markdown.
    *   Start with a brief overview of the testing strategy.
    *   Organize the explanation into logical sections (e.g., "Happy Path Tests", "Edge Case Scenarios", "Error Handling").
    *   For each section, briefly describe what the tests in that section are designed to verify.

2.  **Code Block Second:**
    *   **Use the specified testing framework ({{{testFramework}}}).** The syntax must be correct for this framework.
    *   **Cover multiple scenarios:** Happy Path, Edge Cases (e.g., empty strings, 0, null, undefined), and Error Handling.
    *   **Clarity:** Write clear and descriptive test descriptions (e.g., \`it('should return the sum of two positive numbers')\`).
    *   **Structure:** The output code should be a single, complete block that can be directly added to a test file. Do not include any explanatory text outside of the code block itself.
    *   **Imports:** Include any necessary imports at the top of the test file. Make sure to correctly import the functions/classes being tested from their source file ({{{filePath}}}).

Generate the JSON output with the 'explanation' and 'code' fields now.`,
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
    
    const isEntireFile = input.functionName === '[Entire File]';

    if (isEntireFile) {
        yield { status: `Analyzing all functions in the file...` };
    } else {
        yield { status: `Analyzing function \`${input.functionName}\`...` };
    }
    yield { status: 'Generating test cases with AI...' };

    const finalInput = { ...input, fileContent, isEntireFile };
    const { output } = await generateTestCasesPrompt(finalInput);

    if (!output?.code || !output?.explanation) {
      throw new Error('AI failed to generate complete test case content.');
    }

    yield { status: 'Finalizing test suite...' };
    yield { explanation: output.explanation, code: output.code };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}

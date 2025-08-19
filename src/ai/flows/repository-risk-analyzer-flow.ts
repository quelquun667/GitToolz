
'use server';

/**
 * @fileOverview Flow to analyze a repository for potential security risks.
 *
 * - analyzeRepositoryRisk - A function that analyzes a repo and provides a risk assessment.
 * - AnalyzeRepositoryRiskInput - The input type for the analyzeRepositoryRisk function.
 * - AnalyzeRepositoryRiskOutput - The type for a chunk of the streaming output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyzeRepositoryRiskInputSchema = z.object({
  fileTree: z.string().describe("The full file tree of the repository."),
  packageJsonContent: z.string().optional().describe("The content of the package.json file, if it exists."),
  mainFileContents: z.record(z.string()).describe("A map of file paths to their content for key files in the repository."),
});
export type AnalyzeRepositoryRiskInput = z.infer<typeof AnalyzeRepositoryRiskInputSchema>;

const RiskItemSchema = z.object({
  level: z.enum(['info', 'warning', 'critical']).describe('The severity level of the risk.'),
  description: z.string().describe('A clear and concise description of the potential risk found.'),
  file: z.string().optional().describe('The file path where the risk was identified, if applicable.'),
  suggestion: z.string().describe('A recommendation on how to mitigate or what to check for this risk.'),
});

const AnalyzeRepositoryRiskOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  overallRisk: z.enum(['Low', 'Medium', 'High', 'Critical']).optional().describe('An overall risk score for the repository.'),
  summary: z.string().optional().describe('A high-level summary of the security analysis.'),
  risks: z.array(RiskItemSchema).optional().describe('A list of specific risks identified.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type AnalyzeRepositoryRiskOutput = z.infer<typeof AnalyzeRepositoryRiskOutputSchema>;


const analyzeRepositoryRiskPrompt = ai.definePrompt({
  name: 'analyzeRepositoryRiskPrompt',
  input: { schema: AnalyzeRepositoryRiskInputSchema },
  output: { schema: z.object({
    overallRisk: z.enum(['Low', 'Medium', 'High', 'Critical']),
    summary: z.string(),
    risks: z.array(RiskItemSchema),
  })},
  prompt: `You are a Senior Security Engineer tasked with analyzing a software repository to determine if it's safe to download and run locally.

Your goal is to identify potential security risks. Analyze the provided file tree and key file contents.

**Project File Tree:**
\`\`\`
{{{fileTree}}}
\`\`\`

**Key File Contents:**
{{#each mainFileContents}}
--- FILE: {{{@key}}} ---
\`\`\`
{{{this}}}
\`\`\`
{{/each}}

Please perform the following security analysis:

1.  **Analyze \`package.json\` Scripts:** Look for suspicious commands in the \`scripts\` section, especially \`postinstall\`, \`preinstall\`, or \`install\` scripts. Any script that executes arbitrary code, downloads external files, or accesses the network is a potential risk.

2.  **Scan Source Code for Dangerous Patterns:** In the provided source files, look for patterns that could be malicious or dangerous, such as:
    *   Use of \`eval()\` or \`new Function()\`.
    *   Accessing sensitive environment variables (e.g., \`process.env.SECRET_KEY\`).
    *   Interacting with the file system (\`fs.unlink\`, \`fs.writeFile\`).
    *   Spawning child processes (\`child_process.exec\`).
    *   Making network requests to non-standard or hardcoded IP addresses.

3.  **Evaluate Dependencies (from \`package.json\`):** Based on your knowledge, are there any dependencies that are known to be outdated, deprecated, or have known vulnerabilities? You don't need real-time data, just use your general knowledge of the ecosystem.

4.  **Overall Assessment:** Based on your findings, provide an \`overallRisk\` level ('Low', 'Medium', 'High', 'Critical'). Also provide a \`summary\` explaining your reasoning.

5.  **List Specific Risks:** Detail each finding in the \`risks\` array. For each risk, specify its \`level\` ('info', 'warning', 'critical'), a \`description\`, the \`file\` it was found in, and a \`suggestion\` for mitigation.

Return your analysis in the specified JSON format. If no risks are found, return an 'Low' overall risk and an empty 'risks' array.`,
});

export async function* analyzeRepositoryRisk(
  input: AnalyzeRepositoryRiskInput
): AsyncGenerator<AnalyzeRepositoryRiskOutput> {
  try {
    yield { status: 'Initializing risk analysis...' };
    yield { status: 'Scanning package.json and project configuration...' };
    yield { status: 'Analyzing source code for suspicious patterns with AI...' };

    const { output } = await analyzeRepositoryRiskPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a risk analysis.');
    }

    yield { status: 'Finalizing report...' };
    yield { 
        overallRisk: output.overallRisk,
        summary: output.summary,
        risks: output.risks,
    };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during analysis.';
    yield { error };
  }
}

'use server';

/**
 * @fileOverview Flow to analyze and categorize GitHub issues.
 * 
 * - analyzeIssues - A function that analyzes a list of issues and returns a categorized summary.
 * - AnalyzeIssuesInput - The input type for the analyzeIssues function.
 * - AnalyzeIssuesOutput - The return type for the analyzeIssues function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const IssueSchema = z.object({
  title: z.string(),
  state: z.string(),
  labels: z.array(z.string()),
});

const AnalyzeIssuesInputSchema = z.object({
  issues: z.array(IssueSchema).describe('A list of GitHub issues with their title, state, and labels.'),
});
export type AnalyzeIssuesInput = z.infer<typeof AnalyzeIssuesInputSchema>;

const CategorizedIssuesSchema = z.object({
    category: z.enum(['Bug', 'Feature Request', 'Documentation', 'Question', 'Maintenance', 'Other']),
    count: z.number(),
    titles: z.array(z.string()),
});

const AnalyzeIssuesOutputSchema = z.object({
  totalOpen: z.number(),
  totalClosed: z.number(),
  categorizedIssues: z.array(CategorizedIssuesSchema),
  keyThemes: z.array(z.string()).describe('A list of 3-5 key themes or recurring topics found in the issues.'),
});
export type AnalyzeIssuesOutput = z.infer<typeof AnalyzeIssuesOutputSchema>;


const analyzeIssuesPrompt = ai.definePrompt({
  name: 'analyzeIssuesPrompt',
  input: { schema: AnalyzeIssuesInputSchema },
  output: { schema: AnalyzeIssuesOutputSchema },
  prompt: `You are an expert GitHub project manager. Your task is to analyze the following list of GitHub issues and provide a structured summary.

  Issues:
  {{#each issues}}
  - Title: "{{{this.title}}}" (State: {{this.state}}, Labels: [{{#each this.labels}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}])
  {{/each}}

  Please perform the following analysis and provide the output in the required JSON format:

  1.  **Count Totals:** Calculate the total number of open and closed issues from the list provided.
  
  2.  **Categorize Issues:** Group the issues into the following categories: 'Bug', 'Feature Request', 'Documentation', 'Question', 'Maintenance', 'Other'.
      - Use the issue title and labels to determine the best category for each issue.
      - For each category, provide the total count of issues and a list of the corresponding issue titles.
      - If a category has no issues, do not include it in the output array.

  3.  **Identify Key Themes:** Analyze all issue titles to identify 3-5 high-level, recurring themes or topics. This should give a quick overview of what the main discussion points are in the repository (e.g., "Login System Errors", "API Rate Limiting", "UI Component Refactoring").

  Provide the final analysis in the specified JSON format.
  `,
});


export async function analyzeIssues(input: AnalyzeIssuesInput): Promise<AnalyzeIssuesOutput> {
    const { output } = await analyzeIssuesPrompt(input);
    return output!;
}

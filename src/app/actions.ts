'use server';

import { generateDocumentation, type GenerateDocumentationInput } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { generateChangelog, type GenerateChangelogInput } from '@/ai/flows/generate-changelog';
import { generateTestCases, type GenerateTestCasesInput } from '@/ai/flows/generate-test-cases';
import { extractFunctions } from '@/ai/flows/extract-functions-flow';
import { suggestCommitMessage } from '@/ai/flows/suggest-commit-message';
import { analyzeIssues, type AnalyzeIssuesInput, type AnalyzeIssuesOutput } from '@/ai/flows/analyze-issues-flow';
import { 
  getRepoBranches, 
  getRepoCommitsByDate, 
  getRepoFileContent, 
  getRepoTree as getRepoTreeService, 
  validateRepo as validateRepoService, 
  getRepoDiff, 
  getCommitHistory,
  getRepoContributors,
  streamRepoFileCommits,
  getRepoIssues
} from '@/services/github';
import { z } from 'zod';

const docFormSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  branch: z.string().min(1, { message: 'Branch or tag is required.' }),
  sections: z.array(z.string()).min(1, { message: 'Please select at least one section.' }),
  badges: z.array(z.string()).optional(),
  badgePosition: z.enum(['top', 'bottom']).optional(),
  buyMeACoffeeUsername: z.string().optional(),
  twitterUsername: z.string().optional(),
  discordInviteCode: z.string().optional(),
  linkedinProfile: z.string().optional(),
  customInstructions: z.string().max(500, { message: 'Instructions cannot exceed 500 characters.' }).optional(),
  imageSource: z.enum(['none', 'url', 'repo']).optional(),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  imagePath: z.string().optional(),
  imagePosition: z.enum(['top', 'bottom']).optional(),
  fileTree: z.string().optional(), // Adding fileTree to the Zod schema
});

const fetchCommitsSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  branch: z.string().min(1, { message: 'Branch is required.' }),
  startDate: z.string().datetime({ message: 'Please select a valid start date.' }),
  endDate: z.string().datetime({ message: 'Please select a valid end date.' }),
});

const changelogFormSchema = z.object({
  commitMessages: z.array(z.string()).min(1, { message: 'Please select at least one commit.' }),
});

const validateRepoSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
});

const fetchTreeSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }),
  branch: z.string().min(1, { message: 'Branch is required.' }),
});

const fetchCommitGraphSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }),
  branch: z.string().min(1, { message: 'Branch is required.' }),
  startSha: z.string().optional(),
  endSha: z.string().optional(),
});

const testCaseFormSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string(),
  filePath: z.string().min(1, { message: 'File path is required.' }),
  functionName: z.string().min(1, { message: 'Function name is required.' }),
  testFramework: z.string().min(1, { message: 'Test framework is required.' }),
});

const extractFunctionsSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string(),
  filePath: z.string().min(1, { message: 'File path is required.' }),
});

const commitHelperSchema = z.object({
    repoUrl: z.string().url(),
    compareMode: z.enum(['branches', 'commit']),
    base: z.string().min(1),
    compare: z.string().optional(),
});

const analysisSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string(),
});


export async function getRepoTree(
  input: z.infer<typeof fetchTreeSchema>
): Promise<{ tree?: string[]; error?: string }> {
  const validatedFields = fetchTreeSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: 'Invalid input.' };
  }
  try {
    const tree = await getRepoTreeService(validatedFields.data.repoUrl, validatedFields.data.branch);
    const filePaths = tree.map(file => file.path);
    return { tree: filePaths };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error };
  }
}

export async function validateRepo(
  input: z.infer<typeof validateRepoSchema>
): Promise<{ error?: string }> {
  const validatedFields = validateRepoSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: 'Invalid input.' };
  }

  try {
    await validateRepoService(validatedFields.data.repoUrl);
    return {};
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error };
  }
}

export async function fetchBranchesAction(
  repoUrl: string
): Promise<{ branches?: string[]; error?: string }> {
  const validatedUrl = z.string().url().safeParse(repoUrl);
  if (!validatedUrl.success) {
    return { error: 'Invalid repository URL.' };
  }

  try {
    const branches = await getRepoBranches(repoUrl);
    if (branches.length === 0) {
      return { error: 'No branches found for this repository.' };
    }
    return { branches };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred while fetching branches.';
    return { error };
  }
}

export async function summarizeAction(documentation: string): Promise<{summary: string}> {
  try {
    const { summary } = await summarizeDocumentation({ documentationContent: documentation });
    return { summary };
  } catch(e) {
     return { summary: "Could not generate summary." };
  }
}

export async function fetchCommitsAction(
  input: z.infer<typeof fetchCommitsSchema>
): Promise<{ commits?: { sha: string; message: string; author: string | null, date: string }[]; error?: string }> {
    const validatedFields = fetchCommitsSchema.safeParse(input);
    if (!validatedFields.success) {
      return { error: "Invalid input." };
    }
    
    try {
      const commits = await getRepoCommitsByDate(validatedFields.data.repoUrl, validatedFields.data.branch, validatedFields.data.startDate, validatedFields.data.endDate);
      if (commits.length === 0) {
        return { error: 'No commits found in the specified date range.' };
      }
      return { commits };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
      return { error };
    }
}


export async function streamDocsAction(
  input: Omit<GenerateDocumentationInput, 'fileContents'>
): Promise<ReadableStream> {

  const validatedFields = docFormSchema.safeParse(input);
  
  if (!validatedFields.success) {
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: "Invalid input." }));
        controller.close();
      }
    });
    return errorStream;
  }

  const docStream = generateDocumentation(validatedFields.data);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of docStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return stream;
}

export async function streamChangelogAction(
  input: GenerateChangelogInput
): Promise<ReadableStream> {
  const validatedFields = changelogFormSchema.safeParse(input);

  if (!validatedFields.success) {
     const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: "Invalid input." }));
        controller.close();
      }
    });
    return errorStream;
  }

  const changelogStream = generateChangelog(validatedFields.data);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of changelogStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    }
  });

  return stream;
}

export async function streamTestCasesAction(
  input: Omit<GenerateTestCasesInput, 'fileContent'>
): Promise<ReadableStream> {
  const validatedFields = testCaseFormSchema.safeParse(input);

  if (!validatedFields.success) {
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: 'Invalid input.' }));
        controller.close();
      },
    });
    return errorStream;
  }
  
  const testCaseStream = generateTestCases(validatedFields.data);
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of testCaseStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return stream;
}

export async function extractFunctionsAction(
  input: z.infer<typeof extractFunctionsSchema>
): Promise<{ functions?: string[], error?: string }> {
  const validatedFields = extractFunctionsSchema.safeParse(input);
  if (!validatedFields.success) {
    return { error: 'Invalid input.' };
  }

  try {
    const fileContent = await getRepoFileContent(
      validatedFields.data.repoUrl,
      validatedFields.data.branch,
      validatedFields.data.filePath
    );
    if (!fileContent) {
      throw new Error('Could not read file content.');
    }
    const { functions } = await extractFunctions({ fileContent });
    return { functions };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred while extracting functions.';
    return { error };
  }
}

export async function commitHelperAction(
    input: z.infer<typeof commitHelperSchema>
): Promise<{ suggestions?: any[]; summary?: string; diff?: string; error?: string }> {
    const validatedFields = commitHelperSchema.safeParse(input);
    if (!validatedFields.success) {
        return { error: 'Invalid input.' };
    }

    try {
        const { repoUrl, compareMode, base, compare } = validatedFields.data;
        
        let diff: string | null;
        if (compareMode === 'branches') {
            // Compare two branches
            if (!compare) return { error: 'Compare branch is required.' };
            diff = await getRepoDiff(repoUrl, base, compare);
        } else {
            // Compare a commit to its parent
            diff = await getRepoDiff(repoUrl, `${base}^`, base);
        }

        if (diff === null || diff.trim() === '') {
            return { error: 'No differences found between the selected references.' };
        }
        
        const { suggestions, summary } = await suggestCommitMessage({ diff });
        
        return { suggestions, summary, diff };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error };
    }
}

export async function fetchCommitGraphAction(
  input: z.infer<typeof fetchCommitGraphSchema>
): Promise<{ commits?: { sha: string; message: string; author: string | null, parents: string[] }[]; error?: string }> {
    const validatedFields = fetchCommitGraphSchema.safeParse(input);
    if (!validatedFields.success) {
      return { error: "Invalid input." };
    }
    
    try {
      const commits = await getCommitHistory(
        validatedFields.data.repoUrl, 
        validatedFields.data.branch,
        validatedFields.data.startSha,
        validatedFields.data.endSha
      );
      if (commits.length === 0) {
        return { error: 'No commits found in the specified branch or range.' };
      }
      return { commits };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
      return { error };
    }
}

// Analysis Actions
export async function getContributorStatsAction(input: z.infer<typeof analysisSchema>) {
    const validatedFields = analysisSchema.safeParse(input);
    if (!validatedFields.success) return { error: 'Invalid input.' };
    try {
        const contributors = await getRepoContributors(validatedFields.data.repoUrl);
        return { contributors };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error };
    }
}

export async function streamCodeHotspotsAction(input: z.infer<typeof analysisSchema>) {
    const validatedFields = analysisSchema.safeParse(input);
    if (!validatedFields.success) {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(JSON.stringify({ error: 'Invalid input.' }));
          controller.close();
        },
      });
      return errorStream;
    }

    const hotspotsStream = streamRepoFileCommits(validatedFields.data.repoUrl, validatedFields.data.branch);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of hotspotsStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
        controller.close();
      },
    });

  return stream;
}

export async function analyzeIssuesAction(input: z.infer<typeof analysisSchema>): Promise<AnalyzeIssuesOutput | { error: string }> {
    const validatedFields = analysisSchema.safeParse(input);
    if (!validatedFields.success) return { error: 'Invalid input.' };
    try {
        const issues = await getRepoIssues(validatedFields.data.repoUrl);
        if (issues.length === 0) {
            return { totalOpen: 0, totalClosed: 0, categorizedIssues: [], keyThemes: [] };
        }
        const aiInput: AnalyzeIssuesInput = {
            issues: issues.map(issue => ({
                title: issue.title,
                state: issue.state,
                labels: issue.labels.map(l => typeof l === 'string' ? l : l.name).filter((n): n is string => !!n),
            }))
        };
        const analysis = await analyzeIssues(aiInput);
        return analysis;
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error };
    }
}

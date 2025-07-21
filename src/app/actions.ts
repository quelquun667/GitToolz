'use server';

import { generateDocumentation, type GenerateDocumentationInput } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { generateChangelog, type GenerateChangelogInput } from '@/ai/flows/generate-changelog';
import { generateTestCases, type GenerateTestCasesInput } from '@/ai/flows/generate-test-cases';
import { extractFunctions } from '@/ai/flows/extract-functions-flow';
import { suggestCommitMessage } from '@/ai/flows/suggest-commit-message';
import { analyzeIssues, type AnalyzeIssuesInput, type AnalyzeIssuesOutput } from '@/ai/flows/analyze-issues-flow';
import { translateCode, type TranslateCodeInput } from '@/ai/flows/translate-code-flow';
import { generateComments, type GenerateCommentsInput } from '@/ai/flows/generate-comments-flow';

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
  getRepoIssues,
  getRepoBranchesWithDetails
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
  base: z.string().min(1, { message: 'Base commit is required.' }),
  head: z.string().min(1, { message: 'Head commit is required.' }),
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

const codeTranslatorSchema = z.object({
  sourceCode: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
});

const commentGeneratorSchema = z.object({
  sourceCode: z.string().min(1),
  language: z.string().min(1),
  commentStyle: z.string().min(1),
});

const feedbackSchema = z.object({
  type: z.enum(['Feedback', 'Bug Report']),
  message: z.string().min(10, { message: 'Message must be at least 10 characters long.' }),
  name: z.string().optional(),
  email: z.string().email({ message: 'Please enter a valid email address.' }).optional().or(z.literal('')),
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
      const sortedCommits = commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedCommits.length === 0) {
        return { error: 'No commits found in the specified date range.' };
      }
      return { commits: sortedCommits };
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
        validatedFields.data.base,
        validatedFields.data.head,
      );
      if (commits.length === 0) {
        return { error: 'No commits found in the specified range.' };
      }
      return { commits };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
      return { error };
    }
}

export async function streamCodeTranslatorAction(
  input: TranslateCodeInput
): Promise<ReadableStream> {
  const validatedFields = codeTranslatorSchema.safeParse(input);
  if (!validatedFields.success) {
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: "Invalid input." }));
        controller.close();
      }
    });
    return errorStream;
  }

  const translationStream = translateCode(validatedFields.data);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of translationStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return stream;
}

export async function streamCommentGeneratorAction(
  input: GenerateCommentsInput
): Promise<ReadableStream> {
  const validatedFields = commentGeneratorSchema.safeParse(input);
  if (!validatedFields.success) {
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: "Invalid input." }));
        controller.close();
      }
    });
    return errorStream;
  }

  const commentStream = generateComments(validatedFields.data);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of commentStream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return stream;
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
        // If there are no issues, return a specific structure immediately without calling the AI.
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

export async function getBranchActivityAction(input: z.infer<typeof analysisSchema>) {
    const validatedFields = analysisSchema.safeParse(input);
    if (!validatedFields.success) return { error: 'Invalid input.' };
    try {
        const branches = await getRepoBranchesWithDetails(validatedFields.data.repoUrl, validatedFields.data.branch);
        return { branches };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown error occurred.';
        return { error };
    }
}


export async function sendFeedbackAction(
  input: z.infer<typeof feedbackSchema>
): Promise<{ success: boolean; error?: string }> {
  const validatedFields = feedbackSchema.safeParse(input);

  if (!validatedFields.success) {
    return { success: false, error: 'Invalid input.' };
  }

  const { type, message, name, email } = validatedFields.data;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL is not set.');
    return { success: false, error: 'Feedback service is not configured.' };
  }

  const embed = {
    title: type === 'Bug Report' ? `🐛 Bug Report` : `💡 Feedback`,
    color: type === 'Bug Report' ? 15548997 : 5793266, // Red for bug, Green for feedback
    fields: [
      {
        name: '📝 Message',
        value: message,
      },
    ],
    footer: {
      text: `Submitted at ${new Date().toUTCString()}`,
    },
  };
  
  const fields: { name: string; value: string; inline?: boolean }[] = [];
  if (name) {
    fields.push({ name: '👤 From', value: name, inline: true });
  }
  if (email) {
     fields.push({ name: '✉️ Email', value: email, inline: true });
  }
  if(fields.length > 0) {
    embed.fields.push(...fields);
  }


  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'GitToolz Feedback',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/14915/14915729.png',
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error('Failed to send to Discord:', response.status, await response.text());
      throw new Error('Could not submit feedback.');
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending feedback:', error);
    return { success: false, error: 'Failed to send feedback.' };
  }
}

    
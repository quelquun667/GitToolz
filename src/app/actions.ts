'use server';

import { generateDocumentation, type GenerateDocumentationInput } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { generateChangelog, type GenerateChangelogInput } from '@/ai/flows/generate-changelog';
import { getRepoBranches, getRepoCommitsByDate, validateRepo as validateRepoService } from '@/services/github';
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
): Promise<{ commits?: { sha: string; message: string; author: string | null }[]; error?: string }> {
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
  input: Omit<GenerateDocumentationInput, 'fileTree' | 'fileContents'>
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

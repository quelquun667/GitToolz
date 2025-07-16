'use server';

import { generateDocumentation, type GenerateDocumentationInput } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { generateChangelog, type GenerateChangelogInput } from '@/ai/flows/generate-changelog';
import { z } from 'zod';

const docFormSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  branch: z.string().min(1, { message: 'Branch or tag is required.' }),
  sections: z.array(z.string()).min(1, { message: 'Please select at least one section.' }),
  badges: z.array(z.string()).optional(),
});

const changelogFormSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  startRef: z.string().min(1, { message: 'Start tag/branch is required.' }),
  endRef: z.string().min(1, { message: 'End tag/branch is required.' }),
});


export async function summarizeAction(documentation: string): Promise<{summary: string}> {
  try {
    const { summary } = await summarizeDocumentation({ documentationContent: documentation });
    return { summary };
  } catch(e) {
     return { summary: "Could not generate summary." };
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

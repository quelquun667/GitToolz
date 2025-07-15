'use server';

import { generateDocumentationFlow, type StreamEvent, type GenerateDocumentationOutput } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { z } from 'zod';

const formSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  branch: z.string().min(1, { message: 'Branch or tag is required.' }),
  sections: z.array(z.string()).min(1, { message: 'Please select at least one section.' }),
});

export type FormState = {
  documentation: string | null;
  summary: string | null;
  repoUrl: string | null;
  branch: string | null;
  sections: string[] | null;
  errors?: {
    repoUrl?: string[];
    branch?: string[];
    sections?: string[];
    _form?: string[];
  } | null;
  // This key is used to trigger re-fetching of the status stream
  generationId?: number; 
};

export async function generateDocsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    repoUrl: formData.get('repoUrl'),
    branch: formData.get('branch'),
    sections: formData.getAll('sections'),
  });

  if (!validatedFields.success) {
    return {
      documentation: null,
      summary: null,
      repoUrl: formData.get('repoUrl') as string ?? null,
      branch: formData.get('branch') as string ?? null,
      sections: formData.getAll('sections') as string[] ?? null,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { repoUrl, branch, sections } = validatedFields.data;

  // This part of the action remains synchronous. It just kicks off the stream.
  // The client will then use the generationId to fetch the stream's content.
  return {
    documentation: null,
    summary: null,
    repoUrl,
    branch,
    sections,
    errors: null,
    generationId: Date.now(), // Use a unique ID to trigger the stream fetch
  };
}

// This is a new, separate action for streaming status updates.
export async function getDocsStatusAction(
  repoUrl: string,
  branch: string,
  sections: string[]
): Promise<ReadableStream> {
  const flow = await generateDocumentationFlow({ repoUrl, branch, sections });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of flow.stream()) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }

        // After the stream is done, we can get the final result.
        const result = await flow.response();
        if (result) {
          const { summary } = await summarizeDocumentation({ documentationContent: result.documentation });
          
          // Send a final event with all the data
          const finalEvent: StreamEvent & { summary?: string } = {
            type: 'result',
            data: {
              documentation: result.documentation,
            },
            summary: summary
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalEvent)}\n\n`));
        }
        controller.close();
      } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown streaming error occurred.';
        const errorEvent = { type: 'error', message: error };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
  });

  return stream;
}

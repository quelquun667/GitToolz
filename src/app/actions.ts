'use server';

import { generateDocumentationFlow } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { z } from 'zod';
import { ReadableStream } from 'stream/web';

const formSchema = z.object({
  repoUrl: z.string().url({ message: 'Please enter a valid Git repository URL.' }).min(1, { message: 'Repository URL is required.' }),
  branch: z.string().min(1, { message: 'Branch or tag is required.' }),
});

export type FormState = {
  documentation: string | null;
  summary: string | null;
  errors?: {
    repoUrl?: string[];
    branch?: string[];
    _form?: string[];
  } | null;
};

export async function generateDocsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = formSchema.safeParse({
    repoUrl: formData.get('repoUrl'),
    branch: formData.get('branch'),
  });

  if (!validatedFields.success) {
    return {
      documentation: null,
      summary: null,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const { repoUrl, branch } = validatedFields.data;
    const { response } = generateDocumentationFlow({ repoUrl, branch });
    const finalResponse = await response;

    if (!finalResponse || !finalResponse.documentation) {
      return {
        documentation: null,
        summary: null,
        errors: { _form: ['Failed to generate documentation. The model returned an empty response.'] },
      };
    }
    
    const { documentation } = finalResponse;

    const { summary } = await summarizeDocumentation({ documentationContent: documentation });
    
    return { documentation, summary, errors: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { 
      documentation: null, 
      summary: null,
      errors: { _form: [error] } 
    };
  }
}

export async function getDocsStatusAction(formData: FormData): Promise<ReadableStream<string>> {
  const validatedFields = formSchema.safeParse({
    repoUrl: formData.get('repoUrl'),
    branch: formData.get('branch'),
  });

  if (!validatedFields.success) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(JSON.stringify({ error: 'Invalid input.' }));
        controller.close();
      },
    });
    return stream as ReadableStream<string>;
  }
  
  const { repoUrl, branch } = validatedFields.data;
  const { stream } = generateDocumentationFlow({ repoUrl, branch });

  const webStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    },
  });

  return webStream;
}
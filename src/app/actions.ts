'use server';

import { generateDocumentation } from '@/ai/flows/generate-documentation';
import { summarizeDocumentation } from '@/ai/flows/summarize-documentation';
import { z } from 'zod';

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
    const { documentation } = await generateDocumentation({ repoUrl, branch });

    if (!documentation) {
      return {
        documentation: null,
        summary: null,
        errors: { _form: ['Failed to generate documentation. The model returned an empty response.'] },
      };
    }

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

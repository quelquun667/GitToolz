'use server';

import { generateDocumentationFlow } from '@/ai/flows/generate-documentation';
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

  try {
    const { repoUrl, branch, sections } = validatedFields.data;
    const documentationResponse = await generateDocumentationFlow({ repoUrl, branch, sections });

    if (!documentationResponse || !documentationResponse.documentation) {
      return {
        documentation: null,
        summary: null,
        repoUrl,
        branch,
        sections,
        errors: { _form: ['Failed to generate documentation. The model returned an empty response.'] },
      };
    }
    
    const { documentation } = documentationResponse;

    const { summary } = await summarizeDocumentation({ documentationContent: documentation });
    
    return { documentation, summary, repoUrl, branch, sections, errors: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { 
      documentation: null, 
      summary: null,
      repoUrl: validatedFields.data.repoUrl,
      branch: validatedFields.data.branch,
      sections: validatedFields.data.sections,
      errors: { _form: [error] } 
    };
  }
}

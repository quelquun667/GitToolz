
import { streamOnboardingGuideAction } from '@/app/actions';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const GenerateOnboardingGuideInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  fileTree: z.string().describe('The file tree of the repository, provided as a string.'),
  fileContents: z.record(z.string()).describe('A map of key file paths to their content.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedBody = GenerateOnboardingGuideInputSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await streamOnboardingGuideAction(validatedBody.data);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

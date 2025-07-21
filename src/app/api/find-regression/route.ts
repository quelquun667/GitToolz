
import { streamRegressionDetectiveAction } from '@/app/actions';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  author: z.string().nullable(),
  date: z.string(),
});

export const FindRegressionInputSchema = z.object({
  bugDescription: z.string().describe('A detailed description of the bug or regression.'),
  commits: z.array(CommitSchema).describe('A list of recent commits to analyze.'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedBody = FindRegressionInputSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await streamRegressionDetectiveAction(validatedBody.data);

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

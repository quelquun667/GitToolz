
import { streamAdvancedBranchComparison } from '@/app/actions';
import { getRepoDiff } from '@/services/github';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CompareBranchesAdvancedRequestSchema = z.object({
  repoUrl: z.string().url(),
  baseBranch: z.string(),
  headBranch: z.string(),
  commitMessages: z.array(z.string()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedBody = CompareBranchesAdvancedRequestSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { repoUrl, baseBranch, headBranch, commitMessages } = validatedBody.data;

    const diff = await getRepoDiff(repoUrl, baseBranch, headBranch);
    if (diff === null) {
      return new NextResponse(JSON.stringify({ error: 'Could not compute diff between branches.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const stream = await streamAdvancedBranchComparison({
        diff,
        commitMessages,
        headBranch,
        baseBranch,
    });

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

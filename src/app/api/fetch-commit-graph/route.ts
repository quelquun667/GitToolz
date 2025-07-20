import { fetchCommitGraphAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch } = await request.json();

    if (!repoUrl || !branch) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await fetchCommitGraphAction({ repoUrl, branch });

    if (result.error) {
        return new NextResponse(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json({ commits: result.commits });

  } catch (error) {
    console.error('API Error in fetch-commit-graph:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
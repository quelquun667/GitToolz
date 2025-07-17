import { fetchBranchesAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();

    if (!repoUrl) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameter: repoUrl' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await fetchBranchesAction(repoUrl);

    if (result.error) {
        return new NextResponse(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json({ branches: result.branches });

  } catch (error) {
    console.error('API Error in fetch-branches:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

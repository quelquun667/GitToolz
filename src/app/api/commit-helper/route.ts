
import { commitHelperAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, compareMode, base, compare } = await request.json();

    if (!repoUrl || !compareMode || !base) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await commitHelperAction({ repoUrl, compareMode, base, compare });

    if (result.error) {
        return new NextResponse(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error in commit-helper:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

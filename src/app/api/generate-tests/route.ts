
import { streamTestCasesAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch, filePath, functionName, testFramework } = await request.json();

    if (!repoUrl || !branch || !filePath || !functionName || !testFramework) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await streamTestCasesAction({ repoUrl, branch, filePath, functionName, testFramework });

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

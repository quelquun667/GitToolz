import { streamDocsAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch, sections, badges, badgePosition, buyMeACoffeeUsername, twitterUsername } = await request.json();

    if (!repoUrl || !branch || !sections) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stream = await streamDocsAction({ repoUrl, branch, sections, badges, badgePosition, buyMeACoffeeUsername, twitterUsername });

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

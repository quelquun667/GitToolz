
import { getRepoFileContent } from '@/services/github';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch, path } = await request.json();

    if (!repoUrl || !branch || !path) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = await getRepoFileContent(repoUrl, branch, path);

    if (content === null) {
        return new NextResponse(JSON.stringify({ error: `Could not fetch content for file: ${path}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json({ content });

  } catch (error) {
    console.error('API Error in fetch-file-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

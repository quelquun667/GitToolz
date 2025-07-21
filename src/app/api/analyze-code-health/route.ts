
import { analyzeCodeHealthAction } from '@/app/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { repoUrl, branch, filePath } = await request.json();

    if (!repoUrl || !branch || !filePath) {
      return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileContentResponse = await fetch(`${request.nextUrl.origin}/api/fetch-file-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, path: filePath }),
    });
    const fileContentResult = await fileContentResponse.json();
    if (!fileContentResponse.ok) {
        throw new Error(fileContentResult.error || `Failed to fetch content for ${filePath}`);
    }
    const fileContent = fileContentResult.content;

    const extension = filePath.split('.').pop()?.toLowerCase() || 'text';
    const languageMap: Record<string, string> = {
        'js': 'JavaScript', 'ts': 'TypeScript', 'py': 'Python', 'java': 'Java', 'go': 'Go', 'rs': 'Rust', 'php': 'PHP'
    };
    const language = languageMap[extension] || 'unknown';


    const result = await analyzeCodeHealthAction({ filePath, fileContent, language });
    
    if (result.error) {
        return new NextResponse(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json(result.result);

  } catch (error) {
    console.error('API Error in analyze-code-health:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

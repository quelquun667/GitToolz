
import { analyzeDependenciesAction, getRepoTree } from '@/app/actions';
import { getRepoFileContent } from '@/services/github';
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
    
    // Fetch package.json content
    const packageJsonContent = await getRepoFileContent(repoUrl, branch, 'package.json');
    if (!packageJsonContent) {
        return new NextResponse(JSON.stringify({ error: 'Could not find or read package.json in the selected branch.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    // Fetch file tree
    const treeResult = await getRepoTree({ repoUrl, branch });
    if (treeResult.error || !treeResult.tree) {
        return new NextResponse(JSON.stringify({ error: 'Could not fetch the repository file tree.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    const fileTree = treeResult.tree.join('\n');


    const result = await analyzeDependenciesAction({ packageJsonContent, fileTree });
    
    if (result.error) {
        return new NextResponse(JSON.stringify({ error: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json(result.result);

  } catch (error) {
    console.error('API Error in analyze-dependencies:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

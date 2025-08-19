
import { streamRepositoryRiskAnalysis } from '@/app/actions';
import { getRepoFileContent, getRepoTree } from '@/services/github';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AnalyzeRepositoryRiskRequestSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string(),
});

const KEY_FILES_TO_READ = [
  'package.json',
  'next.config.js', 'next.config.mjs',
  'vite.config.js', 'vite.config.ts',
  'server.js', 'app.js', 'index.js',
  'server.ts', 'app.ts', 'index.ts',
  'main.py',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedBody = AnalyzeRepositoryRiskRequestSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { repoUrl, branch } = validatedBody.data;

    // 1. Fetch file tree
    const allFiles = await getRepoTree(repoUrl, branch);
    const fileTree = allFiles.map(f => f.path).join('\n');
    
    // 2. Fetch package.json if it exists
    const packageJsonContent = await getRepoFileContent(repoUrl, branch, 'package.json') || undefined;

    // 3. Fetch content for other key files
    const mainFileContents: Record<string, string> = {};
    const filesToRead = allFiles
      .map(f => f.path)
      .filter(path => KEY_FILES_TO_READ.some(keyFile => path.toLowerCase().endsWith(keyFile.toLowerCase())));
      
    await Promise.all(filesToRead.map(async (path) => {
        const content = await getRepoFileContent(repoUrl, branch, path);
        if (content !== null) {
            mainFileContents[path] = content;
        }
    }));
    
    const stream = await streamRepositoryRiskAnalysis({
        fileTree,
        packageJsonContent,
        mainFileContents,
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


import { streamGhostDependencyAnalysis } from '@/app/actions';
import { getRepoFileContent, getRepoTree } from '@/services/github';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const GhostDependencyRequestSchema = z.object({
  repoUrl: z.string().url(),
  branch: z.string(),
});

// A list of file extensions to consider as source code
const SOURCE_FILE_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', // JavaScript/TypeScript
  '.html', '.css', '.scss', '.less', // Web
  '.json', // Config
  '.py', // Python
  '.java', // Java
  '.cs', // C#
  '.go', // Go
  '.rs', // Rust
  '.php', // PHP
  '.rb', // Ruby
  '.swift', // Swift
  '.kt', // Kotlin
  '.vue', // Vue
  '.svelte', // Svelte
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedBody = GhostDependencyRequestSchema.safeParse(body);

    if (!validatedBody.success) {
      return new NextResponse(JSON.stringify({ error: 'Missing or invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { repoUrl, branch } = validatedBody.data;

    // 1. Fetch package.json
    const packageJsonContent = await getRepoFileContent(repoUrl, branch, 'package.json');
    if (!packageJsonContent) {
      return new NextResponse(JSON.stringify({ error: 'package.json not found in the repository.' }), {
        status: 404,
      });
    }

    // 2. Fetch all file paths
    const allFiles = await getRepoTree(repoUrl, branch);
    const sourceFiles = allFiles
        .map(file => file.path)
        .filter(path => SOURCE_FILE_EXTENSIONS.some(ext => path.endsWith(ext)));

    // 3. Fetch content for all source files
    const allFileContents: Record<string, string> = {};
    await Promise.all(sourceFiles.map(async (path) => {
        const content = await getRepoFileContent(repoUrl, branch, path);
        if (content !== null) {
            allFileContents[path] = content;
        }
    }));
    
    const stream = await streamGhostDependencyAnalysis({
        packageJsonContent,
        allFileContents,
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

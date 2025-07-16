import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.warn(
      'GITHUB_TOKEN environment variable not set. GitHub API requests will be unauthenticated and subject to stricter rate limits.'
    );
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

function parseRepoUrl(url: string): { owner: string; repo: string } {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'github.com') {
      throw new Error('Not a GitHub URL');
    }
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub repository URL path.');
    }
    const [owner, repo] = pathParts;
    return { owner, repo: repo.replace('.git', '') };
  } catch (error) {
    throw new Error('Invalid repository URL provided.');
  }
}

export async function getRepoTree(repoUrl: string, branch: string): Promise<{ path: string; type: string; }[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        const { data } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: branch,
            recursive: '1',
        });

        if (Array.isArray(data.tree)) {
             return data.tree
                .filter(file => file.type === 'blob' && file.path)
                .map(file => ({
                    path: file.path!,
                    type: file.type!,
                }));
        }
        return [];
    } catch (error: any) {
        if (error.status === 404) {
            throw new Error(`Repository not found or branch "${branch}" does not exist. Please check the URL and branch name.`);
        }
        if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
        }
        console.error('GitHub API Error:', error);
        throw new Error('Failed to fetch repository tree from GitHub.');
    }
}

export async function getRepoFileContent(repoUrl: string, branch: string, path: string): Promise<string | null> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: branch,
            mediaType: {
                format: "raw",
            },
        });
        
        // The 'raw' media type returns the content directly as a string for text files.
        // For other types it might be an object, so we check if it's a string.
        if (typeof data === 'string') {
            return data;
        }
        return null;

    } catch (error) {
        console.error(`Failed to fetch content for file ${path}:`, error);
        // We return null instead of throwing an error so the whole process doesn't fail
        // if one file is unreadable.
        return null; 
    }
}

export async function getRepoCommits(repoUrl: string, startRef: string, endRef: string): Promise<{sha: string, message: string, author: string | null}[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const { data } = await octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: startRef,
            head: endRef,
        });

        if (data.commits) {
            return data.commits.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.author?.login ?? 'Unknown',
            }));
        }

        return [];
    } catch(error: any) {
        if (error.status === 404) {
            throw new Error(`Could not find one or both of the specified tags/branches: "${startRef}" or "${endRef}".`);
        }
         if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
        }
        console.error('GitHub API Error:', error);
        throw new Error('Failed to fetch commits from GitHub.');
    }
}

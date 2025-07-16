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

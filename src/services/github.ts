

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
      throw new Error('Invalid GitHub URL: must be a github.com link.');
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

export async function validateRepo(repoUrl: string): Promise<void> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  try {
    await octokit.rest.repos.get({ owner, repo });
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error('Repository not found. Please check the URL.');
    }
    if (error.status === 401) {
      throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
    }
    throw new Error('Failed to access repository. Check URL and token permissions.');
  }
}

export async function getRepoBranches(repoUrl: string): Promise<string[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
            owner,
            repo,
            per_page: 100,
        });
        return branches.map(branch => branch.name);
    } catch (error: any) {
        if (error.status === 404) {
            throw new Error('Repository not found when fetching branches.');
        }
        console.error('GitHub API Error fetching branches:', error);
        throw new Error('Failed to fetch repository branches from GitHub.');
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
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref: branch,
            mediaType: {
                format: "raw",
            },
        });
        
        // When using "raw" media type, the content is directly in response.data
        if (typeof response.data === 'string') {
            return response.data;
        }

        // Fallback for non-raw (though less likely with the mediaType option)
        const data: any = response.data;
        if (data.encoding === 'base64' && data.content) {
            return Buffer.from(data.content, 'base64').toString('utf-8');
        }

        return null;

    } catch (error) {
        console.error(`Failed to fetch content for file ${path}:`, error);
        return null; 
    }
}

export async function getRepoCommitsByDate(repoUrl: string, branch: string, startDate: string, endDate: string): Promise<{sha: string, message: string, author: string | null, date: string}[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const { data } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            sha: branch,
            since: startDate,
            until: endDate,
            per_page: 100, // Max commits to fetch
        });

        if (data) {
            return data.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.author?.login ?? 'Unknown',
                date: commit.commit.author?.date ?? new Date().toISOString(),
            }));
        }

        return [];
    } catch(error: any) {
        if (error.status === 404) {
            throw new Error(`Could not find the specified branch: "${branch}".`);
        }
         if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
        }
        console.error('GitHub API Error:', error);
        throw new Error('Failed to fetch commits from GitHub.');
    }
}

export async function getRepoDiff(repoUrl: string, base: string, head: string): Promise<string | null> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const response = await octokit.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${base}...${head}`,
            mediaType: {
                format: "diff",
            },
        });
        
        if (response.status === 200 && typeof response.data === 'string') {
            return response.data;
        }
        
        return null;

    } catch(error: any) {
        if (error.status === 404) {
            throw new Error(`Could not compare references. One of "${base}" or "${head}" may not exist.`);
        }
        if (error.status === 401) {
           throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
        }
        console.error('GitHub API Error fetching diff:', error);
        throw new Error('Failed to fetch diff from GitHub.');
    }
}

export async function getCommitHistory(
    repoUrl: string,
    branch: string,
    startSha?: string,
    endSha?: string
): Promise<{ sha: string; message: string; author: string | null; parents: string[] }[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        const allCommits = await octokit.paginate(octokit.rest.repos.listCommits, {
            owner,
            repo,
            sha: branch,
            per_page: 100,
        });

        const commits = allCommits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.author?.login ?? 'Unknown',
            parents: commit.parents.map(p => p.sha),
        }));

        if (!startSha || !endSha) {
            // If no range, return the latest 100 commits from the branch
            return commits.slice(0, 100);
        }

        // If a range is provided, find the commits within that range
        const commitMap = new Map(commits.map(c => [c.sha, c]));
        const rangeCommits: { sha: string; message: string; author: string | null; parents: string[] }[] = [];
        const queue = [endSha];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentSha = queue.shift();
            if (!currentSha || visited.has(currentSha)) continue;
            
            const currentCommit = commitMap.get(currentSha);
            if (!currentCommit) continue;
            
            visited.add(currentSha);
            rangeCommits.push(currentCommit);

            if (currentSha === startSha) break; // Stop when we reach the start commit

            for (const parent of currentCommit.parents) {
                if (!visited.has(parent)) {
                    queue.push(parent);
                }
            }
        }
        
        // Also ensure start commit is included if it was missed
        if (!visited.has(startSha)) {
             const startCommitData = commitMap.get(startSha);
             if (startCommitData) rangeCommits.push(startCommitData);
        }

        return rangeCommits;

    } catch (error: any) {
        if (error.status === 404) {
            throw new Error(`Could not find the specified branch: "${branch}".`);
        }
        if (error.status === 401) {
            throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
        }
        console.error('GitHub API Error:', error);
        throw new Error('Failed to fetch commits from GitHub.');
    }
}


// Analysis Services

export async function getRepoContributors(repoUrl: string): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const contributors = await octokit.paginate(octokit.rest.repos.listContributors, {
            owner,
            repo,
        });
        return contributors.filter(c => c.type === 'User');
    } catch (e: any) {
        console.error('GitHub API Error fetching contributors:', e);
        throw new Error('Failed to fetch contributors from GitHub.');
    }
}

export async function getRepoFileCommits(repoUrl: string, branch: string): Promise<{ path: string; commitCount: number }[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
            owner,
            repo,
            sha: branch,
            per_page: 100, // Look at the last 100 commits for performance
        });

        const fileCounts: Record<string, number> = {};

        for (const commit of commits) {
            const { data: commitData } = await octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: commit.sha,
            });

            if (commitData.files) {
                for (const file of commitData.files) {
                    if (file.filename) {
                        fileCounts[file.filename] = (fileCounts[file.filename] || 0) + 1;
                    }
                }
            }
        }

        return Object.entries(fileCounts).map(([path, commitCount]) => ({ path, commitCount }));
    } catch (e: any) {
        console.error('GitHub API Error fetching file commits:', e);
        throw new Error('Failed to analyze file commit history.');
    }
}

export async function getRepoIssues(repoUrl: string): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
            owner,
            repo,
            state: 'all', // Fetch both open and closed issues
            per_page: 100,
        });
        // Filter out pull requests
        return issues.filter(issue => !issue.pull_request);
    } catch (e: any) {
        console.error('GitHub API Error fetching issues:', e);
        throw new Error('Failed to fetch issues from GitHub. The repository may have issues disabled.');
    }
}

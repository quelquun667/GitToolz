
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

function handleApiError(error: any, context?: string): never {
    if (error.status === 404) {
      throw new Error(`Repository or resource not found. Please check the URL and branch name. Context: ${context}`);
    }
    if (error.status === 401) {
      throw new Error('GitHub API authentication failed. Please check your GITHUB_TOKEN.');
    }
    if (error.status === 403) {
      const rateLimitReset = error.response?.headers?.['x-ratelimit-reset'];
      let message = 'GitHub API rate limit exceeded.';
      if (rateLimitReset) {
        const resetTime = new Date(rateLimitReset * 1000).toLocaleTimeString();
        message += ` Please wait until ${resetTime} or use a GITHUB_TOKEN for higher limits.`;
      }
      throw new Error(message);
    }
    console.error(`GitHub API Error (${context}):`, error);
    throw new Error(`Failed to fetch from GitHub. Context: ${context}`);
}

export async function getRepoDetails(repoUrl: string): Promise<any> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return data;
  } catch (error: any) {
    handleApiError(error, 'getRepoDetails');
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
        handleApiError(error, 'getRepoBranches');
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
        handleApiError(error, 'getRepoTree');
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
            const sortedCommits = data.sort((a, b) => {
                const dateA = a.commit.author?.date ? new Date(a.commit.author.date).getTime() : 0;
                const dateB = b.commit.author?.date ? new Date(b.commit.author.date).getTime() : 0;
                return dateB - dateA;
            });
            return sortedCommits.map(commit => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.author?.login ?? 'Unknown',
                date: commit.commit.author?.date ?? new Date().toISOString(),
            }));
        }

        return [];
    } catch(error: any) {
        handleApiError(error, `getRepoCommitsByDate on branch "${branch}"`);
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
        handleApiError(error, `getRepoDiff between "${base}" and "${head}"`);
    }
}

export async function getCommitHistory(
    repoUrl: string,
    base: string,
    head: string
): Promise<{ sha: string; message: string; author: string | null; parents: string[] }[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${base}...${head}`
        });
        
        const commitsToReturn = data.commits.map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.author?.login ?? 'Unknown',
            parents: commit.parents.map(p => p.sha),
        }));

        // The head commit itself is included in the comparison, so we need to fetch it separately to get its parents
        const headCommitResponse = await octokit.rest.repos.getCommit({ owner, repo, ref: head });
        commitsToReturn.push({
            sha: headCommitResponse.data.sha,
            message: headCommitResponse.data.commit.message,
            author: headCommitResponse.data.author?.login ?? 'Unknown',
            parents: headCommitResponse.data.parents.map(p => p.sha),
        });
        
        return commitsToReturn;

    } catch (error: any) {
        handleApiError(error, `getCommitHistory between ${base} and ${head}`);
    }
}


// Analysis Services
export async function getRepoContributors(repoUrl: string, limit?: number): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const contributors = await octokit.paginate(octokit.rest.repos.listContributors, {
            owner,
            repo,
        });
        const filtered = contributors.filter(c => c.type === 'User');
        return limit ? filtered.slice(0, limit) : filtered;
    } catch (e: any) {
        handleApiError(e, 'getRepoContributors');
    }
}

export async function* streamRepoFileCommits(repoUrl: string, branch: string): AsyncGenerator<{ status?: string, progress?: number, hotspots?: { path: string; commitCount: number }[], error?: string }> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        yield { status: 'Fetching commit history...' };
        const commits = await octokit.paginate(octokit.rest.repos.listCommits, {
            owner,
            repo,
            sha: branch,
            per_page: 100,
        });

        if (commits.length === 0) {
            yield { hotspots: [] };
            return;
        }

        const fileCounts: Record<string, number> = {};
        yield { status: 'Analyzing commits...', progress: 0 };
        
        let processedCommits = 0;
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
            processedCommits++;
            const progress = (processedCommits / commits.length) * 100;
            yield { 
                status: `Analyzing commit ${processedCommits} of ${commits.length}...`, 
                progress: progress 
            };
        }

        const hotspots = Object.entries(fileCounts).map(([path, commitCount]) => ({ path, commitCount }));
        yield { status: 'Finalizing analysis...', progress: 100 };
        yield { hotspots };

    } catch (e: any) {
        console.error('GitHub API Error fetching file commits:', e);
        if (e.status === 403) {
            yield { error: 'GitHub API rate limit exceeded. Please wait or use a GITHUB_TOKEN.' };
        } else {
            yield { error: 'Failed to analyze file commit history.' };
        }
    }
}

export async function getRepoIssues(repoUrl: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
            owner,
            repo,
            state: state,
            per_page: 100,
        });
        // Filter out pull requests
        return issues.filter(issue => !issue.pull_request);
    } catch (e: any) {
        if (e.status === 404 || e.status === 410) { // 410 Gone if issues are disabled
             throw new Error('Failed to fetch issues. The repository may have issues disabled or be private.');
        }
        handleApiError(e, 'getRepoIssues');
    }
}

export async function getRepoBranchesWithDetails(repoUrl: string, defaultBranch: string): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const branches = await octokit.paginate(octokit.rest.repos.listBranches, {
            owner,
            repo,
        });
        
        const branchDetails = await Promise.all(branches.map(async (branch) => {
            const { data: commit } = await octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: branch.commit.sha,
            });

            const { data: compare } = await octokit.rest.repos.compareCommits({
                owner,
                repo,
                base: defaultBranch,
                head: branch.name,
            });

            return {
                name: branch.name,
                lastCommit: {
                    date: commit.commit.author?.date,
                    author: commit.author?.login,
                },
                aheadBy: compare.ahead_by,
                behindBy: compare.behind_by,
                isProtected: branch.protected,
            };
        }));
        
        return branchDetails;

    } catch (e: any) {
        handleApiError(e, 'getRepoBranchesWithDetails');
    }
}


export async function getRepoLanguages(repoUrl: string): Promise<Record<string, number>> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const { data } = await octokit.rest.repos.listLanguages({
            owner,
            repo,
        });
        return data;
    } catch (e: any) {
        handleApiError(e, 'getRepoLanguages');
    }
}

export async function getRepoEvents(repoUrl: string): Promise<any[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);
    try {
        const { data } = await octokit.rest.activity.listRepoEvents({
            owner,
            repo,
            per_page: 20, // Fetch more events, we will filter them
        });
        return data.filter(event => 
            event.type === 'PushEvent' || 
            event.type === 'PullRequestEvent' || 
            event.type === 'IssuesEvent' || 
            event.type === 'CreateEvent' ||
            event.type === 'DeleteEvent'
        );
    } catch (e: any) {
        handleApiError(e, 'getRepoEvents');
    }
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { Network } from 'vis-network';
import type { Options, Node, Edge } from 'vis-network';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, Search, AlertCircle, GitCommitVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type CommitNode = {
  sha: string;
  message: string;
  author: string | null;
  parents: string[];
};

type CommitGraphProps = {
  repoUrl: string;
  branches: string[];
};

export default function CommitGraph({ repoUrl, branches }: CommitGraphProps) {
  const { toast } = useToast();
  const visJsRef = useRef<HTMLDivElement>(null);

  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0];
      setBranch(defaultBranch);
    }
  }, [branches]);
  
  const handleFetchAndDrawGraph = async () => {
    if (!branch) {
      toast({ variant: 'destructive', title: 'Please select a branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fetch-commit-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch commit history.');
      }
      
      drawGraph(result.commits);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const drawGraph = (commits: CommitNode[]) => {
    if (!visJsRef.current) return;

    const nodes: Node[] = commits.map((commit, index) => ({
      id: commit.sha,
      label: commit.sha.substring(0, 7),
      title: `<b>${commit.message.split('\n')[0]}</b><br>${commit.author}<br>${commit.sha}`,
      shape: 'dot',
      size: 10,
      font: {
        size: 14,
        color: '#ffffff'
      },
    }));

    const edges: Edge[] = [];
    commits.forEach(commit => {
      commit.parents.forEach(parentSha => {
        edges.push({
          from: commit.sha,
          to: parentSha,
          arrows: 'to',
        });
      });
    });

    const data = { nodes, edges };
    const options: Options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'UD',
          sortMethod: 'directed',
          levelSeparation: 100,
          nodeSpacing: 150,
        },
      },
      physics: {
        enabled: false,
      },
      nodes: {
        color: {
            border: 'hsl(var(--primary))',
            background: 'hsl(var(--primary))',
            highlight: {
                border: 'hsl(var(--accent-foreground))',
                background: 'hsl(var(--accent))'
            }
        },
        font: {
            color: 'hsl(var(--foreground))'
        },
        shape: 'dot',
        size: 12
      },
      edges: {
        color: {
            color: 'hsl(var(--border))',
            highlight: 'hsl(var(--primary))'
        },
        smooth: {
            type: 'cubicBezier',
            forceDirection: 'vertical',
            roundness: 0.4
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        dragNodes: false,
      },
    };

    new Network(visJsRef.current, data, options);
  };
  
  const isFetchDisabled = !branch || isLoading;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[350px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Commit Graph</CardTitle>
            <CardDescription>Visualize the commit history of a branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch to Visualize</Label>
              <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                  <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                      {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFetchAndDrawGraph} className="w-full" disabled={isFetchDisabled}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Search className="mr-2 h-4 w-4" />Generate Graph</>}
            </Button>
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 relative">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
              <Alert variant="destructive" className="max-w-md border-none">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Generate Graph</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          {!isLoading && !error && !visJsRef.current?.childNodes.length && (
            <div className="text-center">
              <GitCommitVertical className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Awaiting Graph Generation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select a branch and click "Generate Graph".</p>
            </div>
          )}
          {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="mt-4 text-muted-foreground">Fetching commit history...</p>
              </div>
          )}
          <div ref={visJsRef} className="w-full h-full" />
        </div>
      </main>
    </div>
  );
}
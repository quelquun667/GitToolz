
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Network } from 'vis-network';
import type { Options, Node, Edge } from 'vis-network';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, Search, AlertCircle, GitCommitVertical, Expand } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import CommitSelector from './commit-selector';

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
  const visJsModalRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);
  const modalNetworkInstanceRef = useRef<Network | null>(null);
  
  const [baseCommit, setBaseCommit] = useState('');
  const [headCommit, setHeadCommit] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<CommitNode[] | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  

  const handleFetchAndDrawGraph = async () => {
    if (!baseCommit || !headCommit) {
        toast({ variant: 'destructive', title: 'Please select a start and end commit.' });
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setGraphData(null);

    try {
      const response = await fetch('/api/fetch-commit-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl, 
          base: baseCommit,
          head: headCommit,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch commit history.');
      }
      
      setGraphData(result.commits);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const drawGraph = useCallback((
    container: HTMLDivElement | null, 
    networkRef: React.MutableRefObject<Network | null>,
    commits: CommitNode[], 
    isModal = false
  ) => {
    if (!container) return;

    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }

    const nodes: Node[] = commits.map((commit) => ({
      id: commit.sha,
      label: commit.sha.substring(0, 7),
      title: `<b>${commit.message.split('\n')[0]}</b><br>${commit.author}<br>${commit.sha}`,
    }));

    const edges: Edge[] = [];
    const commitIds = new Set(commits.map(c => c.sha));
    commits.forEach(commit => {
      commit.parents.forEach(parentSha => {
        if (commitIds.has(parentSha)) {
            edges.push({
              from: commit.sha,
              to: parentSha,
              arrows: 'to',
            });
        }
      });
    });

    const data = { nodes, edges };
    const options: Options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 200,
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
            forceDirection: 'horizontal',
            roundness: 0.4
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        dragNodes: false,
        zoomView: true,
        dragView: true,
      },
    };
    
    const network = new Network(container, data, options);
    networkRef.current = network;

    const fitGraph = () => {
        if (network && container && container.offsetParent) {
            network.fit();
        }
    };
    
    setTimeout(fitGraph, 100);
    
    const observer = new ResizeObserver(fitGraph);
    if(container) observer.observe(container);

    return () => {
      if(container) observer.unobserve(container);
      if (network) network.destroy();
    };

  }, []);
  
  useEffect(() => {
    if (graphData && visJsRef.current) {
      drawGraph(visJsRef.current, networkInstanceRef, graphData);
    }
  }, [graphData, drawGraph]);

  useEffect(() => {
    if (isGraphModalOpen && graphData) {
      // Delay drawing in modal to allow it to render
      setTimeout(() => {
        if (visJsModalRef.current) {
          drawGraph(visJsModalRef.current, modalNetworkInstanceRef, graphData, true);
        }
      }, 100);
    }
  }, [isGraphModalOpen, graphData, drawGraph]);
  
  const isFetchDisabled = isLoading || !baseCommit || !headCommit;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Commit Graph</CardTitle>
            <CardDescription>Select two commits to visualize the history between them.</CardDescription>
          </CardHeader>
           <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Start Commit</Label>
                    <CommitSelector 
                        repoUrl={repoUrl} 
                        branches={branches}
                        onCommitSelect={setBaseCommit}
                        instanceId="base"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>End Commit</Label>
                     <CommitSelector 
                        repoUrl={repoUrl} 
                        branches={branches}
                        onCommitSelect={setHeadCommit}
                        instanceId="head"
                    />
                 </div>
            </CardContent>
        </Card>

        <Button onClick={handleFetchAndDrawGraph} className="w-full" disabled={isFetchDisabled}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Search className="mr-2 h-4 w-4" />Generate Graph</>}
        </Button>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex flex-col justify-stretch rounded-lg border-2 border-dashed border-border/60 relative overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
              <Alert variant="destructive" className="max-w-md border-none">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Generate Graph</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          {!isLoading && !error && !graphData && (
            <div className="text-center m-auto">
              <GitCommitVertical className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Awaiting Graph Generation</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select your options and click "Generate Graph".</p>
            </div>
          )}
          {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="mt-4 text-muted-foreground">Fetching commit history...</p>
              </div>
          )}
          
          <div ref={visJsRef} className={cn("w-full h-full", !graphData && "hidden")} />
          
          {graphData && (
              <Dialog open={isGraphModalOpen} onOpenChange={setIsGraphModalOpen}>
                  <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10">
                          <Expand className="h-5 w-5" />
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-none w-[95vw] h-[90vh] p-8 flex flex-col">
                      <DialogHeader>
                          <DialogTitle>Commit Graph (Fullscreen)</DialogTitle>
                      </DialogHeader>
                      <div ref={visJsModalRef} className="w-full h-full flex-1 rounded-md border" />
                  </DialogContent>
              </Dialog>
          )}

        </div>
      </main>
    </div>
  );
}

    

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Network } from 'vis-network';
import type { Options, Node, Edge } from 'vis-network';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, GitBranch, Search, AlertCircle, GitCommitVertical, GitCompareArrows, GitCommitHorizontal, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

type Commit = {
  sha: string;
  message: string;
  author: string | null;
};

type CommitNode = Commit & {
  parents: string[];
};

type CommitGraphProps = {
  repoUrl: string;
  branches: string[];
};

export default function CommitGraph({ repoUrl, branches }: CommitGraphProps) {
  const { toast } = useToast();
  const visJsRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);

  const [graphMode, setGraphMode] = useState<'branch' | 'range'>('branch');
  
  // Branch mode state
  const [branch, setBranch] = useState('');
  
  // Range mode state
  const [rangeBranch, setRangeBranch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [fetchedCommits, setFetchedCommits] = useState<Commit[]>([]);
  const [startCommit, setStartCommit] = useState<string>('');
  const [endCommit, setEndCommit] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGraph, setHasGraph] = useState(false);

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0];
      setBranch(defaultBranch);
      setRangeBranch(defaultBranch);
    }
  }, [branches]);
  
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date && endDate && date > endDate) {
      setEndDate(undefined);
    }
  };

  const handleFetchRangeCommits = async () => {
    if (!rangeBranch || !startDate || !endDate) {
      toast({ variant: 'destructive', title: 'Information manquante', description: 'Veuillez sélectionner une branche et une plage de dates.' });
      return;
    }
    setIsFetchingCommits(true);
    setFetchedCommits([]);
    setStartCommit('');
    setEndCommit('');

    try {
      const response = await fetch('/api/fetch-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch: rangeBranch, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
      });
      const result = await response.json();
      if (result.error || !response.ok) throw new Error(result.error || 'Failed to fetch commits.');
      
      setFetchedCommits(result.commits);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: e.message });
    } finally {
      setIsFetchingCommits(false);
    }
  };


  const handleFetchAndDrawGraph = async () => {
    let finalBranch = '';
    let finalStartSha: string | undefined = undefined;
    let finalEndSha: string | undefined = undefined;

    if (graphMode === 'branch') {
        if (!branch) {
            toast({ variant: 'destructive', title: 'Please select a branch.' });
            return;
        }
        finalBranch = branch;
    } else { // range mode
        if (!startCommit || !endCommit) {
            toast({ variant: 'destructive', title: 'Please select a start and end commit.' });
            return;
        }
        finalBranch = rangeBranch;
        finalStartSha = startCommit;
        finalEndSha = endCommit;
    }
    
    setIsLoading(true);
    setError(null);
    setHasGraph(false);

    try {
      const response = await fetch('/api/fetch-commit-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl, 
          branch: finalBranch,
          startSha: finalStartSha,
          endSha: finalEndSha,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch commit history.');
      }
      
      drawGraph(result.commits);
      setHasGraph(true);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const drawGraph = useCallback((commits: CommitNode[]) => {
    if (!visJsRef.current) return;

    if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
      networkInstanceRef.current = null;
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
        // Only draw edges between nodes that are in the current view
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
    
    const network = new Network(visJsRef.current, data, options);
    networkInstanceRef.current = network;

    const fitGraph = () => {
        if (network && visJsRef.current && visJsRef.current.offsetParent) {
            network.fit();
        }
    };
    
    // Using a timeout allows the container to render and have dimensions before fitting.
    setTimeout(fitGraph, 100);
    
    // Also add a resize observer for dynamic resizing.
    const container = visJsRef.current;
    const observer = new ResizeObserver(fitGraph);
    if(container) observer.observe(container);

    return () => {
      if(container) observer.unobserve(container);
      if (network) {
        network.destroy();
      }
    };

  }, []);
  
  const isFetchDisabled = isLoading || (graphMode === 'branch' && !branch) || (graphMode === 'range' && (!startCommit || !endCommit));

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Commit Graph</CardTitle>
            <CardDescription>Visualize the commit history of your repository.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <RadioGroup value={graphMode} onValueChange={(v) => setGraphMode(v as 'branch' | 'range')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="branch" id="mode-branch"/>
                <Label htmlFor="mode-branch" className="font-normal flex items-center gap-2"><GitBranch className="h-4 w-4"/> Entire Branch</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="range" id="mode-range"/>
                <Label htmlFor="mode-range" className="font-normal flex items-center gap-2"><GitCommitHorizontal className="h-4 w-4"/> Commit Range</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {graphMode === 'branch' && (
           <Card className="shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state="open">
                <CardHeader>
                    <CardTitle>Branch to Visualize</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
        )}

        {graphMode === 'range' && (
           <Card className="shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state="open">
                <CardHeader>
                    <CardTitle>Select Commit Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Branche</Label>
                        <Select onValueChange={setRangeBranch} value={rangeBranch} disabled={branches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une branche" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label>Date de début</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                               <Calendar 
                                mode="single" 
                                selected={startDate} 
                                onSelect={handleStartDateChange} 
                                disabled={{ after: new Date() }}
                                initialFocus 
                              />
                            </PopoverContent>
                        </Popover>
                        </div>
                        <div className="space-y-2">
                        <Label>Date de fin</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={!startDate}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : <span>Date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                               <Calendar 
                                mode="single" 
                                selected={endDate} 
                                onSelect={setEndDate} 
                                disabled={{ after: new Date(), before: startDate }}
                                initialFocus 
                              />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                    <Button onClick={handleFetchRangeCommits} className="w-full" disabled={isFetchingCommits}>
                        {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Récupération...</> : <><Search className="mr-2 h-4 w-4" />Récupérer Commits</>}
                    </Button>
                    {fetchedCommits.length > 0 && (
                        <div className="space-y-4">
                             <div className="space-y-2">
                                <Label>Start Commit</Label>
                                <Select onValueChange={setStartCommit} value={startCommit}>
                                    <SelectTrigger><SelectValue placeholder="Select start commit"/></SelectTrigger>
                                    <SelectContent>
                                        {fetchedCommits.map(c => <SelectItem key={`start-${c.sha}`} value={c.sha}><span className="font-mono text-xs">{c.sha.substring(0,7)}</span> - {c.message.split('\n')[0]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>End Commit</Label>
                                <Select onValueChange={setEndCommit} value={endCommit}>
                                    <SelectTrigger><SelectValue placeholder="Select end commit"/></SelectTrigger>
                                    <SelectContent>
                                        {fetchedCommits.map(c => <SelectItem key={`end-${c.sha}`} value={c.sha}><span className="font-mono text-xs">{c.sha.substring(0,7)}</span> - {c.message.split('\n')[0]}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}

        <Button onClick={handleFetchAndDrawGraph} className="w-full" disabled={isFetchDisabled}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Search className="mr-2 h-4 w-4" />Generate Graph</>}
        </Button>
      </aside>

      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 relative overflow-hidden">
          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
              <Alert variant="destructive" className="max-w-md border-none">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Generate Graph</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          {!isLoading && !error && !hasGraph && (
            <div className="text-center">
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
          <div ref={visJsRef} className="w-full h-full" />
        </div>
      </main>
    </div>
  );
}

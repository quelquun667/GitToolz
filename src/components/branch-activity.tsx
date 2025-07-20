'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, GitMerge, GitBranch, ArrowUp, ArrowDown, ShieldCheck, ShieldAlert, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type Branch = {
  name: string;
  lastCommit: {
    date: string | null | undefined;
    author: string | null | undefined;
  };
  aheadBy: number;
  behindBy: number;
  isProtected: boolean;
};

type BranchActivityProps = {
  repoUrl: string;
  branches: string[];
};

export default function BranchActivity({ repoUrl, branches }: BranchActivityProps) {
  const { toast } = useToast();

  const [mainBranch, setMainBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchData, setBranchData] = useState<Branch[] | null>(null);

  useEffect(() => {
    const defaultBranch = branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0] || '';
    setMainBranch(defaultBranch);
  }, [branches]);

  const handleFetchData = async () => {
    if (!mainBranch) {
      toast({ variant: 'destructive', title: 'Please select a main branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setBranchData(null);

    try {
      const response = await fetch('/api/get-branch-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch: mainBranch }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch branch data.');
      }
      
      setBranchData(result.branches);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isFetchDisabled = isLoading || !mainBranch;

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-[calc(100vh-200px)] bg-card text-foreground">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div>
                  <CardTitle className="flex items-center gap-2"><GitMerge /> Branch Activity</CardTitle>
                  <CardDescription>View the status and activity of all repository branches relative to the main branch.</CardDescription>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                  <div className="w-full md:w-48">
                      <Select onValueChange={setMainBranch} value={mainBranch} disabled={branches.length === 0}>
                          <SelectTrigger><SelectValue placeholder="Select main branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <Button onClick={handleFetchData} disabled={isFetchDisabled} className="w-full md:w-auto">
                      {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze</>}
                  </Button>
              </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
              {isLoading && (
                <div className="text-center">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                  <p className="mt-4 text-muted-foreground">Fetching branch details...</p>
                </div>
              )}
              {error && (
                <Alert variant="destructive" className="max-w-md">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Analysis Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!isLoading && !error && !branchData && (
                  <div className="text-center">
                      <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-medium">Ready to Analyze</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Select a main branch and click "Analyze".</p>
                  </div>
              )}
              {!isLoading && !error && branchData && (
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Branch</TableHead>
                              <TableHead>Last Commit</TableHead>
                              <TableHead className="text-center">Status vs <span className="font-mono bg-muted p-1 rounded text-xs">{mainBranch}</span></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {branchData.map((b) => (
                              <TableRow key={b.name}>
                                  <TableCell>
                                      <div className="flex items-center gap-2">
                                        {b.isProtected ? (
                                            <Tooltip>
                                                <TooltipTrigger><ShieldCheck className="h-4 w-4 text-green-500" /></TooltipTrigger>
                                                <TooltipContent><p>Protected Branch</p></TooltipContent>
                                            </Tooltip>
                                        ) : (
                                             <Tooltip>
                                                <TooltipTrigger><ShieldAlert className="h-4 w-4 text-yellow-500" /></TooltipTrigger>
                                                <TooltipContent><p>Unprotected Branch</p></TooltipContent>
                                            </Tooltip>
                                        )}
                                        <span className="font-medium">{b.name}</span>
                                        {b.name === mainBranch && <Badge variant="secondary">base</Badge>}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex flex-col">
                                        <span>by {b.lastCommit.author || 'Unknown'}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {b.lastCommit.date ? formatDistanceToNow(new Date(b.lastCommit.date), { addSuffix: true }) : 'N/A'}
                                        </span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-4">
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <div className="flex items-center gap-1 text-green-500">
                                            <ArrowUp className="h-4 w-4" />
                                            <span>{b.aheadBy}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{b.aheadBy} commits ahead</p></TooltipContent>
                                      </Tooltip>
                                       <Tooltip>
                                        <TooltipTrigger>
                                          <div className="flex items-center gap-1 text-red-500">
                                            <ArrowDown className="h-4 w-4" />
                                            <span>{b.behindBy}</span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{b.behindBy} commits behind</p></TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              )}
          </div>
        </CardContent>
      </div>
    </TooltipProvider>
  );
}

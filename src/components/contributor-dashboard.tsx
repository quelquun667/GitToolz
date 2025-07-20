'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, Users, GitCommitVertical, Star, GitBranch } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

type Contributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
};

type ContributorDashboardProps = {
  repoUrl: string;
  branches: string[];
};

export default function ContributorDashboard({ repoUrl, branches }: ContributorDashboardProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState(branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributors, setContributors] = useState<Contributor[] | null>(null);

  const handleFetchContributors = async () => {
    if (!branch) {
      toast({ variant: 'destructive', title: 'Please select a branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setContributors(null);

    try {
      const response = await fetch('/api/get-contributor-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch contributors.');
      }
      
      setContributors(result.contributors);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleFetchContributors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFetchDisabled = isLoading || !branch;

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)] bg-card text-foreground">
      <CardHeader>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Users /> Contributor Dashboard</CardTitle>
                <CardDescription>See who is contributing to the repository.</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={handleFetchContributors} disabled={isFetchDisabled} className="w-full md:w-auto">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : <><Search className="mr-2 h-4 w-4" />Refresh</>}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {isLoading && (
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                <p className="mt-4 text-muted-foreground">Fetching contributor data...</p>
              </div>
            )}
            {error && (
               <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && !contributors && (
                 <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Click "Refresh" to fetch contributor data.</p>
                </div>
            )}
             {!isLoading && !error && contributors && (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Rank</TableHead>
                            <TableHead>Contributor</TableHead>
                            <TableHead className="text-right">Commits</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contributors.map((c, index) => (
                            <TableRow key={c.login}>
                                <TableCell className="font-bold text-lg text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                    <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                                        <Image src={c.avatar_url} alt={c.login} width={40} height={40} className="rounded-full" />
                                        <span className="font-medium group-hover:text-primary">{c.login}</span>
                                    </a>
                                </TableCell>
                                <TableCell className="text-right font-mono text-lg">{c.contributions}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
             )}
        </div>
      </CardContent>
    </div>
  );
}

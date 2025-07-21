
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, Fingerprint, GitBranch, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type Commit = {
  sha: string;
  message: string;
  author: string | null;
  date: string;
};

type SuspiciousCommit = {
    sha: string;
    message: string;
    author: string | null;
    reasoning: string;
};

type RegressionDetectiveProps = {
  repoUrl: string;
  branches: string[];
};

export default function RegressionDetective({ repoUrl, branches }: RegressionDetectiveProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [fetchedCommits, setFetchedCommits] = useState<Commit[] | null>(null);
  
  const [bugDescription, setBugDescription] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SuspiciousCommit[] | null>(null);

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.find(b => b === 'main' || b === 'master') || branches[0];
      setBranch(defaultBranch);
    }
  }, [branches]);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date && endDate && date > endDate) {
      setEndDate(undefined);
    }
  };

  const handleFetchCommits = async () => {
    if (!branch || !startDate || !endDate) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a branch and a date range.' });
      return;
    }
    setIsFetchingCommits(true);
    setFetchedCommits(null);
    setAnalysis(null);
    setError(null);

    try {
      const response = await fetch('/api/fetch-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
      });
      const result = await response.json();
      if (result.error || !response.ok) throw new Error(result.error || 'Failed to fetch commits.');
      
      setFetchedCommits(result.commits);
      toast({ title: "Commits Fetched", description: `Found ${result.commits.length} commits in the selected range.` });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error Fetching Commits', description: e.message });
    } finally {
      setIsFetchingCommits(false);
    }
  };

  const handleAnalyze = async () => {
    if (!bugDescription) {
      toast({ variant: 'destructive', title: 'Bug description is required.' });
      return;
    }
    if (!fetchedCommits || fetchedCommits.length === 0) {
      toast({ variant: 'destructive', title: 'Please fetch commits before analyzing.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/find-regression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugDescription, commits: fetchedCommits }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          const data = JSON.parse(line.substring(6));
          if (data.error) throw new Error(data.error);
          if (data.suspiciousCommits) setAnalysis(data.suspiciousCommits);
        }
      }
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isFetchDisabled = !branch || !startDate || !endDate || isFetchingCommits;
  const isAnalyzeDisabled = isLoading || !fetchedCommits || fetchedCommits.length === 0 || !bugDescription;

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground">AI is analyzing commits...</p>
        </div>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (analysis) {
        if (analysis.length === 0) {
            return (
                <div className="text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                    <h3 className="mt-4 text-lg font-medium">No Obvious Suspects Found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">The AI could not confidently link the bug to any commits in this range.</p>
                </div>
            )
        }
      return (
        <div className="w-full space-y-4">
            <h3 className="text-lg font-semibold">Suspicious Commits</h3>
            <Accordion type="single" collapsible defaultValue="item-0">
            {analysis.map((commit, index) => (
                <AccordionItem value={`item-${index}`} key={commit.sha}>
                    <AccordionTrigger>
                        <div className="text-left">
                            <p className="font-mono text-sm text-primary">{commit.sha.substring(0, 7)}</p>
                            <p>{commit.message.split('\n')[0]}</p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p className="text-sm text-muted-foreground">{commit.reasoning}</p>
                        <p className="text-xs text-muted-foreground mt-2">Author: {commit.author || 'Unknown'}</p>
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        </div>
      );
    }
    return (
      <div className="text-center">
        <Fingerprint className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Regression Detective</h3>
        <p className="mt-1 text-sm text-muted-foreground">Describe a bug and find the commit that might have caused it.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Select Commits</CardTitle>
            <CardDescription>Choose a branch and a date range to analyze.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch</Label>
                <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={!startDate}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={{ before: startDate }} initialFocus /></PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button onClick={handleFetchCommits} className="w-full" disabled={isFetchDisabled}>
                {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</> : <><Search className="mr-2 h-4 w-4" />Fetch Commits</>}
              </Button>
          </CardContent>
        </Card>
        {fetchedCommits && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>2. Describe the Bug</CardTitle>
                    <CardDescription>Explain the problem in detail. What's not working?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea 
                        placeholder="e.g., 'Users cannot log in with their Google account anymore. After clicking the button, they get a 500 error.'"
                        value={bugDescription}
                        onChange={(e) => setBugDescription(e.target.value)}
                        rows={5}
                    />
                     <Button onClick={handleAnalyze} className="w-full" disabled={isAnalyzeDisabled}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Fingerprint className="mr-2 h-4 w-4" />Find Regression</>}
                    </Button>
                </CardContent>
            </Card>
        )}
      </aside>
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {renderMainContent()}
        </div>
      </main>
    </div>
  );
}

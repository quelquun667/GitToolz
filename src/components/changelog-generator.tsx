'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Globe, Loader2, History, Copy, Terminal, RefreshCw, Sparkles, Calendar as CalendarIcon, Search, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';

type Commit = {
  sha: string;
  message: string;
  author: string | null;
};

export default function ChangelogGenerator() {
  const { toast } = useToast();

  // Step 1: Form state
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);

  // Step 2: Commit selection state
  const [allCommits, setAllCommits] = useState<Commit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Record<string, boolean>>({});

  // Step 3: Generation state
  const [changelog, setChangelog] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  const [displayStartDate, setDisplayStartDate] = useState<Date | undefined>();
  const [displayEndDate, setDisplayEndDate] = useState<Date | undefined>();

  const handleFetchCommits = async () => {
    if (!repoUrl || !branch || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide all repository details and select a date range.',
      });
      return;
    }
    setIsFetchingCommits(true);
    setAllCommits([]);
    setSelectedCommits({});
    setChangelog(null);

    try {
      const response = await fetch('/api/fetch-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
      });
      
      const result = await response.json();

      if (result.error || !response.ok) {
        throw new Error(result.error || 'Failed to fetch commits.');
      }

      setAllCommits(result.commits);
      // Pre-select all commits by default
      const initialSelection = result.commits.reduce((acc: Record<string, boolean>, commit: Commit) => {
        acc[commit.sha] = true;
        return acc;
      }, {});
      setSelectedCommits(initialSelection);
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Failed to Fetch Commits',
        description: error,
      });
    } finally {
      setIsFetchingCommits(false);
    }
  };

  const handleGenerateChangelog = async () => {
    const messages = allCommits
      .filter(commit => selectedCommits[commit.sha])
      .map(commit => commit.message);

    if (messages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Commits Selected',
        description: 'Please select at least one commit to generate the changelog.',
      });
      return;
    }
    
    setIsGenerating(true);
    setChangelog(null);
    setGenerationLog([]);
    setDisplayStartDate(startDate);
    setDisplayEndDate(endDate);

    try {
      const response = await fetch('/api/changelog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commitMessages: messages }),
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        while(true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.changelog) {
                    setChangelog(parsed.changelog);
                }
                if (parsed.error) {
                    toast({
                        variant: 'destructive',
                        title: 'Generation Failed',
                        description: parsed.error,
                    });
                    setIsGenerating(false);
                    return;
                }
              } catch (e) {
                console.error("Failed to parse stream data chunk:", data, e);
              }
            }
          }
          buffer = lines[lines.length - 1];
        }
      };
      
      await processStream();

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (changelog === null) return;
    navigator.clipboard.writeText(changelog).then(() => {
      toast({ title: 'Copied!', description: 'The changelog has been copied to your clipboard.' });
    });
  };

  const handleDownload = () => {
    if (changelog === null) return;
    const start = startDate ? format(startDate, 'yyyy-MM-dd') : 'start';
    const end = endDate ? format(endDate, 'yyyy-MM-dd') : 'end';
    const blob = new Blob([changelog], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CHANGELOG-${start}-to-${end}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const totalSelected = Object.values(selectedCommits).filter(Boolean).length;
  
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Repository Details</CardTitle>
            <CardDescription>Enter a public GitHub repo and date range to find commits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repoUrl" className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />Repository URL</Label>
              <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch" className="flex items-center gap-2"><History className="h-4 w-4 text-primary" />Branch to Analyze</Label>
              <Input id="branch" name="branch" placeholder="main" required value={branch} onChange={e => setBranch(e.target.value)}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>
            <Button onClick={handleFetchCommits} className="w-full" disabled={isFetchingCommits}>
              {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</> : <><Search className="mr-2 h-4 w-4" />Fetch Commits</>}
            </Button>
          </CardContent>
        </Card>

        {allCommits.length > 0 && (
          <Card className="shadow-lg flex-1 flex flex-col">
            <CardHeader>
              <CardTitle>2. Select Commits</CardTitle>
              <CardDescription>Choose which commits to include in the changelog. {totalSelected} of {allCommits.length} selected.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={totalSelected === allCommits.length}
                  onCheckedChange={(checked) => {
                    const newSelection: Record<string, boolean> = {};
                    allCommits.forEach(c => newSelection[c.sha] = !!checked);
                    setSelectedCommits(newSelection);
                  }}
                />
                <Label htmlFor="select-all">Select All</Label>
              </div>
              <Separator />
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {allCommits.map(commit => (
                    <div key={commit.sha} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50">
                      <Checkbox
                        id={commit.sha}
                        checked={selectedCommits[commit.sha] || false}
                        onCheckedChange={(checked) => {
                          setSelectedCommits(prev => ({...prev, [commit.sha]: !!checked}))
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={commit.sha} className="font-normal text-sm block cursor-pointer">{commit.message.split('\n')[0]}</Label>
                        <p className="text-xs text-muted-foreground">by {commit.author} - {commit.sha.substring(0, 7)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button onClick={handleGenerateChangelog} className="w-full" disabled={isGenerating || totalSelected === 0}>
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Changelog</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        {isGenerating ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center p-4 max-w-md mx-auto">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Generating Changelog...</h3>
              <Card className="mt-4 text-left bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                    <ScrollArea className="h-32 w-full">
                      <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                        {generationLog.map((log, index) => <p key={index}>{log}</p>)}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : changelog !== null && displayStartDate && displayEndDate ? (
           <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Changelog</CardTitle>
                  <CardDescription>From <span className="font-mono bg-muted px-1 py-0.5 rounded">{format(displayStartDate, "PPP")}</span> to <span className="font-mono bg-muted px-1 py-0.5 rounded">{format(displayEndDate, "PPP")}</span></CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Copy className="mr-2 h-4 w-4" />Copy</Button>
                    <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Download className="mr-2 h-4 w-4" />Download</Button>
                  </div>
              </CardHeader>
              <div className="flex-1 overflow-auto p-6 border-t">
                  <div className="prose prose-invert max-w-none break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{changelog}</ReactMarkdown>
                  </div>
              </div>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Awaiting Action</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {allCommits.length > 0 
                  ? "Select commits and click 'Generate Changelog'."
                  : "Fetch commits to begin."
                }
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

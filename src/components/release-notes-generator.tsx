
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Globe, Loader2, History, Copy, Terminal, RefreshCw, Sparkles, Calendar as CalendarIcon, Search, ListChecks, GitBranch, CheckCircle2, Check, Annoyed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from './ui/input';


type Commit = {
  sha: string;
  message: string;
  author: string | null;
  date: string;
};

type ReleaseNotesGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

export default function ReleaseNotesGenerator({ repoUrl, branches }: ReleaseNotesGeneratorProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Step 1: Form state
  const [branch, setBranch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [versionNumber, setVersionNumber] = useState('');

  // Step 2: Commit selection state
  const [allCommits, setAllCommits] = useState<Commit[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<Record<string, boolean>>({});

  // Step 3: Generation state
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // Set default branch when branches are loaded
    if (branches.length > 0) {
      if (branches.includes('main')) {
        setBranch('main');
      } else if (branches.includes('master')) {
        setBranch('master');
      } else {
        setBranch(branches[0]);
      }
    }
  }, [branches]);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date && endDate && date > endDate) {
      setEndDate(undefined);
    }
  };

  const handleFetchCommits = async () => {
    if (!repoUrl || !branch || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a branch and a date range.',
      });
      return;
    }
    setIsFetchingCommits(true);
    setAllCommits([]);
    setSelectedCommits({});
    setReleaseNotes(null);

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

  const handleGenerate = async () => {
    const messages = allCommits
      .filter(commit => selectedCommits[commit.sha])
      .map(commit => commit.message);

    if (messages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Commits Selected',
        description: 'Please select at least one commit to generate the release notes.',
      });
      return;
    }
    
    setIsGenerating(true);
    setReleaseNotes(null);
    setGenerationLog([]);

    try {
      const response = await fetch('/api/release-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            commitMessages: messages,
            versionNumber,
            releaseDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          }),
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
                if (parsed.error) {
                    toast({
                        variant: 'destructive',
                        title: 'Generation Failed',
                        description: parsed.error,
                    });
                    setIsGenerating(false);
                    return;
                }
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.releaseNotes) {
                    setReleaseNotes(parsed.releaseNotes);
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
      setIsGenerating(false);
      setIsFinalizing(true);
      setTimeout(() => {
        setIsFinalizing(false);
      }, 1500);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (releaseNotes === null || isCopied) return;
    navigator.clipboard.writeText(releaseNotes).then(() => {
      setIsCopied(true);
      toast({ title: 'Copied!', description: 'The release notes have been copied to your clipboard.' });
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (releaseNotes === null) return;
    const blob = new Blob([releaseNotes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RELEASE_NOTES_${versionNumber || 'latest'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const totalSelected = Object.values(selectedCommits).filter(Boolean).length;
  const isFetchDisabled = !repoUrl || !branch || isFetchingCommits;
  
  const CommitDetailsModal = ({ commit, children }: { commit: Commit, children: React.ReactNode }) => (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commit Details</DialogTitle>
          <DialogDescription>
            <span className="font-mono bg-muted px-1 py-0.5 rounded text-sm">{commit.sha.substring(0, 7)}</span> by {commit.author}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-md">
          {commit.message}
        </div>
      </DialogContent>
    </Dialog>
  );

  const CommitTooltip = ({ commit, children }: { commit: Commit, children: React.ReactNode }) => (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-md" side="right">
        <p className="text-sm whitespace-pre-wrap">{commit.message}</p>
      </TooltipContent>
    </Tooltip>
  );

  const renderMainContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4 max-w-md mx-auto">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Generating Release Notes...</h3>
            <Card className="mt-4 text-left bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                  <ScrollArea className="h-32 w-full">
                    <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                      {generationLog.map((log, index) => <p key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-500">{log}</p>)}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (isFinalizing) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Done!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your release notes are ready.</p>
          </div>
        </div>
      );
    }
    
    if (releaseNotes !== null) {
      return (
         <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
           <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Release Notes</CardTitle>
              </div>
               <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>
            </CardHeader>
            <div className="flex-1 overflow-auto p-6 border-t">
                <div className="prose prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{releaseNotes}</ReactMarkdown>
                </div>
            </div>
        </Card>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
        <div className="text-center">
          <ListChecks className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Awaiting Action</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {allCommits.length > 0 
              ? "Select commits and click 'Generate Release Notes'."
              : "Fetch commits to begin."
            }
          </p>
        </div>
      </div>
    );
  };


  return (
    <TooltipProvider>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
        <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>1. Repository Details</CardTitle>
              <CardDescription>Select a branch and date range to find commits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch to Analyze</Label>
                <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={"Select a branch"} />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                </Select>
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
                  <Label htmlFor="endDate">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={!startDate}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
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
              <Button onClick={handleFetchCommits} className="w-full" disabled={isFetchDisabled}>
                {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</> : <><Search className="mr-2 h-4 w-4" />Fetch Commits</>}
              </Button>
            </CardContent>
          </Card>

          {allCommits.length > 0 && (
            <Card className="shadow-lg flex-1 flex flex-col data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state="open">
              <CardHeader>
                <CardTitle>2. Select Commits</CardTitle>
                <CardDescription>Choose commits to include. {totalSelected} of {allCommits.length} selected.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden flex flex-col gap-4">
                <div className="space-y-2">
                    <Label htmlFor="version">Release Version (Optional)</Label>
                    <Input id="version" value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="e.g., v1.2.0" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={totalSelected === allCommits.length && allCommits.length > 0}
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
                    {allCommits.map(commit => {
                      const commitContent = (
                        <div>
                          <Label htmlFor={commit.sha} className="font-normal text-sm block cursor-pointer">{commit.message.split('\n')[0]}</Label>
                          <p className="text-xs text-muted-foreground">by {commit.author} - {commit.sha.substring(0, 7)}</p>
                        </div>
                      );

                      const commitRow = (
                         <div className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 w-full">
                            <Checkbox
                                id={commit.sha}
                                checked={selectedCommits[commit.sha] || false}
                                onCheckedChange={(checked) => {
                                setSelectedCommits(prev => ({ ...prev, [commit.sha]: !!checked }))
                                }}
                                className="mt-1"
                            />
                             {isMobile ? (
                                <CommitDetailsModal commit={commit}>
                                    <div className="flex-1 cursor-pointer">{commitContent}</div>
                                </CommitDetailsModal>
                            ) : (
                                <div className="flex-1">{commitContent}</div>
                            )}
                        </div>
                      );

                      return (
                        <div key={commit.sha}>
                           {isMobile ? commitRow : (
                                <CommitTooltip commit={commit}>
                                    {commitRow}
                                </CommitTooltip>
                           )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
                <Button onClick={handleGenerate} className="w-full" disabled={isGenerating || totalSelected === 0}>
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Release Notes</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </aside>
        
        <main className="flex-1 flex flex-col p-4 md:pl-0">
          {renderMainContent()}
        </main>
      </div>
    </TooltipProvider>
  );
}

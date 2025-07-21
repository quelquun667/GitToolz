
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Calendar as CalendarIcon, GitBranch, Loader2, Search } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

type Commit = {
  sha: string;
  message: string;
  author: string | null;
};

type CommitSelectorProps = {
  repoUrl: string;
  branches: string[];
  onCommitSelect: (sha: string) => void;
  instanceId?: string; // To differentiate between multiple instances
};

export default function CommitSelector({ repoUrl, branches, onCommitSelect, instanceId = 'default' }: CommitSelectorProps) {
  const { toast } = useToast();
  
  const [branch, setBranch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [allCommits, setAllCommits] = useState<Commit[]>([]);
  const [selectedSha, setSelectedSha] = useState<string>('');

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0];
      setBranch(defaultBranch);
    }
  }, [branches]);

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
    setSelectedSha('');
    onCommitSelect('');

    try {
      const response = await fetch('/api/fetch-commits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
      });
      
      const result = await response.json();
      if (result.error || !response.ok) throw new Error(result.error || 'Failed to fetch commits.');
      
      setAllCommits(result.commits);
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

  const handleSelectCommit = (sha: string) => {
    setSelectedSha(sha);
    onCommitSelect(sha);
  };
  
  const isFetchDisabled = !repoUrl || !branch || isFetchingCommits;

  return (
    <div className="space-y-4 p-2 border rounded-md bg-muted/20">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs"><GitBranch className="h-3 w-3 text-primary" />Branch</Label>
        <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Select a branch" /></SelectTrigger>
          <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className={cn("w-full h-8 justify-start text-left font-normal bg-background", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM d") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={startDate} 
                onSelect={setStartDate} 
                disabled={{ after: new Date() }}
                initialFocus />
              </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className={cn("w-full h-8 justify-start text-left font-normal bg-background", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM d") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={endDate} 
                onSelect={setEndDate} 
                disabled={{ after: new Date(), before: startDate }}
                initialFocus />
              </PopoverContent>
          </Popover>
        </div>
      </div>
      <Button onClick={handleFetchCommits} size="sm" className="w-full h-8" disabled={isFetchDisabled}>
        {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching...</> : <><Search className="mr-2 h-4 w-4" />Fetch Commits</>}
      </Button>

      {allCommits.length > 0 && (
        <div className="space-y-2 pt-2">
          <Label className="text-xs text-muted-foreground">Select a Commit</Label>
          <ScrollArea className="h-40 rounded-md border bg-background">
            <RadioGroup value={selectedSha} onValueChange={handleSelectCommit} className="p-2">
              {allCommits.map(commit => (
                <div key={`${instanceId}-${commit.sha}`} className="flex items-center space-x-2 p-1 rounded hover:bg-muted">
                  <RadioGroupItem value={commit.sha} id={`${instanceId}-${commit.sha}`} />
                  <Label htmlFor={`${instanceId}-${commit.sha}`} className="font-normal text-sm cursor-pointer leading-tight w-full">
                    <p className="font-mono text-xs text-muted-foreground">{commit.sha.substring(0, 7)}</p>
                    <p className="truncate">{commit.message.split('\n')[0]}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}


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
};

export default function CommitSelector({ repoUrl, branches, onCommitSelect }: CommitSelectorProps) {
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
        title: 'Information manquante',
        description: 'Veuillez sélectionner une branche et une plage de dates.',
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
      const error = e instanceof Error ? e.message : 'Une erreur inconnue est survenue.';
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la récupération des commits',
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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branche</Label>
        <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une branche" /></SelectTrigger>
          <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de début</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Date de fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Choisir une date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
          </Popover>
        </div>
      </div>
      <Button onClick={handleFetchCommits} className="w-full" disabled={isFetchDisabled}>
        {isFetchingCommits ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Récupération...</> : <><Search className="mr-2 h-4 w-4" />Récupérer les Commits</>}
      </Button>

      {allCommits.length > 0 && (
        <div className="space-y-2 pt-4">
          <Label>Commit à analyser</Label>
          <ScrollArea className="h-60 rounded-md border">
            <RadioGroup value={selectedSha} onValueChange={handleSelectCommit} className="p-4">
              {allCommits.map(commit => (
                <div key={commit.sha} className="flex items-center space-x-2">
                  <RadioGroupItem value={commit.sha} id={commit.sha} />
                  <Label htmlFor={commit.sha} className="font-normal text-sm cursor-pointer">
                    <p className="font-mono text-xs text-muted-foreground">{commit.sha.substring(0, 7)}</p>
                    <p>{commit.message.split('\n')[0]}</p>
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

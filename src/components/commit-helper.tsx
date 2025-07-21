
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, GitBranch, CheckCircle2, Clipboard, GitCompareArrows, GitCommitHorizontal, AlertCircle, Copy, Check, RefreshCw, BookOpenCheck, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';
import CommitSelector from './commit-selector';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type CommitHelperProps = {
  repoUrl: string;
  branches: string[];
};

type Suggestion = {
  type: string;
  message: string;
};

export default function CommitHelper({ repoUrl, branches }: CommitHelperProps) {
  const { toast } = useToast();

  const [compareMode, setCompareMode] = useState<'branches' | 'commit'>('branches');
  
  // Branch comparison state
  const [baseBranch, setBaseBranch] = useState('');
  const [compareBranch, setCompareBranch] = useState('');

  // Single commit state
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  
  // Generation state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [diff, setDiff] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0];
      setBaseBranch(defaultBranch);
      setCompareBranch(branches.find(b => b !== defaultBranch) || '');
    }
  }, [branches]);
  
  const handleGenerate = async () => {
    if (compareMode === 'branches' && (!baseBranch || !compareBranch)) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select both branches to compare.' });
        return;
    }
    if (compareMode === 'commit' && !selectedCommit) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a commit.' });
        return;
    }

    setIsGenerating(true);
    setSuggestions([]);
    setSummary('');
    setDiff('');
    setGenerationError(null);
    setCopiedIndex(null);

    try {
        const response = await fetch('/api/commit-helper', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repoUrl,
              compareMode,
              base: compareMode === 'branches' ? baseBranch : selectedCommit,
              compare: compareMode === 'branches' ? compareBranch : undefined,
            }),
        });

        const result = await response.json();
        
        if (!response.ok || result.error) {
            throw new Error(result.error || "An error occurred during generation.");
        }
        
        setSuggestions(result.suggestions || []);
        setSummary(result.summary || '');
        setDiff(result.diff || '');
        
        setIsGenerating(false);
        setIsFinalizing(true);
        setTimeout(() => setIsFinalizing(false), 1500);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      setGenerationError(error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: error });
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedIndex(id);
        toast({ title: 'Copied!', description: 'The command has been copied to your clipboard.' });
        setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const isGenerateDisabled = isGenerating || (compareMode === 'branches' && (!baseBranch || !compareBranch)) || (compareMode === 'commit' && !selectedCommit);

  const renderMainContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4 max-w-md mx-auto">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Analyzing changes...</h3>
            <p className="mt-1 text-sm text-muted-foreground">The AI is comparing the references and preparing suggestions.</p>
          </div>
        </div>
      );
    }
     if (isFinalizing) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Suggestions Ready!</h3>
          </div>
        </div>
      );
    }

    if (generationError) {
        return (
             <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5">
                <Alert variant="destructive" className="max-w-lg border-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Generation Error</AlertTitle>
                  <AlertDescription>{generationError}</AlertDescription>
                </Alert>
            </div>
        )
    }

    if (suggestions.length > 0) {
      return (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            <Card className="flex flex-col shadow-lg overflow-hidden">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Commit Suggestions</CardTitle>
                            <CardDescription>{summary}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleGenerate} disabled={isGenerating}>
                            <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                            <span className="sr-only">Regenerate</span>
                        </Button>
                    </div>
                </CardHeader>
                <ScrollArea className="flex-1 border-t">
                    <div className="p-6 space-y-4">
                        {suggestions.map((suggestion, index) => {
                            const commitMessage = `${suggestion.type}: ${suggestion.message}`;
                            const normalCommand = `git commit -m "${commitMessage}"`;
                            const amendCommand = `git commit --amend -m "${commitMessage}"`;

                            return (
                                <div key={index} className="p-3 rounded-lg bg-muted/50 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-full mt-0.5">{suggestion.type}</span>
                                        <p className="flex-1 text-sm">{suggestion.message}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Input readOnly value={normalCommand} className="h-9 bg-background/50 text-xs font-mono" />
                                            <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-primary/10 hover:text-primary" onClick={() => handleCopy(normalCommand, `normal-${index}`)}>
                                                {copiedIndex === `normal-${index}` ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                                Copy
                                            </Button>
                                        </div>
                                        {compareMode === 'commit' && (
                                            <div className="flex gap-2">
                                                <Input readOnly value={amendCommand} className="h-9 bg-background/50 text-xs font-mono" />
                                                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-primary/10 hover:text-primary" onClick={() => handleCopy(amendCommand, `amend-${index}`)}>
                                                    {copiedIndex === `amend-${index}` ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                                    Copy
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </Card>
            <Card className="flex flex-col shadow-lg overflow-hidden">
                <CardHeader>
                    <CardTitle>Analyzed Diff</CardTitle>
                    <CardDescription>A preview of the changes used for generation.</CardDescription>
                </CardHeader>
                 <div className="flex-1 overflow-auto border-t">
                    <div className="prose prose-invert max-w-none break-words h-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        pre({node, ...props}) {
                          return <pre {...props} style={{ margin: 0, borderRadius: 0, height: '100%', whiteSpace: 'pre-wrap', background: '#020617' }} />
                        },
                        code({node, className, children, ...props}) {
                          const lang = className?.replace('language-', '') || '';
                          const diffClasses = {
                            '+': 'bg-green-500/10 text-green-400',
                            '-': 'bg-red-500/10 text-red-400',
                            '': 'text-gray-400'
                          }
                          
                          if (lang === 'diff') {
                            const lines = String(children).split('\n');
                            return (
                                <code>
                                    {lines.map((line, i) => {
                                        const firstChar = line.charAt(0);
                                        const type: '+' | '-' | '' = firstChar === '+' || firstChar === '-' ? firstChar : '';
                                        return (
                                            <span key={i} className={cn('block', diffClasses[type])}>
                                                {line}
                                            </span>
                                        );
                                    })}
                                </code>
                            );
                          }
                          return <code {...props} className={`${className || ''} text-sm`} style={{whiteSpace: 'pre-wrap'}}>{children}</code>
                        }
                      }}>
                        {`\`\`\`diff\n${diff}\n\`\`\``}
                      </ReactMarkdown>
                    </div>
                </div>
            </Card>
        </div>
      );
    }

    return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
            <Clipboard className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Commit Assistant</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Set up your comparison to get suggestions.
            </p>
            </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Choose Comparison Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={compareMode} onValueChange={(v) => setCompareMode(v as 'branches' | 'commit')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="branches" id="mode-branches"/>
                <Label htmlFor="mode-branches" className="font-normal flex items-center gap-2"><GitCompareArrows className="h-4 w-4"/> Between two branches</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="commit" id="mode-commit"/>
                <Label htmlFor="mode-commit" className="font-normal flex items-center gap-2"><GitCommitHorizontal className="h-4 w-4"/> Single commit</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
                <div className="flex items-center gap-2 text-sm">
                    <BookOpenCheck className="h-4 w-4"/>
                    What are Conventional Commits?
                </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
               <p className="text-xs text-muted-foreground">
                It's a specification for adding human and machine-readable meaning to commit messages. It provides a set of rules for creating an explicit commit history.
              </p>
              <ul className="space-y-2 text-xs">
                <li><span className="font-mono font-semibold text-primary">feat:</span> A new feature for the user.</li>
                <li><span className="font-mono font-semibold text-primary">fix:</span> A bug fix for the user.</li>
                <li><span className="font-mono font-semibold text-primary">docs:</span> Changes to documentation.</li>
                <li><span className="font-mono font-semibold text-primary">chore:</span> Routine tasks, config changes.</li>
                <li><span className="font-mono font-semibold text-primary">refactor:</span> A code change that neither fixes a bug nor adds a feature.</li>
              </ul>
              <Button asChild variant="link" size="sm" className="p-0 h-auto">
                <a href="https://www.conventionalcommits.org/en/v1.0.0/#summary" target="_blank" rel="noopener noreferrer">
                  Read the full documentation <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state={compareMode === 'branches' ? 'open' : 'closed'}>
            {compareMode === 'branches' && (
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>2. Select Branches</CardTitle>
                    <CardDescription>The AI will analyze the differences between these two branches.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="baseBranch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Base Branch</Label>
                    <Select onValueChange={setBaseBranch} value={baseBranch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={`base-${b}`} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    </div>
                     <div className="space-y-2">
                    <Label htmlFor="compareBranch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Compare Branch</Label>
                    <Select onValueChange={setCompareBranch} value={compareBranch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={`compare-${b}`} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                    </div>
                </CardContent>
                </Card>
            )}
        </div>
        
         <div className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state={compareMode === 'commit' ? 'open' : 'closed'}>
            {compareMode === 'commit' && (
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>2. Select a Commit</CardTitle>
                    <CardDescription>The AI will analyze the changes introduced by this commit against its parent.</CardDescription>
                </CardHeader>
                <CardContent>
                    <CommitSelector 
                        repoUrl={repoUrl} 
                        branches={branches}
                        onCommitSelect={setSelectedCommit}
                    />
                </CardContent>
                </Card>
            )}
        </div>

        {suggestions.length === 0 && (
          <Button onClick={handleGenerate} className="w-full" disabled={isGenerateDisabled}>
            {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Suggestions</>}
          </Button>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0">
          {renderMainContent()}
        </main>
    </div>
  );
}

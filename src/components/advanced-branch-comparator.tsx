
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, GitBranch, GitCompareArrows, FileDiff, CheckCircle2, Terminal, Info, FilePlus, FileText, FileX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type FileChange = {
  filePath: string;
  changeType: 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
  summary: string;
};

type AnalysisResult = {
  summary: string;
  impactAnalysis: string;
  fileChanges: FileChange[];
};

type AdvancedBranchComparatorProps = {
  repoUrl: string;
  branches: string[];
};

export default function AdvancedBranchComparator({ repoUrl, branches }: AdvancedBranchComparatorProps) {
  const { toast } = useToast();

  const [baseBranch, setBaseBranch] = useState('');
  const [headBranch, setHeadBranch] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.find(b => b === 'main' || b === 'master') || branches[0];
      setBaseBranch(defaultBranch);
      setHeadBranch(branches.find(b => b !== defaultBranch) || '');
    }
  }, [branches]);

  const handleAnalyze = async () => {
    if (!baseBranch || !headBranch) {
      toast({ variant: 'destructive', title: 'Please select both branches.' });
      return;
    }
    if (baseBranch === headBranch) {
      toast({ variant: 'destructive', title: 'Branches cannot be the same.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setGenerationLog([]);

    try {
        const commitsResponse = await fetch('/api/fetch-commits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch: headBranch, startDate: '1970-01-01T00:00:00Z', endDate: new Date().toISOString() }),
        });
        const commitsResult = await commitsResponse.json();
        if(commitsResult.error) throw new Error(commitsResult.error);
        const commitMessages = commitsResult.commits.map((c: any) => c.message);

      const response = await fetch('/api/compare-branches-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, baseBranch, headBranch, commitMessages }),
      });
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let streamData: Partial<AnalysisResult> = {};
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));
        for (const line of lines) {
          const data = JSON.parse(line.substring(6));
          if (data.error) throw new Error(data.error);
          if (data.status) setGenerationLog(prev => [...prev, data.status]);
          
          streamData = {
            summary: data.summary || streamData.summary,
            impactAnalysis: data.impactAnalysis || streamData.impactAnalysis,
            fileChanges: data.fileChanges || streamData.fileChanges,
          };

          if (streamData.summary && streamData.impactAnalysis && streamData.fileChanges) {
            setAnalysis(streamData as AnalysisResult);
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Analysis Failed', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isAnalyzeDisabled = isLoading || !baseBranch || !headBranch;
  
  const ChangeTypeIcon = ({ type }: { type: FileChange['changeType'] }) => {
    switch (type) {
        case 'ADDED': return <FilePlus className="h-4 w-4 text-green-500" />;
        case 'MODIFIED': return <FileText className="h-4 w-4 text-blue-500" />;
        case 'DELETED': return <FileX className="h-4 w-4 text-red-500" />;
        default: return <FileDiff className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderMainContent = () => {
    if (isLoading && !analysis) {
      return (
        <div className="text-center p-4 max-w-md mx-auto">
            <div className="relative mx-auto h-12 w-12 text-primary">
                <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-20"></div>
                <GitCompareArrows className="relative mx-auto h-12 w-12" />
            </div>
            <h3 className="mt-4 text-lg font-medium">AI is comparing branches...</h3>
            <Card className="mt-4 text-left bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                  <ScrollArea className="h-32 w-full">
                    <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                      {generationLog.map((log, index) => <p key={index} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">{log}</p>)}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
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
      return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in-50">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5"/> Impact & Risk Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{analysis.impactAnalysis}</p>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Key File Changes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Accordion type="single" collapsible className="w-full">
                        {analysis.fileChanges.map((file, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2 text-left">
                                        <ChangeTypeIcon type={file.changeType} />
                                        <span className="font-mono text-sm">{file.filePath}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <p className="text-sm text-muted-foreground">{file.summary}</p>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      );
    }
    return (
      <div className="text-center">
        <GitCompareArrows className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Advanced Branch Comparator</h3>
        <p className="mt-1 text-sm text-muted-foreground">Get a high-level summary of the differences between two branches.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Compare Branches</CardTitle>
            <CardDescription>Select two branches to analyze their differences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Base Branch</Label>
                <Select onValueChange={setBaseBranch} value={baseBranch} disabled={branches.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select base branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Head Branch</Label>
                <Select onValueChange={setHeadBranch} value={headBranch} disabled={branches.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select head branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
            </div>
              <Button onClick={handleAnalyze} className="w-full" disabled={isAnalyzeDisabled}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze Branches</>}
              </Button>
          </CardContent>
        </Card>
      </aside>
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {renderMainContent()}
        </div>
      </main>
    </div>
  );
}

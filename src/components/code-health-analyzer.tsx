
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, ShieldCheck, GitBranch, FileCode2, Zap, Bug, Wrench } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import FileSelector from './file-selector';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type CodeSmell = {
  type: string;
  description: string;
  suggestion: string;
};

type AnalysisResult = {
  overallScore: number;
  overallSummary: string;
  complexity: { score: number; summary: string };
  maintainability: { score: number; summary: string };
  codeSmells: CodeSmell[];
};

type CodeHealthAnalyzerProps = {
  repoUrl: string;
  branches: string[];
};

const ScoreIndicator = ({ score, title }: { score: number, title: string }) => {
    const getColor = (s: number) => {
        if (s > 80) return "bg-green-500";
        if (s > 50) return "bg-yellow-500";
        return "bg-red-500";
    }
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{title}</p>
                <p className={`text-lg font-bold ${getColor(score).replace('bg-','text-')}`}>{score}</p>
            </div>
            <Progress value={score} className="h-2" indicatorclassname={getColor(score)} />
        </div>
    );
};


export default function CodeHealthAnalyzer({ repoUrl, branches }: CodeHealthAnalyzerProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  const [filePath, setFilePath] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.find(b => b === 'main' || b === 'master') || branches[0];
      setBranch(defaultBranch);
    }
  }, [branches]);

  useEffect(() => {
    const fetchTree = async () => {
      if (branch && repoUrl) {
        setIsFetchingTree(true);
        setFileTree([]);
        setFilePath('');
        setAnalysis(null);
        try {
          const response = await fetch('/api/fetch-tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch }),
          });
          const result = await response.json();
          if (result.error || !response.ok) throw new Error(result.error);
          const sourceFiles = result.tree?.filter((f: string) => f.match(/\.(js|ts|jsx|tsx|py|java|go|rs|php)$/i)) || [];
          setFileTree(sourceFiles);
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error fetching file tree', description: e.message });
        } finally {
          setIsFetchingTree(false);
        }
      }
    };
    fetchTree();
  }, [branch, repoUrl, toast]);


  const handleAnalyze = async () => {
    if (!filePath) {
      toast({ variant: 'destructive', title: 'Please select a file to analyze.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-code-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, filePath }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to analyze code health.');
      }
      
      setAnalysis(result);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isAnalyzeDisabled = isLoading || !filePath || isFetchingTree;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
        <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Code Health Analysis</CardTitle>
                    <CardDescription>Select a file to get an AI-powered quality report.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch</Label>
                        <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0 || isFetchingTree}>
                            <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                            <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-primary" />File to Analyze</Label>
                        <FileSelector
                            fileTree={fileTree}
                            selectedFile={filePath}
                            onFileSelect={setFilePath}
                            isFetchingTree={isFetchingTree}
                        />
                    </div>
                     <Button onClick={handleAnalyze} className="w-full" disabled={isAnalyzeDisabled}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze File</>}
                    </Button>
                </CardContent>
            </Card>
        </aside>
        <main className="flex-1 flex flex-col p-4 md:pl-0">
             <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
                {isLoading && (
                  <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                    <p className="mt-4 text-muted-foreground">Analyzing file with AI...</p>
                  </div>
                )}
                {error && (
                   <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {!isLoading && !error && !analysis && (
                     <div className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Ready to Analyze</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Select a file and click "Analyze File".</p>
                    </div>
                )}
                 {!isLoading && !error && analysis && (
                     <div className="w-full space-y-6 animate-in fade-in-50">
                        <Card>
                            <CardHeader>
                                <CardTitle>Analysis for <span className="font-mono text-primary text-lg">{filePath}</span></CardTitle>
                                <CardDescription>{analysis.overallSummary}</CardDescription>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-6">
                                <ScoreIndicator score={analysis.overallScore} title="Overall Score" />
                                <ScoreIndicator score={analysis.complexity.score} title="Simplicity Score" />
                                <ScoreIndicator score={analysis.maintainability.score} title="Maintainability Score" />
                            </CardContent>
                        </Card>
                         <div className="grid md:grid-cols-2 gap-6">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5"/> Complexity Report</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{analysis.complexity.summary}</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5"/> Maintainability Report</CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <p className="text-sm text-muted-foreground">{analysis.maintainability.summary}</p>
                                </CardContent>
                            </Card>
                         </div>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Bug className="h-5 w-5"/> Code Smell Report</CardTitle>
                                {analysis.codeSmells.length === 0 && <CardDescription>No significant code smells detected. Great job!</CardDescription>}
                            </CardHeader>
                            {analysis.codeSmells.length > 0 && (
                                <CardContent>
                                    <Accordion type="single" collapsible className="w-full">
                                        {analysis.codeSmells.map((smell, index) => (
                                            <AccordionItem value={`item-${index}`} key={index}>
                                                <AccordionTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="destructive">{smell.type}</Badge>
                                                        <span className="text-left font-semibold">{smell.description}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <p className="text-sm text-muted-foreground">{smell.suggestion}</p>
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            )}
                         </Card>
                     </div>
                 )}
            </div>
        </main>
    </div>
  );
}

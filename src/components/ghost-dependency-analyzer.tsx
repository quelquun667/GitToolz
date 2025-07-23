
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, PackageSearch, GitBranch, Terminal, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

type GhostDependency = {
  name: string;
  reason: string;
};

type GhostDependencyAnalyzerProps = {
  repoUrl: string;
  branches: string[];
};

export default function GhostDependencyAnalyzer({ repoUrl, branches }: GhostDependencyAnalyzerProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GhostDependency[] | null>(null);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  useEffect(() => {
    if (branches.length > 0) {
      const defaultBranch = branches.find(b => b === 'main' || b === 'master') || branches[0];
      setBranch(defaultBranch);
    }
  }, [branches]);

  const handleAnalyze = async () => {
    if (!branch) {
      toast({ variant: 'destructive', title: 'Please select a branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setGenerationLog([]);

    try {
      const response = await fetch('/api/ghost-dependency-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
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
          if (data.status) setGenerationLog(prev => [...prev, data.status]);
          if (data.ghostDependencies) {
            setAnalysis(data.ghostDependencies);
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

  const isAnalyzeDisabled = isLoading || !branch;

  const renderMainContent = () => {
    if (isLoading && !analysis) {
      return (
        <div className="text-center p-4 max-w-md mx-auto">
            <div className="relative mx-auto h-12 w-12 text-primary">
                <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-20"></div>
                <PackageSearch className="relative mx-auto h-12 w-12" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Scanning for Ghost Dependencies...</h3>
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
        <Card className="w-full max-w-2xl animate-in fade-in-50">
            <CardHeader>
                <CardTitle>Ghost Dependency Report</CardTitle>
                <CardDescription>
                    {analysis.length > 0 
                        ? `Found ${analysis.length} package(s) that might be unused. Review them before removing.`
                        : "No unused packages found. Your dependency list looks clean!"
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {analysis.length > 0 && (
                    <ScrollArea className="h-96">
                        <ul className="space-y-4">
                            {analysis.map((dep, index) => (
                                <li key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                                    <Trash2 className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">{dep.name}</p>
                                        <p className="text-sm text-muted-foreground">{dep.reason}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
      );
    }
    return (
      <div className="text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Ghost Dependency Analyzer</h3>
        <p className="mt-1 text-sm text-muted-foreground">Find packages in your `package.json` that are not used in your code.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Find Ghost Dependencies</CardTitle>
            <CardDescription>Select a branch to scan the entire repository for unused packages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch</label>
                <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                    <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                    <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
            </div>
              <Button onClick={handleAnalyze} className="w-full" disabled={isAnalyzeDisabled}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze Dependencies</>}
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


'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, PackageCheck, GitBranch, ShieldAlert, BadgeCheck, Archive } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

type Dependency = {
  name: string;
  currentVersion: string;
  status: 'ok' | 'outdated' | 'unused';
  suggestion?: string;
};

type AnalysisResult = {
  dependencies: Dependency[];
  devDependencies: Dependency[];
  summary: string;
};

type DependencyAnalyzerProps = {
  repoUrl: string;
  branches: string[];
};

export default function DependencyAnalyzer({ repoUrl, branches }: DependencyAnalyzerProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

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

    try {
      const response = await fetch('/api/analyze-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to analyze dependencies.');
      }
      
      setAnalysis(result);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isAnalyzeDisabled = isLoading || !branch;

  const DependencyTable = ({ dependencies }: { dependencies: Dependency[] }) => {
    if (dependencies.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-4">No dependencies in this category.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Suggestion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dependencies.map(dep => (
            <TableRow key={dep.name}>
              <TableCell className="font-medium">{dep.name}</TableCell>
              <TableCell className="font-mono text-xs">{dep.currentVersion}</TableCell>
              <TableCell>
                {dep.status === 'ok' && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><BadgeCheck className="mr-1 h-3 w-3" />OK</Badge>}
                {dep.status === 'outdated' && <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"><ShieldAlert className="mr-1 h-3 w-3" />Outdated</Badge>}
                {dep.status === 'unused' && <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300"><Archive className="mr-1 h-3 w-3"/>Unused</Badge>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{dep.suggestion || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)] bg-card text-foreground">
       <CardHeader>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><PackageCheck /> Dependency Analyzer</CardTitle>
                <CardDescription>Analyze `package.json` for outdated or unused packages.</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAnalyze} disabled={isAnalyzeDisabled} className="w-full md:w-auto">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze</>}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {isLoading && (
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                <p className="mt-4 text-muted-foreground">Analyzing dependencies with AI...</p>
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
                    <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Ready to Analyze</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Select a branch and click "Analyze" to check your dependencies.</p>
                </div>
            )}
             {!isLoading && !error && analysis && (
                 <div className="w-full space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Analysis Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{analysis.summary}</p>
                        </CardContent>
                    </Card>
                    <Tabs defaultValue="dependencies">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="dependencies">Dependencies ({analysis.dependencies.length})</TabsTrigger>
                            <TabsTrigger value="devDependencies">Dev Dependencies ({analysis.devDependencies.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="dependencies" className="mt-4">
                            <Card>
                                <CardContent className="p-0">
                                    <DependencyTable dependencies={analysis.dependencies} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="devDependencies" className="mt-4">
                            <Card>
                                <CardContent className="p-0">
                                    <DependencyTable dependencies={analysis.devDependencies} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                 </div>
             )}
        </div>
      </CardContent>
    </div>
  );
}

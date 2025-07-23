
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, MessageCircleWarning, GitBranch, CheckCircle, XCircle, Tag, ScrollText, Inbox } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

type CategorizedIssue = {
  category: string;
  count: number;
  titles: string[];
};

type AnalysisResult = {
  totalOpen: number;
  totalClosed: number;
  categorizedIssues: CategorizedIssue[];
  keyThemes: string[];
};

type IssueAnalyzerProps = {
  repoUrl: string;
  branches: string[];
};

export default function IssueAnalyzer({ repoUrl, branches }: IssueAnalyzerProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState(branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const handleFetchAnalysis = async () => {
    if (!branch) {
      toast({ variant: 'destructive', title: 'Please select a branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to analyze issues.');
      }
      
      setAnalysis(result);

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const isFetchDisabled = isLoading || !branch;
  const noIssuesFound = analysis && analysis.totalOpen === 0 && analysis.totalClosed === 0 && analysis.categorizedIssues.length === 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)] bg-card text-foreground">
       <CardHeader>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><MessageCircleWarning /> Issue Analysis</CardTitle>
                <CardDescription>Get an AI-powered summary of the repository's issues.</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={handleFetchAnalysis} disabled={isFetchDisabled} className="w-full md:w-auto">
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
                <p className="mt-4 text-muted-foreground">Analyzing repository issues with AI...</p>
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
                    <MessageCircleWarning className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Ready to Analyze</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Click "Analyze" to get an AI summary of repository issues.</p>
                </div>
            )}
             {!isLoading && !error && analysis && (
                noIssuesFound ? (
                    <div className="text-center">
                        <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Issues Found</h3>
                        <p className="mt-1 text-sm text-muted-foreground">This repository does not have any issues.</p>
                    </div>
                ) : (
                 <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Issue Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={analysis.categorizedIssues} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--accent))' }}
                                            contentStyle={{ 
                                                background: 'hsl(var(--background))', 
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: 'var(--radius)'
                                            }}
                                        />
                                        <Bar dataKey="count" name="Issues" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={800}>
                                          <LabelList dataKey="count" position="top" offset={8} className="fill-foreground font-semibold" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-around text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 text-green-500">
                                            <CheckCircle className="h-6 w-6" />
                                            <p className="text-3xl font-bold">{analysis.totalOpen}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Open</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-2 text-red-500">
                                            <XCircle className="h-6 w-6" />
                                            <p className="text-3xl font-bold">{analysis.totalClosed}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Closed</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Tag /> Key Themes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.keyThemes.map((theme, i) => (
                                        <Badge key={i} variant="secondary">{theme}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-3">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><ScrollText /> Issue Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-64">
                                    <div className="space-y-4">
                                        {analysis.categorizedIssues.map((cat) => (
                                            <div key={cat.category}>
                                                <h4 className="font-semibold text-foreground mb-2">{cat.category} ({cat.count})</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                                    {cat.titles.map((title, i) => (
                                                        <li key={i}>{title}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                 </div>
                )
             )}
        </div>
      </CardContent>
    </div>
  );
}

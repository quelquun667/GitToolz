'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, Flame, GitBranch, BarChartHorizontalBig } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { Progress } from './ui/progress';

type Hotspot = {
  path: string;
  commitCount: number;
};

type CodeHotspotsProps = {
  repoUrl: string;
  branches: string[];
};

export default function CodeHotspots({ repoUrl, branches }: CodeHotspotsProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState(branches.includes('main') ? 'main' : branches.includes('master') ? 'master' : branches[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);

  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleFetchHotspots = async () => {
    if (!branch) {
      toast({ variant: 'destructive', title: 'Please select a branch.' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setHotspots(null);
    setProgress(0);
    setProgressMessage('');

    try {
      const response = await fetch('/api/get-hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
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
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.status) setProgressMessage(parsed.status);
              if (parsed.progress) setProgress(parsed.progress);
              if (parsed.hotspots) {
                 const sortedHotspots = parsed.hotspots.sort((a: Hotspot, b: Hotspot) => b.commitCount - a.commitCount).slice(0, 15);
                 setHotspots(sortedHotspots);
              }
            } catch (e) {
              console.error("Failed to parse stream data chunk:", data, e);
            }
          }
        }
        buffer = lines[lines.length - 1];
      }

    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const isFetchDisabled = isLoading || !branch;

  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)] bg-card text-foreground">
       <CardHeader>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
                <CardTitle className="flex items-center gap-2"><Flame /> Code Hotspots</CardTitle>
                <CardDescription>Identify the most frequently changed files in the repository.</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <div className="w-full md:w-48">
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button onClick={handleFetchHotspots} disabled={isFetchDisabled} className="w-full md:w-auto">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze</>}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {isLoading && (
              <div className="text-center w-full max-w-md">
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                <p className="mt-4 text-muted-foreground">{progressMessage || 'Analyzing commit history...'}</p>
                <Progress value={progress} className="mt-4" />
                <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
              </div>
            )}
            {error && (
               <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && !hotspots && (
                 <div className="text-center">
                    <BarChartHorizontalBig className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Ready to Analyze</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Select a branch and click "Analyze" to find code hotspots.</p>
                </div>
            )}
             {!isLoading && !error && hotspots && (
                 hotspots.length === 0 ? (
                    <div className="text-center">
                        <BarChartHorizontalBig className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">No Data</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Could not find any file changes in the recent commit history.</p>
                    </div>
                 ) : (
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart layout="vertical" data={hotspots} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                            <YAxis 
                                dataKey="path" 
                                type="category" 
                                width={150} 
                                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} 
                                tickFormatter={(value) => value.length > 20 ? `...${value.slice(-17)}` : value}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--accent))' }}
                                contentStyle={{ 
                                    background: 'hsl(var(--background))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Bar dataKey="commitCount" name="Commits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                               <LabelList dataKey="commitCount" position="right" offset={10} className="fill-foreground font-semibold" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 )
             )}
        </div>
      </CardContent>
    </div>
  );
}

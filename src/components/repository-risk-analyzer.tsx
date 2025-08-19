
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, AlertCircle, GitBranch, Terminal, ShieldAlert, ShieldCheck, Shield, File, Info, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type RiskItem = {
  level: 'info' | 'warning' | 'critical';
  description: string;
  file?: string;
  suggestion: string;
};

type AnalysisResult = {
  overallRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  risks: RiskItem[];
};

type RepositoryRiskAnalyzerProps = {
  repoUrl: string;
  branches: string[];
};

export default function RepositoryRiskAnalyzer({ repoUrl, branches }: RepositoryRiskAnalyzerProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
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
      const response = await fetch('/api/analyze-repository-risk', {
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
          if (data.overallRisk) {
            setAnalysis(data);
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

  const RiskIcon = ({ level }: { level: RiskItem['level'] }) => {
    switch (level) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  const OverallRiskCard = ({ risk, summary }: { risk: AnalysisResult['overallRisk'], summary: string }) => {
    const riskData = {
        'Low': { icon: ShieldCheck, color: 'text-green-500', bgColor: 'bg-green-500/10' },
        'Medium': { icon: Shield, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
        'High': { icon: ShieldAlert, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
        'Critical': { icon: ShieldAlert, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    };
    const { icon: Icon, color, bgColor } = riskData[risk];
    
    return (
        <Card className={bgColor}>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${color}`} />
                    <div className="flex flex-col">
                        <span>Overall Risk: <span className={color}>{risk}</span></span>
                        <CardDescription className={color}>
                           {summary}
                        </CardDescription>
                    </div>
                </CardTitle>
            </CardHeader>
        </Card>
    );
  };

  const renderMainContent = () => {
    if (isLoading && !analysis) {
      return (
        <div className="text-center p-4 max-w-md mx-auto">
            <div className="relative mx-auto h-12 w-12 text-primary">
                <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-20"></div>
                <ShieldAlert className="relative mx-auto h-12 w-12" />
            </div>
            <h3 className="mt-4 text-lg font-medium">AI is analyzing the repository...</h3>
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
        <div className="w-full space-y-6 animate-in fade-in-50">
          <OverallRiskCard risk={analysis.overallRisk} summary={analysis.summary} />

          <Card>
            <CardHeader>
              <CardTitle>Detailed Findings</CardTitle>
              <CardDescription>
                {analysis.risks.length > 0 
                    ? "Specific potential risks identified in the repository."
                    : "No specific risks were identified. The repository appears to be safe."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.risks.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  {analysis.risks.map((risk, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3 text-left">
                          <RiskIcon level={risk.level} />
                          <span className="font-semibold flex-1">{risk.description}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {risk.file && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <File className="h-4 w-4" /> 
                            <span className="font-mono">{risk.file}</span>
                          </p>
                        )}
                        <p className="text-sm">{risk.suggestion}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Repository Risk Analyzer</h3>
        <p className="mt-1 text-sm text-muted-foreground">Check a repository for potential security risks before you download it.</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Analyze Repository Risk</CardTitle>
            <CardDescription>Select a branch to perform a security analysis.</CardDescription>
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
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Search className="mr-2 h-4 w-4" />Analyze Repository</>}
            </Button>
          </CardContent>
        </Card>
         <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Disclaimer</AlertTitle>
            <AlertDescription>
                This tool provides an automated analysis and is not a substitute for a professional security audit. Always review code yourself before execution.
            </AlertDescription>
        </Alert>
      </aside>
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        <div className="flex-1 flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-border/60">
            {renderMainContent()}
        </div>
      </main>
    </div>
  );
}

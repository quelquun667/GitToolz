
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Globe, Loader2, Copy, Terminal, RefreshCw, Sparkles, GitBranch, CheckCircle2, Check, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getRepoTree } from '@/app/actions';
import { getRepoFileContent } from '@/services/github';

const KEY_FILES_TO_READ = [
  'package.json',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  'composer.json',
  'Gemfile',
  'Pipfile',
  'pyproject.toml',
  'next.config.js',
  'next.config.mjs',
  'vite.config.js',
  'vite.config.ts',
  'README.md',
];

type OnboardingGuideGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

export default function OnboardingGuideGenerator({ repoUrl, branches }: OnboardingGuideGeneratorProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [guide, setGuide] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    // Set default branch when branches are loaded
    if (branches.length > 0) {
      if (branches.includes('main')) {
        setBranch('main');
      } else if (branches.includes('master')) {
        setBranch('master');
      } else {
        setBranch(branches[0]);
      }
    }
  }, [branches]);

  const handleGenerate = async () => {
    if (!branch) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select a branch.',
      });
      return;
    }
    
    setIsGenerating(true);
    setGuide(null);
    setGenerationLog([]);

    try {
        const fileTreeResult = await getRepoTree({ repoUrl, branch });
        if (fileTreeResult.error || !fileTreeResult.tree) {
            throw new Error(fileTreeResult.error || 'Could not fetch file tree.');
        }

        const filePaths = fileTreeResult.tree;
        const fileContents: Record<string, string> = {};
        const filesToRead = filePaths.filter(path => 
            KEY_FILES_TO_READ.some(keyFile => path.toLowerCase().endsWith(keyFile.toLowerCase()))
        );

        for (const filePath of filesToRead) {
            const content = await getRepoFileContent(repoUrl, branch, filePath);
            if (content) {
                fileContents[filePath] = content;
            }
        }
      
      const response = await fetch('/api/generate-onboarding-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              repoUrl, 
              fileTree: filePaths.join('\n'), 
              fileContents 
            }),
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        while(true) {
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
                if (parsed.error) {
                    toast({
                        variant: 'destructive',
                        title: 'Generation Failed',
                        description: parsed.error,
                    });
                    setIsGenerating(false);
                    return;
                }
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.guide) {
                    setGuide(parsed.guide);
                }
              } catch (e) {
                console.error("Failed to parse stream data chunk:", data, e);
              }
            }
          }
          buffer = lines[lines.length - 1];
        }
      };
      
      await processStream();
      setIsGenerating(false);
      setIsFinalizing(true);
      setTimeout(() => {
        setIsFinalizing(false);
      }, 1500);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (guide === null || isCopied) return;
    navigator.clipboard.writeText(guide).then(() => {
      setIsCopied(true);
      toast({ title: 'Copied!', description: 'The guide has been copied to your clipboard.' });
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (guide === null) return;
    const blob = new Blob([guide], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GETTING_STARTED.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const isGenerateDisabled = isGenerating || !branch;
  
  const renderMainContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4 max-w-md mx-auto">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Generating Onboarding Guide...</h3>
            <Card className="mt-4 text-left bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                  <ScrollArea className="h-32 w-full">
                    <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                      {generationLog.map((log, index) => <p key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-500">{log}</p>)}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (isFinalizing) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Done!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your onboarding guide is ready.</p>
          </div>
        </div>
      );
    }
    
    if (guide !== null) {
      return (
         <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
           <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Onboarding Guide</CardTitle>
                <CardDescription>A custom getting-started guide for new contributors.</CardDescription>
              </div>
               <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Download className="mr-2 h-4 w-4" />Download</Button>
                </div>
            </CardHeader>
            <div className="flex-1 overflow-auto p-6 border-t">
                <div className="prose prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{guide}</ReactMarkdown>
                </div>
            </div>
        </Card>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Onboarding Assistant</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a step-by-step guide for new developers.
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
              <CardTitle>Onboarding Guide Generator</CardTitle>
              <CardDescription>Select a branch to generate a getting-started guide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch to Analyze</Label>
                <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={"Select a branch"} />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} className="w-full" disabled={isGenerateDisabled}>
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Guide</>}
              </Button>
            </CardContent>
          </Card>
        </aside>
        
        <main className="flex-1 flex flex-col p-4 md:pl-0">
          {renderMainContent()}
        </main>
      </div>
  );
}

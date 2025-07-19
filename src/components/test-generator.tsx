
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Globe, Loader2, Copy, Terminal, RefreshCw, Sparkles, Search, ListChecks, GitBranch, CheckCircle2, FileCode2, TestTube2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { getRepoFileContent, getRepoTree } from '@/services/github';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';
import { streamTestCasesAction } from '@/app/actions';

const SUPPORTED_FRAMEWORKS = [
  'Jest',
  'Vitest',
  'Pytest',
  'Mocha',
  'Jasmine',
  'Cypress',
];

type TestGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

export default function TestGenerator({ repoUrl, branches }: TestGeneratorProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  
  const [filePath, setFilePath] = useState('');
  const [functionName, setFunctionName] = useState('');
  const [testFramework, setTestFramework] = useState('Jest');

  const [generatedTests, setGeneratedTests] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  useEffect(() => {
    if (branches.length > 0) {
      if (branches.includes('main')) setBranch('main');
      else if (branches.includes('master')) setBranch('master');
      else setBranch(branches[0]);
    }
  }, [branches]);
  
  useEffect(() => {
    const fetchTree = async () => {
      if (branch && repoUrl) {
        setIsFetchingTree(true);
        setFileTree([]);
        setFilePath('');
        try {
          const result = await getRepoTree(repoUrl, branch);
          const sourceFiles = result.filter(f => f.path.match(/\.(js|ts|jsx|tsx|py)$/i)).map(f => f.path);
          setFileTree(sourceFiles);
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
          setIsFetchingTree(false);
        }
      }
    };
    fetchTree();
  }, [branch, repoUrl, toast]);
  
  const handleGenerate = async () => {
    if (!filePath || !functionName || !testFramework) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a file, enter a function name, and choose a framework.' });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedTests(null);
    setGenerationLog([]);

    try {
      const response = await streamTestCasesAction({
        repoUrl,
        branch,
        filePath,
        functionName,
        testFramework
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
                    toast({ variant: 'destructive', title: 'Generation Failed', description: parsed.error });
                    setIsGenerating(false);
                    return;
                }
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.testCases) {
                    setGeneratedTests(parsed.testCases);
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
      setTimeout(() => setIsFinalizing(false), 1500);

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: e.message });
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedTests) return;
    navigator.clipboard.writeText(generatedTests).then(() => {
      toast({ title: 'Copied!', description: 'The test code has been copied to your clipboard.' });
    });
  };

  const handleDownload = () => {
    if (!generatedTests) return;
    const blob = new Blob([generatedTests], { type: 'text/plain;charset=utf-t' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = filePath.split('/').pop()?.replace(/\.(js|ts|jsx|tsx|py)$/i, `.test.$1`) || 'tests.js';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const FileSelectorDialog = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredFiles = fileTree.filter(file => file.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isFetchingTree || fileTree.length === 0}>
            {filePath || 'Select a file...'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Source File</DialogTitle>
            <DialogDescription>Choose a file to generate tests for.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search files..." 
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <ScrollArea className="h-96">
            <div className="p-1">
              {filteredFiles.map(file => (
                <div 
                  key={file} 
                  onClick={() => {
                    setFilePath(file);
                    setIsFileDialogOpen(false);
                  }}
                  className="p-2 rounded-md hover:bg-muted cursor-pointer text-sm font-mono"
                >
                  {file}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };
  
  const renderMainContent = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4 max-w-md mx-auto">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Generating Test Cases...</h3>
            <Card className="mt-4 text-left bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                  <ScrollArea className="h-32 w-full">
                    <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                      {generationLog.map((log, index) => <p key={index}>{log}</p>)}
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
            <p className="mt-1 text-sm text-muted-foreground">Your test cases are ready.</p>
          </div>
        </div>
      );
    }

    if (generatedTests) {
      return (
        <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Generated Tests</CardTitle>
              <CardDescription>
                For <span className="font-mono bg-muted px-1 py-0.5 rounded">{functionName}</span> in <span className="font-mono bg-muted px-1 py-0.5 rounded">{filePath}</span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Copy className="mr-2 h-4 w-4" />Copy</Button>
              <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Download className="mr-2 h-4 w-4" />Download</Button>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto p-0 border-t">
              <div className="prose prose-invert max-w-none break-words h-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                  pre({node, ...props}) {
                    return <pre {...props} style={{ margin: 0, borderRadius: 0, height: '100%', whiteSpace: 'pre-wrap' }} />
                  },
                  code({node, className, children, ...props}) {
                    return <code {...props} className={`${className} text-sm`} style={{whiteSpace: 'pre-wrap'}}>{children}</code>
                  }
                }}>
                  {generatedTests}
                </ReactMarkdown>
              </div>
          </div>
        </Card>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
        <div className="text-center">
          <TestTube2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Test Case Generator</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your options to generate test cases.
          </p>
        </div>
      </div>
    );
  };

  const isConfigDisabled = !branch || isFetchingTree;
  
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Select Source</CardTitle>
            <CardDescription>Choose the branch and file to analyze.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch" className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch to Analyze</Label>
              <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0 || isFetchingTree}>
                  <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                      {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label htmlFor="file" className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-primary" />File Path</Label>
               <FileSelectorDialog />
            </div>
          </CardContent>
        </Card>
        
        <fieldset className="space-y-6 disabled:opacity-60" disabled={isConfigDisabled || !filePath}>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>2. Configure Test</CardTitle>
                    <CardDescription>Specify what to test and how.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="functionName">Function / Class Name</Label>
                        <Input 
                          id="functionName"
                          placeholder="e.g., calculateTotal"
                          value={functionName}
                          onChange={(e) => setFunctionName(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="testFramework">Test Framework</Label>
                        <Select onValueChange={setTestFramework} value={testFramework}>
                            <SelectTrigger id="testFramework" className="w-full">
                                <SelectValue placeholder="Select a framework" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Button onClick={handleGenerate} className="w-full" disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Tests</>}
            </Button>
        </fieldset>
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        {renderMainContent()}
      </main>
    </div>
  );
}

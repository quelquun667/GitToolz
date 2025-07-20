
'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Globe, Loader2, Copy, Terminal, RefreshCw, Sparkles, Search, ListChecks, GitBranch, CheckCircle2, FileCode2, TestTube2, Workflow, BookText, Check, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import FileSelector from './file-selector';


const SUPPORTED_FRAMEWORKS = [
  'Jest',
  'Vitest',
  'Pytest',
  'Mocha',
  'Jasmine',
  'Cypress',
];

type TestResult = {
  explanation: string;
  code: string;
}

type TestGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

const FrameworkInfoDialog = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>How to Choose a Test Framework?</DialogTitle>
                <DialogDescription>
                    A test framework provides tools and structure to write and run tests efficiently.
                </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4 text-sm">
                <div>
                    <h4 className="font-semibold text-foreground">For JavaScript / TypeScript (Frontend or Node.js)</h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
                        <li><span className="font-semibold text-foreground">Jest & Vitest:</span> Best for modern web apps (React, Vue, Node.js). Vitest is known for its speed. Good default choices.</li>
                        <li><span className="font-semibold text-foreground">Cypress:</span> Use this to test user interactions in a real browser (e.g., clicking buttons, filling forms). It tests the whole application, not just a single function.</li>
                        <li><span className="font-semibold text-foreground">Mocha & Jasmine:</span> Older, solid frameworks. Choose them if your project already uses them.</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-foreground">For Python</h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
                        <li><span className="font-semibold text-foreground">Pytest:</span> The standard choice for Python. It's simple, powerful, and widely used.</li>
                    </ul>
                </div>
            </div>
        </DialogContent>
    </Dialog>
);


export default function TestGenerator({ repoUrl, branches }: TestGeneratorProps) {
  const { toast } = useToast();

  const [branch, setBranch] = useState('');
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  
  const [filePath, setFilePath] = useState('');
  const [functions, setFunctions] = useState<string[]>([]);
  const [isFetchingFunctions, setIsFetchingFunctions] = useState(false);
  const [functionName, setFunctionName] = useState('');
  const [testFramework, setTestFramework] = useState('Jest');
  const [testEntireFile, setTestEntireFile] = useState(false);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  
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
        setFunctions([]);
        setFunctionName('');
        setTestEntireFile(false);
        try {
          const response = await fetch('/api/fetch-tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch }),
          });
          const result = await response.json();
          if (result.error || !response.ok) {
            throw new Error(result.error);
          }
          const sourceFiles = result.tree?.filter((f: string) => f.match(/\.(js|ts|jsx|tsx|py)$/i)) || [];
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

  useEffect(() => {
    const fetchFunctions = async () => {
        if (filePath && branch && repoUrl) {
            setIsFetchingFunctions(true);
            setFunctions([]);
            setFunctionName('');
            try {
                const response = await fetch('/api/extract-functions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoUrl, branch, filePath }),
                });
                const result = await response.json();
                if (result.error || !response.ok) {
                    throw new Error(result.error || 'Failed to extract functions.');
                }
                setFunctions(result.functions || []);
                 if ((result.functions || []).length === 0) {
                    toast({
                        title: "No Functions Found",
                        description: "The AI couldn't detect any functions in this file. You can test the entire file.",
                        duration: 5000,
                    });
                    setTestEntireFile(true);
                }
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: e.message });
            } finally {
                setIsFetchingFunctions(false);
            }
        }
    };
    fetchFunctions();
  }, [filePath, branch, repoUrl, toast]);
  
  const handleGenerate = async () => {
    const finalFunctionName = testEntireFile ? '[Entire File]' : functionName;
    if (!filePath || !finalFunctionName || !testFramework) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please complete all required fields.' });
      return;
    }
    
    setIsGenerating(true);
    setTestResult(null);
    setGenerationLog([]);

    try {
        const response = await fetch('/api/generate-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repoUrl,
              branch,
              filePath,
              functionName: finalFunctionName,
              testFramework
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
                    toast({ variant: 'destructive', title: 'Generation Failed', description: parsed.error });
                    setIsGenerating(false);
                    return;
                }
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.code && parsed.explanation) {
                    setTestResult({ code: parsed.code, explanation: parsed.explanation });
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

  const handleCopy = (content: string) => {
    if (!content || isCodeCopied) return;
    navigator.clipboard.writeText(content).then(() => {
      setIsCodeCopied(true);
      toast({ title: 'Copied!', description: 'The code has been copied to your clipboard.' });
      setTimeout(() => setIsCodeCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!testResult?.code) return;
    const blob = new Blob([testResult.code], { type: 'text/plain;charset=utf-t' });
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
            <p className="mt-1 text-sm text-muted-foreground">Your test cases are ready.</p>
          </div>
        </div>
      );
    }

    if (testResult) {
      const targetName = testEntireFile ? filePath : functionName;
      return (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
          <Card className="flex flex-col shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookText className="h-5 w-5" /> Explanation</CardTitle>
              <CardDescription>
                Step-by-step breakdown of the generated tests.
              </CardDescription>
            </CardHeader>
            <ScrollArea className="flex-1 border-t">
              <div className="p-6 prose prose-invert max-w-none break-words">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{testResult.explanation}</ReactMarkdown>
              </div>
            </ScrollArea>
          </Card>

          <Card className="flex flex-col shadow-lg overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
              <div className="flex-grow">
                <CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5" /> Test Code</CardTitle>
                <CardDescription>
                  For <span className="font-mono bg-muted px-1 py-0.5 rounded">{targetName}</span>
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => handleCopy(testResult.code)} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    {isCodeCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {isCodeCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary"><Download className="mr-2 h-4 w-4" />Download</Button>
              </div>
            </CardHeader>
            <div className="flex-1 overflow-auto border-t">
                <div className="prose prose-invert max-w-none break-words h-full">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    pre({node, ...props}) {
                      return <pre {...props} style={{ margin: 0, borderRadius: 0, height: '100%', whiteSpace: 'pre-wrap' }} />
                    },
                    code({node, className, children, ...props}) {
                      return <code {...props} className={`${className || ''} text-sm`} style={{whiteSpace: 'pre-wrap'}}>{children}</code>
                    }
                  }}>
                    {`\`\`\`${filePath.split('.').pop()}\n${testResult.code}\n\`\`\``}
                  </ReactMarkdown>
                </div>
            </div>
          </Card>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
        <div className="text-center p-4">
          <TestTube2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Test Case Generator</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your options to generate test cases.
          </p>
        </div>
      </div>
    );
  };

  const showSecondStep = filePath && !isFetchingTree;
  const isGenerateDisabled = isGenerating || !filePath || (!testEntireFile && !functionName);

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
                      <SelectValue placeholder={isFetchingTree ? "Loading branches..." : "Select a branch"} />
                  </SelectTrigger>
                  <SelectContent>
                      {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label htmlFor="file" className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-primary" />File Path</Label>
               <div className="flex items-center gap-2">
                 <FileSelector
                    fileTree={fileTree}
                    selectedFile={filePath}
                    onFileSelect={setFilePath}
                    isFetchingTree={isFetchingTree}
                    dialogTitle="Select a Source File"
                    dialogDescription="Choose a file to generate tests for."
                 />
                 {isFetchingTree && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
               </div>
            </div>
          </CardContent>
        </Card>
        
        {showSecondStep && (
            <Card className="shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state="open">
                <CardHeader>
                    <CardTitle>2. Configure Test</CardTitle>
                    <CardDescription>Specify what to test and how.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="functionName" className="flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-primary" />
                          Function / Class Name
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={setFunctionName} value={functionName} disabled={isFetchingFunctions || testEntireFile || functions.length === 0}>
                              <SelectTrigger>
                                  <SelectValue placeholder={isFetchingFunctions ? "Analyzing file..." : "Select a function"} />
                              </SelectTrigger>
                              <SelectContent>
                                  {functions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          {isFetchingFunctions && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="entireFile" checked={testEntireFile} onCheckedChange={(checked) => setTestEntireFile(!!checked)} />
                        <Label htmlFor="entireFile" className="text-sm font-normal">Test entire file</Label>
                    </div>
                    <Separator />
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="testFramework">Test Framework</Label>
                            <FrameworkInfoDialog />
                        </div>
                        <Select onValueChange={setTestFramework} value={testFramework}>
                            <SelectTrigger id="testFramework" className="w-full">
                                <SelectValue placeholder="Select a framework" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <Button onClick={handleGenerate} className="w-full" disabled={isGenerateDisabled}>
                      {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Tests</>}
                    </Button>
                </CardContent>
            </Card>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0 gap-4">
        {renderMainContent()}
      </main>
    </div>
  );
}

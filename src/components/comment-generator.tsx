
'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, CheckCircle2, Clipboard, Copy, Check, Terminal, MessageSquareQuote, GitBranch, FileCode2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import FileSelector from './file-selector';


const LANGUAGES: Record<string, string> = {
  'JavaScript': 'JSDoc',
  'TypeScript': 'JSDoc',
  'Python': 'Python Docstrings',
  'Java': 'JavaDoc',
  'C#': 'XML Documentation Comments',
  'Go': 'Go Doc Comments',
  'Rust': 'Rustdoc',
  'PHP': 'PHPDoc'
};

const EXT_TO_LANG: Record<string, string> = {
  'js': 'JavaScript',
  'jsx': 'JavaScript',
  'ts': 'TypeScript',
  'tsx': 'TypeScript',
  'py': 'Python',
  'java': 'Java',
  'cpp': 'C++',
  'cs': 'C#',
  'go': 'Go',
  'rs': 'Rust',
  'php': 'PHP',
  'rb': 'Ruby',
  'swift': 'Swift',
  'kt': 'Kotlin',
};

type CommentGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

export default function CommentGenerator({ repoUrl, branches }: CommentGeneratorProps) {
  const { toast } = useToast();

  const [inputMode, setInputMode] = useState('paste');
  const [sourceCode, setSourceCode] = useState('');
  const [language, setLanguage] = useState('JavaScript');
  
  // Repo file state
  const [branch, setBranch] = useState('');
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  const [commentedCode, setCommentedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);

  const [isCodeCopied, setIsCodeCopied] = useState(false);
  
  const commentStyle = LANGUAGES[language] || 'standard inline comments';

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
        setSourceCode('');
        try {
          const response = await fetch('/api/fetch-tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch }),
          });
          const result = await response.json();
          if (result.error || !response.ok) throw new Error(result.error);
          const sourceFiles = result.tree?.filter((f: string) => f.match(/\.(js|ts|jsx|tsx|py|java|cpp|cs|go|rs|php|rb|swift|kt)$/i)) || [];
          setFileTree(sourceFiles);
        } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error fetching file tree', description: e.message });
        } finally {
          setIsFetchingTree(false);
        }
      }
    };
    if (inputMode === 'repo') {
      fetchTree();
    }
  }, [branch, repoUrl, toast, inputMode]);

  const handleFileSelect = async (selectedPath: string) => {
    setFilePath(selectedPath);
    setIsFetchingFile(true);
    setSourceCode('');

    try {
        const response = await fetch('/api/fetch-file-content', { // This API route needs to be created
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch, path: selectedPath }),
        });
        const result = await response.json();
        if (result.error || !response.ok) throw new Error(result.error);
        setSourceCode(result.content);

        const extension = selectedPath.split('.').pop() || '';
        if (EXT_TO_LANG[extension]) {
            setLanguage(EXT_TO_LANG[extension]);
        }

    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error fetching file content', description: e.message });
    } finally {
        setIsFetchingFile(false);
    }
  };


  const handleGenerate = async () => {
    if (!sourceCode || !language) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide source code and select a language.' });
      return;
    }

    setIsGenerating(true);
    setCommentedCode(null);
    setGenerationLog([]);

    try {
      const response = await fetch('/api/generate-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode, language, commentStyle }),
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
              if (parsed.error) {
                toast({ variant: 'destructive', title: 'Generation Failed', description: parsed.error });
                setIsGenerating(false);
                return;
              }
              if (parsed.status) {
                setGenerationLog(prev => [...prev, parsed.status]);
              }
              if (parsed.commentedCode) {
                setCommentedCode(parsed.commentedCode);
              }
            } catch (e) {
              console.error("Failed to parse stream data chunk:", data, e);
            }
          }
        }
        buffer = lines[lines.length - 1];
      }
      
      setIsGenerating(false);
      setIsFinalizing(true);
      setTimeout(() => setIsFinalizing(false), 1500);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({ variant: 'destructive', title: 'Generation Failed', description: error });
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

  const isGenerateDisabled = isGenerating || !sourceCode || !language;

  const renderOutput = () => {
    if (isGenerating) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4 max-w-md mx-auto">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Generating Comments...</h3>
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
            <h3 className="mt-4 text-lg font-medium">Comments Generated!</h3>
          </div>
        </div>
      );
    }

    if (commentedCode) {
      return (
        <Card className="flex flex-col shadow-lg overflow-hidden flex-1">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Commented Code</CardTitle>
                    <CardDescription>Generated with {commentStyle}</CardDescription>
                </div>
                <Button onClick={() => handleCopy(commentedCode)} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    {isCodeCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {isCodeCopied ? 'Copied!' : 'Copy'}
                </Button>
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
                    {`\`\`\`${language.toLowerCase()}\n${commentedCode}\n\`\`\``}
                  </ReactMarkdown>
                </div>
            </div>
        </Card>
      );
    }
    
    return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
            <MessageSquareQuote className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Comment Generator</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Paste your code to get started.
            </p>
            </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
        <aside className="w-full md:w-[450px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6">
            <Card className="shadow-lg flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Comment Generator</CardTitle>
                    <CardDescription>Automatically add documentation comments to your code.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                     <Tabs value={inputMode} onValueChange={setInputMode} className="flex-1 flex flex-col">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="paste">Pasted Code</TabsTrigger>
                            <TabsTrigger value="repo">From Repository</TabsTrigger>
                        </TabsList>
                        <TabsContent value="paste" className="space-y-4 pt-4 flex-1 flex flex-col">
                            <div className="space-y-2">
                                <Label htmlFor="language-paste">Language</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger id="language-paste"><SelectValue /></SelectTrigger>
                                    <SelectContent>{Object.keys(LANGUAGES).map(l => <SelectItem key={`paste-${l}`} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 flex-1 flex flex-col">
                                <Label htmlFor="source-code-paste">Source Code</Label>
                                <Textarea 
                                    id="source-code-paste"
                                    value={sourceCode}
                                    onChange={(e) => setSourceCode(e.target.value)}
                                    placeholder="Paste your function or class here..."
                                    className="flex-1 font-mono text-xs"
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="repo" className="space-y-4 pt-4 flex-1 flex flex-col">
                           <div className="space-y-2">
                              <Label className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />Branch</Label>
                              <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0 || isFetchingTree}>
                                <SelectTrigger><SelectValue placeholder={isFetchingTree ? "Loading..." : "Select branch"} /></SelectTrigger>
                                <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                           <div className="space-y-2">
                              <Label className="flex items-center gap-2"><FileCode2 className="h-4 w-4 text-primary" />File</Label>
                                <FileSelector
                                    fileTree={fileTree}
                                    selectedFile={filePath}
                                    onFileSelect={handleFileSelect}
                                    isFetchingTree={isFetchingTree}
                                />
                            </div>
                             <div className="space-y-2 flex-1 flex flex-col">
                                <Label htmlFor="source-code-repo">Source Code</Label>
                                <Textarea 
                                    id="source-code-repo"
                                    value={sourceCode}
                                    onChange={(e) => setSourceCode(e.target.value)}
                                    placeholder={isFetchingFile ? "Loading file content..." : "Select a file to see its content."}
                                    className="flex-1 font-mono text-xs"
                                    readOnly
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button onClick={handleGenerate} className="w-full" disabled={isGenerateDisabled}>
                        {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Comments</>}
                    </Button>
                </CardContent>
            </Card>
        </aside>
        <main className="flex-1 flex flex-col p-4 md:pl-0">
            {renderOutput()}
        </main>
    </div>
  );
}

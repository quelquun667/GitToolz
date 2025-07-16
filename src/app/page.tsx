'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { summarizeAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, FileCode2, Copy, Link as LinkIcon, List, Settings, RefreshCw, Terminal, Files } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const SECTIONS = [
  { id: 'badges', label: 'GitHub Badges', value: 'GitHub Badges' },
  { id: 'toc', label: 'Table of Contents', value: 'Table of Contents' },
  { id: 'overview', label: 'Project Overview', value: 'Project Overview' },
  { id: 'features', label: 'Features', value: 'Features' },
  { id: 'prerequisites', label: 'Prerequisites', value: 'Prerequisites' },
  { id: 'installation', label: 'Installation', value: 'Installation' },
  { id: 'usage', label: 'Usage / Getting Started', value: 'Usage / Getting Started' },
];

function SubmitButton({ isGenerating, hasExistingDocs }: { isGenerating: boolean, hasExistingDocs: boolean }) {
  const buttonText = hasExistingDocs ? 'Regenerate Documentation' : 'Generate Documentation';
  const Icon = hasExistingDocs ? RefreshCw : Sparkles;

  return (
    <Button type="submit" className="w-full" disabled={isGenerating}>
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Icon className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
}

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
};

const extractRepoName = (url: string | null) => {
  if (!url) return '';
  try {
    const path = new URL(url).pathname;
    const parts = path.split('/').filter(p => p);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
    return url;
  } catch {
    return url;
  }
};


export default function Home() {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(SECTIONS.map(s => s.value));
  
  const [documentation, setDocumentation] = useState<string | null>(null);
  const [editedDocumentation, setEditedDocumentation] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<string[]>([]);
  
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setEditedDocumentation(documentation);
  }, [documentation]);
  
  const headings = useMemo(() => {
    if (!editedDocumentation) return [];
    const headingLines = editedDocumentation.match(/^##\s(.+)/gm) || [];
    return headingLines.map(line => line.replace(/^##\s/, ''));
  }, [editedDocumentation]);

  const handleCopy = () => {
    if (editedDocumentation === null) return;
    navigator.clipboard.writeText(editedDocumentation).then(() => {
      toast({
        title: 'Copied!',
        description: 'The markdown has been copied to your clipboard.',
      });
    });
  };

  const handleDownload = () => {
    if (editedDocumentation === null) return;

    const blob = new Blob([editedDocumentation], { type: 'text/markdown;charset=utf-t' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleSectionChange = (sectionValue: string, checked: boolean) => {
    setSelectedSections(prev => 
      checked ? [...prev, sectionValue] : prev.filter(s => s !== sectionValue)
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (documentation) {
      setShowConfirmationDialog(true);
    } else {
      startGeneration();
    }
  };

  const startGeneration = async () => {
    setShowConfirmationDialog(false);
    if (!formRef.current?.checkValidity()) {
        formRef.current?.reportValidity();
        return;
    }
    
    setIsGenerating(true);
    setDocumentation(null);
    setSummary(null);
    setGenerationLog([]);
    setFileTree([]);

    try {
      const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, branch, sections: selectedSections }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const boundary = "\n\n";
        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf(boundary)) !== -1) {
          const message = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + boundary.length);

          if (message.startsWith('data: ')) {
            const data = message.substring(6);
            if (data.trim() === '[DONE]') {
                continue;
            }
            try {
                const parsed = JSON.parse(data);
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.fileTree) {
                    setFileTree(parsed.fileTree);
                }
                if (parsed.documentation) {
                    setDocumentation(parsed.documentation);
                    const { summary } = await summarizeAction(parsed.documentation);
                    setSummary(summary);
                }
                if (parsed.error) {
                    throw new Error(parsed.error);
                }
            } catch (e) {
                console.error("Failed to parse stream data chunk:", data, e);
            }
          }
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const repoName = useMemo(() => extractRepoName(repoUrl), [repoUrl]);
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <AlertDialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to regenerate?</AlertDialogTitle>
            <AlertDialogDescription>
              Any manual edits you've made to the current documentation will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startGeneration}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <aside className="w-full md:w-[380px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <header className="flex items-center gap-3 px-2">
          <FileCode2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">GitDocs</h1>
        </header>

        <form 
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Repository Details</CardTitle>
              <CardDescription>Enter a public GitHub repository URL to start.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Repository URL
                  </Label>
                  <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Branch / Tag
                  </Label>
                  <Input id="branch" name="branch" placeholder="main" required value={branch} onChange={e => setBranch(e.target.value)}/>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Options
              </CardTitle>
              <CardDescription>Select the sections to include.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SECTIONS.map((section) => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={section.id} 
                    name="sections" 
                    value={section.value} 
                    checked={selectedSections.includes(section.value)}
                    onCheckedChange={(checked) => handleSectionChange(section.value, !!checked)}
                  />
                  <Label htmlFor={section.id} className="font-normal text-sm">
                    {section.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <SubmitButton isGenerating={isGenerating} hasExistingDocs={!!documentation} />
        </form>

        {summary && !isGenerating && (
          <Card className="flex-grow flex flex-col overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookText className="h-5 w-5" />
                Overview
              </CardTitle>
              <CardDescription>A summary of the generated documentation.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
            </CardContent>
          </Card>
        )}
        
        {headings.length > 0 && !isGenerating && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Navigation
              </CardTitle>
               <CardDescription>Quickly navigate the documentation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {headings.map((heading) => (
                  <li key={heading}>
                    <a
                      href={`#${slugify(heading)}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {heading}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        {isGenerating ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center p-4 max-w-md mx-auto">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Generating...</h3>
              <Card className="mt-4 text-left bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                    <ScrollArea className="h-32 w-full">
                      <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                        {generationLog.map((log, index) => (
                          <p key={index} dangerouslySetInnerHTML={{ __html: log }} />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : editedDocumentation !== null ? (
           <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
             <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <CardTitle>Documentation for <span className="text-primary">{repoName}</span></CardTitle>
                  <CardDescription>This is the generated documentation for your project.</CardDescription>
                </div>
              </CardHeader>
              <Separator/>
              <Tabs defaultValue="documentation" className="flex-1 flex flex-col overflow-hidden">
                <div className='flex justify-between items-center p-4 border-b'>
                  <TabsList>
                      <TabsTrigger value="documentation">
                        <FileText className="mr-2 h-4 w-4" />
                        Documentation
                      </TabsTrigger>
                      <TabsTrigger value="files">
                        <Files className="mr-2 h-4 w-4" />
                        Files Found ({fileTree.length})
                      </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="view-mode" className={viewMode === 'raw' ? 'text-primary' : 'text-muted-foreground'}>Raw</Label>
                      <Switch
                        id="view-mode"
                        checked={viewMode === 'preview'}
                        onCheckedChange={(checked) => setViewMode(checked ? 'preview' : 'raw')}
                      />
                      <Label htmlFor="view-mode" className={viewMode === 'preview' ? 'text-primary' : 'text-muted-foreground'}>Preview</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
                 <TabsContent value="documentation" className="flex-1 overflow-auto mt-0">
                    <div className="p-6">
                      {viewMode === 'preview' ? (
                        <div className="prose prose-invert max-w-none break-words">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h2: ({node, ...props}) => {
                                const childText = props.children && typeof props.children[0] === 'string' ? props.children[0] : '';
                                const id = slugify(childText);
                                return <h2 id={id} {...props} />;
                              },
                            }}
                          >
                            {editedDocumentation}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <Textarea
                          value={editedDocumentation}
                          onChange={(e) => setEditedDocumentation(e.target.value)}
                          className="w-full h-full min-h-full"
                          rows={1}
                        />
                      )}
                    </div>
                </TabsContent>
                <TabsContent value="files" className="flex-1 overflow-auto mt-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 text-sm">
                      <ul className="space-y-2">
                        {fileTree.map((file, index) => (
                          <li key={index} className="font-mono text-muted-foreground">{file}</li>
                        ))}
                      </ul>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Documentation Generated</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter a repository URL and branch to generate documentation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

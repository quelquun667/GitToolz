'use client';

import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, History, Copy, FileText, Terminal, RefreshCw, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

function SubmitButton({ isGenerating, hasExistingChangelog }: { isGenerating: boolean, hasExistingChangelog: boolean }) {
  const buttonText = hasExistingChangelog ? 'Regenerate Changelog' : 'Generate Changelog';
  const Icon = hasExistingChangelog ? RefreshCw : Sparkles;

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


export default function ChangelogGenerator() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [repoUrl, setRepoUrl] = useState('');
  const [startRef, setStartRef] = useState('');
  const [endRef, setEndRef] = useState('');

  const [changelog, setChangelog] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);

  const handleCopy = () => {
    if (changelog === null) return;
    navigator.clipboard.writeText(changelog).then(() => {
      toast({
        title: 'Copied!',
        description: 'The changelog has been copied to your clipboard.',
      });
    });
  };

  const handleDownload = () => {
    if (changelog === null) return;

    const blob = new Blob([changelog], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CHANGELOG-${startRef}-to-${endRef}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!formRef.current?.checkValidity()) {
        formRef.current?.reportValidity();
        return;
    }
    
    setIsGenerating(true);
    setChangelog(null);
    setGenerationLog([]);

    try {
      const response = await fetch('/api/changelog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, startRef, endRef }),
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
                if (parsed.status) {
                    setGenerationLog(prev => [...prev, parsed.status]);
                }
                if (parsed.changelog) {
                    setChangelog(parsed.changelog);
                }
                if (parsed.error) {
                    throw new Error(parsed.error);
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
  
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
      <aside className="w-full md:w-[380px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <form 
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Repository Details</CardTitle>
              <CardDescription>Enter a public GitHub repo and a range of commits (using tags, branches, or commit hashes).</CardDescription>
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
                  <Label htmlFor="startRef" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Start Ref (Tag, Branch, Commit)
                  </Label>
                  <Input id="startRef" name="startRef" placeholder="main or v1.0.0" required value={startRef} onChange={e => setStartRef(e.target.value)}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endRef" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    End Ref (Tag, Branch, Commit)
                  </Label>
                  <Input id="endRef" name="endRef" placeholder="develop or v1.1.0" required value={endRef} onChange={e => setEndRef(e.target.value)}/>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <SubmitButton isGenerating={isGenerating} hasExistingChangelog={!!changelog} />
        </form>
      </aside>
      
      <main className="flex-1 flex flex-col p-4 md:pl-0">
        {isGenerating ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center p-4 max-w-md mx-auto">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Generating Changelog...</h3>
              <Card className="mt-4 text-left bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Terminal className="h-5 w-5 text-muted-foreground mt-1"/>
                    <ScrollArea className="h-32 w-full">
                      <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                        {generationLog.map((log, index) => (
                          <p key={index}>{log}</p>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : changelog !== null ? (
           <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Changelog</CardTitle>
                  <CardDescription>From <span className="font-mono bg-muted px-1 py-0.5 rounded">{startRef}</span> to <span className="font-mono bg-muted px-1 py-0.5 rounded">{endRef}</span></CardDescription>
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
              </CardHeader>
              <div className="flex-1 overflow-auto p-6 border-t">
                  <div className="prose prose-invert max-w-none break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {changelog}
                    </ReactMarkdown>
                  </div>
              </div>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <History className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Changelog Generated</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter a repository and commit range to generate a changelog.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateDocsAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, FileCode2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const initialState: FormState = {
  documentation: null,
  summary: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Docs
        </>
      )}
    </Button>
  );
}

export default function Home() {
  const [state, formAction] = useActionState(generateDocsAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.errors) {
      const errorMessages = [
        ...(state.errors.repoUrl || []),
        ...(state.errors.branch || []),
        ...(state.errors._form || []),
      ];
      if (errorMessages.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessages.join('\n'),
        });
      }
    }
  }, [state.errors, toast]);

  const handleDownload = () => {
    if (!state.documentation) return;

    const blob = new Blob([state.documentation], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documentation.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-[380px] flex-shrink-0 border-r border-border p-4 flex flex-col gap-6">
        <header className="flex items-center gap-3 px-2">
          <FileCode2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">GitDocs</h1>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Repository Details</CardTitle>
            <CardDescription>Enter a public repository URL to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repoUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Repository URL
                </Label>
                <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Branch / Tag
                </Label>
                <Input id="branch" name="branch" placeholder="main" required />
              </div>
              <SubmitButton />
            </form>
          </CardContent>
        </Card>

        {state.summary && (
          <Card className="flex-grow flex flex-col overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookText className="h-5 w-5" />
                Outline
              </CardTitle>
              <CardDescription>A summary of the generated documentation.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.summary}</p>
            </CardContent>
          </Card>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4">
        {state.documentation ? (
          <Card className="flex-1 flex flex-col shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Documentation Preview</CardTitle>
                <CardDescription>This is the generated documentation for your project.</CardDescription>
              </div>
              <Button onClick={handleDownload} variant="outline" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                <Download className="mr-2 h-4 w-4" />
                Download Markdown
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 pt-6 overflow-auto">
                <div className="bg-muted/50 rounded-lg h-full">
                    <pre className="p-6 text-sm text-foreground h-full w-full overflow-auto whitespace-pre-wrap break-words">{state.documentation}</pre>
                </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No documentation generated</h3>
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

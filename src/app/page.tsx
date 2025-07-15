'use client';

import { useEffect, useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateDocsAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, FileCode2, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { generateDocumentationFlow } from '@/ai/flows/generate-documentation';

const initialState: FormState = {
  documentation: null,
  summary: null,
  status: null,
  errors: null,
};

function SubmitButton({ setPending, setStatus }: { setPending: (pending: boolean) => void, setStatus: (status: string | null) => void }) {
  const { pending, data } = useFormStatus();

  useEffect(() => {
    setPending(pending);
    if (!pending) {
      setStatus(null);
    }
  }, [pending, setPending, setStatus]);

  useEffect(() => {
    async function runStream() {
      if (pending && data) {
        const repoUrl = data.get('repoUrl') as string;
        const branch = data.get('branch') as string;
        if (repoUrl && branch) {
          const { stream } = generateDocumentationFlow({ repoUrl, branch });
          for await (const chunk of stream) {
            if (chunk.status) {
              setStatus(chunk.status);
            }
          }
        }
      }
    }
    runStream();
  }, [pending, data, setStatus]);

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Générer la documentation
        </>
      )}
    </Button>
  );
}

export default function Home() {
  const [state, formAction] = useActionState(generateDocsAction, initialState);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
  
  const handleCopy = () => {
    if (!state.documentation) return;
    navigator.clipboard.writeText(state.documentation).then(() => {
      toast({
        title: 'Copié !',
        description: 'Le markdown a été copié dans votre presse-papiers.',
      });
    });
  };

  const handleDownload = () => {
    if (!state.documentation) return;

    const blob = new Blob([state.documentation], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <aside className="w-full md:w-[380px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6">
        <header className="flex items-center gap-3 px-2">
          <FileCode2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">GitDocs</h1>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Détails du Dépôt</CardTitle>
            <CardDescription>Entrez l'URL d'un dépôt public pour commencer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repoUrl" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  URL du Dépôt
                </Label>
                <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Branche / Tag
                </Label>
                <Input id="branch" name="branch" placeholder="main" required />
              </div>
              <SubmitButton setPending={setPending} setStatus={setStatus} />
            </form>
          </CardContent>
        </Card>

        {state.summary && (
          <Card className="flex-grow flex flex-col overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookText className="h-5 w-5" />
                Aperçu
              </CardTitle>
              <CardDescription>Un résumé de la documentation générée.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.summary}</p>
            </CardContent>
          </Card>
        )}
      </aside>
      
      <main className="flex-1 flex flex-col p-4">
        {pending ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Génération en cours...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {status || 'Initialisation...'}
              </p>
            </div>
          </div>
        ) : state.documentation ? (
          <Card className="flex-1 flex flex-col shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Aperçu de la Documentation</CardTitle>
                <CardDescription>Ceci est la documentation générée pour votre projet.</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center space-x-2">
                  <Label htmlFor="view-mode" className={viewMode === 'raw' ? 'text-primary' : 'text-muted-foreground'}>Raw</Label>
                  <Switch
                    id="view-mode"
                    checked={viewMode === 'preview'}
                    onCheckedChange={(checked) => setViewMode(checked ? 'preview' : 'raw')}
                  />
                  <Label htmlFor="view-mode" className={viewMode === 'preview' ? 'text-primary' : 'text-muted-foreground'}>Aperçu</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    <Copy className="mr-2 h-4 w-4" />
                    Copier
                  </Button>
                  <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 pt-6 overflow-auto">
              {viewMode === 'preview' ? (
                <div className="prose prose-invert max-w-none h-full w-full overflow-auto break-words rounded-lg bg-card p-6 ring-1 ring-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {state.documentation}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm whitespace-pre-wrap break-words h-full w-full overflow-auto rounded-lg bg-card p-6 ring-1 ring-border">
                  <code>{state.documentation}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Aucune documentation générée</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Entrez l'URL d'un dépôt et une branche pour générer la documentation.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

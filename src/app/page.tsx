'use client';

import { useEffect, useActionState, useState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateDocsAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, FileCode2, Copy, Link as LinkIcon, List, Settings } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const initialState: FormState = {
  documentation: null,
  summary: null,
  repoUrl: null,
  branch: null,
  sections: null,
  errors: null,
};

const SECTIONS = [
  { id: 'toc', label: 'Table of Contents', value: 'Table of Contents' },
  { id: 'overview', label: 'Project Overview', value: 'Project Overview' },
  { id: 'features', label: 'Features', value: 'Features' },
  { id: 'prerequisites', label: 'Prerequisites', value: 'Prerequisites' },
  { id: 'installation', label: 'Installation', value: 'Installation' },
  { id: 'usage', label: 'Usage / Getting Started', value: 'Usage / Getting Started' },
];

function SubmitButton() {
  const { pending } = useFormStatus();

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
  const [state, formAction] = useActionState(generateDocsAction, initialState);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [editedDocumentation, setEditedDocumentation] = useState<string | null>(null);

  useEffect(() => {
    setEditedDocumentation(state.documentation);
  }, [state.documentation]);

  const headings = useMemo(() => {
    if (!editedDocumentation) return [];
    const headingLines = editedDocumentation.match(/^##\s(.+)/gm) || [];
    return headingLines.map(line => line.replace(/^##\s/, ''));
  }, [editedDocumentation]);

  useEffect(() => {
    if (state.errors) {
      const errorMessages = [
        ...(state.errors.repoUrl || []),
        ...(state.errors.branch || []),
        ...(state.errors.sections || []),
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
    if (editedDocumentation === null) return;
    navigator.clipboard.writeText(editedDocumentation).then(() => {
      toast({
        title: 'Copié !',
        description: 'Le markdown a été copié dans votre presse-papiers.',
      });
    });
  };

  const handleDownload = () => {
    if (editedDocumentation === null) return;

    const blob = new Blob([editedDocumentation], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const { pending } = useFormStatus();
  const isGenerating = pending;
  const repoName = useMemo(() => extractRepoName(state.repoUrl), [state.repoUrl]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
      <aside className="w-full md:w-[380px] flex-shrink-0 border-b md:border-r border-border p-4 flex flex-col gap-6 overflow-y-auto">
        <header className="flex items-center gap-3 px-2">
          <FileCode2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">GitDocs</h1>
        </header>

        <form action={formAction} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Détails du Dépôt</CardTitle>
              <CardDescription>Entrez l'URL d'un dépôt public pour commencer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    URL du Dépôt
                  </Label>
                  <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required defaultValue={state.repoUrl ?? ''}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Branche / Tag
                  </Label>
                  <Input id="branch" name="branch" placeholder="main" required defaultValue={state.branch ?? ''}/>
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
              <CardDescription>Sélectionnez les sections à inclure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SECTIONS.map((section) => (
                <div key={section.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={section.id} 
                    name="sections" 
                    value={section.value} 
                    defaultChecked={!state.sections || state.sections.includes(section.value)}
                  />
                  <Label htmlFor={section.id} className="font-normal text-sm">
                    {section.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <SubmitButton />
        </form>

        {state.summary && !isGenerating && (
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
        
        {headings.length > 0 && !isGenerating && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Navigation
              </CardTitle>
               <CardDescription>Naviguez rapidement dans la documentation.</CardDescription>
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
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Génération en cours...</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Veuillez patienter...
              </p>
            </div>
          </div>
        ) : editedDocumentation !== null ? (
          <Card className="flex-1 flex flex-col shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Documentation pour <span className="text-primary">{repoName}</span></CardTitle>
                <CardDescription>Ceci est la documentation générée pour votre projet.</CardDescription>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
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
                  className="text-sm whitespace-pre-wrap break-words w-full overflow-hidden rounded-lg bg-card p-6 ring-1 ring-border"
                  rows={1}
                />
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

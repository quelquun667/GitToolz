'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateDocsAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, FileCode2, Copy, Link as LinkIcon, List, Settings, RefreshCw } from 'lucide-react';
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

function SubmitButton({ hasExistingDocs }: { hasExistingDocs: boolean }) {
  const { pending } = useFormStatus();

  const buttonText = hasExistingDocs ? 'Regenerate Documentation' : 'Generate Documentation';
  const Icon = hasExistingDocs ? RefreshCw : Sparkles;

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
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
  const [state, formAction] = useActionState(generateDocsAction, initialState);
  const { pending } = useFormStatus();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [editedDocumentation, setEditedDocumentation] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>(SECTIONS.map(s => s.value));
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

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

  useEffect(() => {
    setEditedDocumentation(state.documentation);
    if (state.sections) {
      setSelectedSections(state.sections);
    }
  }, [state.documentation, state.sections]);
  
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
    if (state.documentation) {
      setShowConfirmationDialog(true);
    } else {
      handleConfirmRegenerate();
    }
  };

  const handleConfirmRegenerate = () => {
    setShowConfirmationDialog(false);
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      formAction(formData);
    }
  };
  
  const repoName = useMemo(() => extractRepoName(state.repoUrl), [state.repoUrl]);
  
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
            <AlertDialogAction onClick={handleConfirmRegenerate}>
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
              <CardDescription>Enter a public repository URL to start.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repoUrl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Repository URL
                  </Label>
                  <Input id="repoUrl" name="repoUrl" placeholder="https://github.com/user/repo" required defaultValue={state.repoUrl ?? ''}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch" className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Branch / Tag
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
                    onCheckedChange={(checked) => {
                      handleSectionChange(section.value, checked as boolean)
                    }}
                  />
                  <Label htmlFor={section.id} className="font-normal text-sm">
                    {section.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <SubmitButton hasExistingDocs={!!state.documentation} />
        </form>

        {state.summary && !pending && (
          <Card className="flex-grow flex flex-col overflow-hidden shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookText className="h-5 w-5" />
                Overview
              </CardTitle>
              <CardDescription>A summary of the generated documentation.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-auto">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{state.summary}</p>
            </CardContent>
          </Card>
        )}
        
        {headings.length > 0 && !pending && (
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
        {pending ? (
          <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
            <div className="text-center p-4">
              <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
              <h3 className="mt-4 text-lg font-medium">Generating...</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Please wait while the documentation is being created.
              </p>
            </div>
          </div>
        ) : editedDocumentation !== null ? (
          <Card className="flex-1 flex flex-col shadow-lg">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Documentation for <span className="text-primary">{repoName}</span></CardTitle>
                <CardDescription>This is the generated documentation for your project.</CardDescription>
              </div>
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
                  className="w-full"
                  rows={1}
                />
              )}
            </CardContent>
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

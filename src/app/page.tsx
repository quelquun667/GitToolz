'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode2, History, GitBranch, Globe, Loader2, Search, TestTube2, MessageSquarePlus, LineChart, Cpu, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AssistantView from '@/components/assistant-view';
import AnalysisView from '@/components/analysis-view';

type View = 'url-input' | 'category-selection' | 'assistants' | 'analysis';

export default function Home() {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [validatedRepoUrl, setValidatedRepoUrl] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  
  const [repoUrlError, setRepoUrlError] = useState<string | null>(null);
  const [isUrlValidating, setIsUrlValidating] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  
  const [currentView, setCurrentView] = useState<View>('url-input');

  useEffect(() => {
    if (validatedRepoUrl) {
       setCurrentView('category-selection');
       const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "Êtes-vous sûr de vouloir quitter ? Vos configurations et résultats actuels seront perdus, et vous devrez recommencer depuis la page d'accueil.";
        return event.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
        setCurrentView('url-input');
    }
  }, [validatedRepoUrl]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    setValidatedRepoUrl(null);
    setBranches([]);
    setRepoUrlError(null);
  };
  
  const handleValidateAndFetch = async () => {
    setValidatedRepoUrl(null);
    setRepoUrlError(null);
    setBranches([]);

    if (!repoUrl) {
      setRepoUrlError('Repository URL is required.');
      return;
    }
     try {
        new URL(repoUrl);
        if (!repoUrl.includes('github.com')) throw new Error();
    } catch {
        setRepoUrlError('Please enter a valid GitHub URL.');
        return;
    }

    setIsUrlValidating(true);
    
    try {
      const validateResponse = await fetch('/api/validate-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const validateResult = await validateResponse.json();
      if (!validateResponse.ok) {
        throw new Error(validateResult.error);
      }
      setRepoUrlError(null);
      
      setIsFetchingBranches(true);
      const branchesResponse = await fetch('/api/fetch-branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const branchesResult = await branchesResponse.json();
      if (branchesResult.error || !branchesResponse.ok) {
        throw new Error(branchesResult.error || 'Failed to fetch branches');
      }

      setBranches(branchesResult.branches);
      setValidatedRepoUrl(repoUrl);
      
    } catch (e: any) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      setRepoUrlError(error);
      toast({ variant: 'destructive', title: 'Validation Failed', description: error });
    } finally {
      setIsUrlValidating(false);
      setIsFetchingBranches(false);
    }
  }
  
  const renderCategorySelection = () => (
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold">What would you like to do?</h2>
            <p className="text-muted-foreground">Choose a category to get started.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                            <Cpu className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle>Assistants</CardTitle>
                            <CardDescription>AI tools to generate content and help with your tasks.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => setCurrentView('assistants')}>
                        Go to Assistants
                    </Button>
                </CardContent>
            </Card>
             <Card className="hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                            <LineChart className="h-6 w-6" />
                        </div>
                         <div>
                            <CardTitle>Analysis & Visualization</CardTitle>
                            <CardDescription>Explore your repository with graphs and stats.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => setCurrentView('analysis')}>
                        Explore
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
  );

  const renderContent = () => {
    switch (currentView) {
        case 'analysis':
             return (
                <div className="w-full max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => setCurrentView('category-selection')} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to categories
                    </Button>
                    <AnalysisView repoUrl={validatedRepoUrl!} branches={branches} />
                </div>
            );
        case 'assistants':
            return (
                <div className="w-full max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => setCurrentView('category-selection')} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to categories
                    </Button>
                    <AssistantView repoUrl={validatedRepoUrl!} branches={branches} />
                </div>
            );
        case 'category-selection':
            return renderCategorySelection();
        case 'url-input':
        default:
            return (
                 <Card className="w-full max-w-2xl mx-auto shadow-2xl">
                    <CardContent className="p-8 space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">GitToolz</h2>
                        <p className="text-muted-foreground">Enter a public GitHub repository URL to get started.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="repoUrl" className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Repository URL
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                        <Input 
                            id="repoUrl" 
                            name="repoUrl" 
                            placeholder="https://github.com/user/repo" 
                            required 
                            value={repoUrl} 
                            onChange={handleUrlChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleValidateAndFetch()}
                            className="flex-grow"
                        />
                        <Button onClick={handleValidateAndFetch} className="w-full sm:w-auto" disabled={isUrlValidating || isFetchingBranches}>
                            {(isUrlValidating || isFetchingBranches) ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Working...</>
                            ) : (
                            <><Search className="mr-2 h-4 w-4" />Continue</>
                            )}
                        </Button>
                        </div>
                        {repoUrlError && <p className="text-xs text-destructive">{repoUrlError}</p>}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-center text-lg font-medium text-foreground">
                            What can GitToolz do?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                            <div className="flex flex-col items-center space-y-2">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                                    <FileCode2 className="h-6 w-6" />
                                </div>
                                <p className="font-semibold">Generate Documentation</p>
                                <p className="text-sm text-muted-foreground">
                                    Create a complete README.md from your repository's structure and content.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                                    <History className="h-6 w-6" />
                                </div>
                                <p className="font-semibold">Create Changelogs</p>
                                <p className="text-sm text-muted-foreground">
                                    Analyze commit history to automatically generate a structured changelog.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                                    <TestTube2 className="h-6 w-6" />
                                </div>
                                <p className="font-semibold">Generate Test Cases</p>
                                <p className="text-sm text-muted-foreground">
                                    Instantly create unit tests for your functions with AI-powered analysis.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                                    <MessageSquarePlus className="h-6 w-6" />
                                </div>
                                <p className="font-semibold">Suggest Commit Messages</p>
                                <p className="text-sm text-muted-foreground">
                                    Get conventional commit suggestions based on your code changes.
                                </p>
                            </div>
                        </div>
                    </div>
                    </CardContent>
                </Card>
            );
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center">
      <header className="flex items-center justify-center gap-3 mb-8 text-center">
        <GitBranch className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">GitToolz</h1>
      </header>
      <div className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}

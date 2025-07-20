
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode2, History, GitBranch, Globe, Loader2, Search, CheckCircle2, Github, TestTube2, MessageSquarePlus } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';
import TestGenerator from '@/components/test-generator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import CommitHelper from '@/components/commit-helper';

export default function Home() {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [validatedRepoUrl, setValidatedRepoUrl] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  
  const [repoUrlError, setRepoUrlError] = useState<string | null>(null);
  const [isUrlValidating, setIsUrlValidating] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);

  // TODO: Replace with NextAuth session
  const session = null;
  const status = 'unauthenticated';
  
  useEffect(() => {
    if (validatedRepoUrl) {
      const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue = "Êtes-vous sûr de vouloir quitter ? Vos configurations et résultats actuels seront perdus, et vous devrez recommencer depuis la page d'accueil.";
        return event.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
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

  const renderWelcomeScreen = () => (
      <Card className="w-full max-w-2xl mx-auto shadow-2xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to GitToolz</h2>
            <p className="text-muted-foreground">Sign in with GitHub to access your repositories and start generating documentation.</p>
          </div>
          <Button className="w-full">
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
  )

  const renderContent = () => {
    // For now, we bypass the auth check and directly show the URL input
    // if (status !== 'authenticated' && !validatedRepoUrl) {
    //   return renderWelcomeScreen();
    // }
      
    if (validatedRepoUrl && branches.length > 0) {
      return (
        <Tabs defaultValue="documentation" className="w-full max-w-7xl mx-auto">
          <div className="flex justify-center mb-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="documentation">
                <FileCode2 className="mr-2 h-4 w-4" />
                Documentation
              </TabsTrigger>
              <TabsTrigger value="changelog">
                <History className="mr-2 h-4 w-4" />
                Changelog
              </TabsTrigger>
               <TabsTrigger value="tests">
                <TestTube2 className="mr-2 h-4 w-4" />
                Tests
              </TabsTrigger>
              <TabsTrigger value="commit-helper">
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Commit Helper
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="documentation" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
            <Card>
              <CardContent className="p-0">
                <DocumentationGenerator repoUrl={validatedRepoUrl} branches={branches} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="changelog" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
            <Card>
              <CardContent className="p-0">
                <ChangelogGenerator repoUrl={validatedRepoUrl} branches={branches} />
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="tests" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
            <Card>
              <CardContent className="p-0">
                <TestGenerator repoUrl={validatedRepoUrl} branches={branches} />
              </CardContent>
            </Card>
          </TabsContent>
           <TabsContent value="commit-helper" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
            <Card>
              <CardContent className="p-0">
                <CommitHelper repoUrl={validatedRepoUrl} branches={branches} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      );
    }
    
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
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
              </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center">
      <header className="flex items-center justify-center gap-3 mb-8 text-center">
        <FileCode2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">GitToolz</h1>
      </header>
      <div className="w-full flex-grow flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}

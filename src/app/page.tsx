'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode2, History, GitBranch, Globe, Loader2, Search, CheckCircle2, Github } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="documentation">
                <FileCode2 className="mr-2 h-4 w-4" />
                Documentation
              </TabsTrigger>
              <TabsTrigger value="changelog">
                <History className="mr-2 h-4 w-4" />
                Changelog
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="documentation">
            <Card>
              <CardContent className="p-0">
                <DocumentationGenerator repoUrl={validatedRepoUrl} branches={branches} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="changelog">
            <Card>
              <CardContent className="p-0">
                <ChangelogGenerator repoUrl={validatedRepoUrl} branches={branches} />
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


'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCode2, History, GitBranch, Globe, Loader2, Search, TestTube2, MessageSquarePlus, LineChart, Cpu, ArrowLeft, RotateCcw, GitCommitVertical, Users, Flame, MessageCircleWarning, Settings, Moon, Sun, Github, Languages, MessageSquareQuote, GitMerge, ShieldCheck, HelpCircle, PackageCheck, ShieldAlert, UserPlus, Fingerprint, Annoyed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AssistantView from '@/components/assistant-view';
import AnalysisView from '@/components/analysis-view';
import OverviewDashboard from '@/components/overview-dashboard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch';
import FeedbackButton from '@/components/feedback-button';
import { getRepoOverview, validateRepo } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type View = 'url-input' | 'overview' | 'assistants' | 'analysis';

const THEME_COLORS = [
    { name: 'Violet', value: '300 100% 29.8%' },
    { name: 'Blue', value: '221.2 83.2% 53.3%' },
    { name: 'Green', value: '142.1 76.2% 36.3%' },
    { name: 'Orange', value: '24.6 95% 53.1%' },
    { name: 'Red', value: '0 84.2% 60.2%' },
];

const assistantFeatures = [
    { icon: FileCode2, title: "Generate Documentation", description: "Create a complete README.md from your code." },
    { icon: History, title: "Create Changelogs", description: "Generate structured changelogs from commits." },
    { icon: Annoyed, title: "Write Release Notes", description: "Create user-friendly release announcements." },
    { icon: TestTube2, title: "Generate Test Cases", description: "Instantly create unit tests for your functions." },
    { icon: MessageSquarePlus, title: "Suggest Commit Messages", description: "Get conventional commit suggestions for your diffs." },
    { icon: Languages, title: "Translate Code", description: "Convert code snippets between programming languages." },
    { icon: MessageSquareQuote, title: "Generate Comments", description: "Add documentation comments to your functions." },
    { icon: UserPlus, title: "Onboarding Assistant", description: "Generate a getting-started guide for new developers." },
];

const analysisFeatures = [
    { icon: GitCommitVertical, title: "Commit Graph", description: "Visualize the commit history and branching." },
    { icon: Users, title: "Contributor Dashboard", description: "See who is contributing to the project." },
    { icon: Flame, title: "Code Hotspots", description: "Identify the most frequently changed files." },
    { icon: MessageCircleWarning, title: "Issue Analysis", description: "Get an AI-powered summary of project issues." },
    { icon: GitMerge, title: "Branch Activity", description: "View the status of all repository branches." },
    { icon: ShieldCheck, title: "Code Health", description: "Get an AI-powered analysis of your code quality." },
    { icon: PackageCheck, title: "Dependency Analysis", description: "Check for outdated or unused packages." },
    { icon: Fingerprint, title: "Regression Detective", description: "Find commits that may have introduced a bug." },
];


const FeatureList = ({ features, title, icon: TitleIcon }: { features: (typeof assistantFeatures) | (typeof analysisFeatures), title: string, icon: React.ElementType }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TitleIcon className="h-5 w-5 text-primary" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <feature.icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
);

export type OverviewStats = {
  branches?: string[];
  stars?: number;
  watchers?: number;
  openIssues?: number;
  closedIssues?: number;
  fileCount?: number;
  repoSize?: number;
  topContributors?: any[];
  languages?: Record<string, number>;
  recentActivity?: any[];
  defaultBranch?: string;
}

export default function Home() {
  const { toast } = useToast();
  const [repoUrl, setRepoUrl] = useState('');
  const [validatedRepoUrl, setValidatedRepoUrl] = useState<string | null>(null);
  
  const [repoUrlError, setRepoUrlError] = useState<string | null>(null);
  const [isUrlValidating, setIsUrlValidating] = useState(false);
  
  const [currentView, setCurrentView] = useState<View>('url-input');
  
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const [accentColor, setAccentColor] = useState(THEME_COLORS[0].value);
  
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) {
      setAccentColor(savedColor);
    }
  }, []);


  useEffect(() => {
    if (theme) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', accentColor);
    document.documentElement.style.setProperty('--ring', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);
  
  const handleReset = () => {
    setValidatedRepoUrl(null);
    setRepoUrl('');
    setRepoUrlError(null);
    setIsUrlValidating(false);
    setCurrentView('url-input');
    setOverviewStats(null);
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    if(validatedRepoUrl) {
        setValidatedRepoUrl(null);
        setRepoUrlError(null);
        setOverviewStats(null);
    }
  };
  
  const handleValidateAndFetch = async () => {
    setValidatedRepoUrl(null);
    setRepoUrlError(null);
    setOverviewStats(null);

    if (!repoUrl) {
      setRepoUrlError('Repository URL is required.');
      return;
    }

    setIsUrlValidating(true);
    
    try {
      // The API now handles all validation and fetching in one go.
      const response = await fetch('/api/validate-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
      });
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch repository data.');
      }
      
      setRepoUrlError(null);
      setOverviewStats(result);
      setValidatedRepoUrl(repoUrl);
      setCurrentView('overview');
      
    } catch (e: any) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      setRepoUrlError(error);
      toast({ variant: 'destructive', title: 'Validation Failed', description: error });
    } finally {
      setIsUrlValidating(false);
    }
  }

  const renderContent = () => {
    switch (currentView) {
        case 'analysis':
             return (
                <div className="w-full max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => setCurrentView('overview')} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Overview
                    </Button>
                    <AnalysisView repoUrl={validatedRepoUrl!} branches={overviewStats?.branches || []} />
                </div>
            );
        case 'assistants':
            return (
                <div className="w-full max-w-7xl mx-auto">
                    <Button variant="ghost" onClick={() => setCurrentView('overview')} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Overview
                    </Button>
                    <AssistantView repoUrl={validatedRepoUrl!} branches={overviewStats?.branches || []} />
                </div>
            );
        case 'overview':
            return (
                <OverviewDashboard 
                    stats={overviewStats}
                    repoUrl={validatedRepoUrl!}
                    onNavigate={(view) => setCurrentView(view)}
                />
            );
        case 'url-input':
        default:
            return (
                <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-4xl font-bold tracking-tighter">Unlock Your Repository's Potential</h2>
                        <p className="text-muted-foreground text-lg">
                            Enter a public GitHub repository URL to generate documentation, create changelogs, suggest commits, and analyze your project with powerful AI tools.
                        </p>
                        <Card className="shadow-2xl">
                            <CardContent className="p-6 space-y-4">
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
                                        <Button onClick={handleValidateAndFetch} className="w-full sm:w-auto" disabled={isUrlValidating}>
                                            {isUrlValidating ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...</>
                                            ) : (
                                                <><Search className="mr-2 h-4 w-4" />Continue</>
                                            )}
                                        </Button>
                                    </div>
                                    {repoUrlError && <p className="text-xs text-destructive">{repoUrlError}</p>}
                                </div>
                                 <Alert>
                                    <ShieldAlert className="h-4 w-4" />
                                    <AlertTitle>Public Repositories Only</AlertTitle>
                                    <AlertDescription>
                                        Currently, GitToolz only supports public repositories. Private repository support is coming soon!
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-8">
                       <FeatureList features={assistantFeatures} title="AI Assistants" icon={Cpu} />
                       <FeatureList features={analysisFeatures} title="Analysis & Visualization" icon={LineChart} />
                    </div>
                </div>
            );
    }
  };
  
  if (theme === undefined) {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <GitBranch className="h-12 w-12 text-primary animate-pulse" />
                <h1 className="text-2xl font-bold">GitToolz</h1>
                <p className="text-muted-foreground">Loading application...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center justify-center">
      <header className="w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-center relative mb-8 text-center">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex gap-2">
                <Dialog>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Settings className="h-5 w-5"/></Button>
                                </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent><p>Theme Settings</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Theme Settings</DialogTitle>
                            <DialogDescription>Customize the look and feel of the application.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between">
                                <Label>Theme</Label>
                                <div className="flex items-center gap-2">
                                    <Sun className="h-5 w-5"/>
                                    <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                                    <Moon className="h-5 w-5"/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Accent Color</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {THEME_COLORS.map(color => (
                                        <TooltipProvider key={color.name}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => setAccentColor(color.value)}
                                                        className="h-8 w-8 rounded-full border-2"
                                                        style={{ 
                                                            backgroundColor: `hsl(${color.value})`,
                                                            borderColor: accentColor === color.value ? 'hsl(var(--foreground))' : 'transparent'
                                                        }}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent><p>{color.name}</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            
            <div className="flex items-center gap-3">
                <GitBranch className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">GitToolz</h1>
            </div>

            {validatedRepoUrl && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <AlertDialog>
                    <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                aria-label="Start over"
                            >
                                <RotateCcw className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Start over with a new repository</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will clear your current repository and return you to the home screen. Any unsaved work will be lost.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleReset}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
        </div>
      </header>
      <div className="w-full flex-grow flex justify-center items-center">
        {renderContent()}
      </div>
      <footer className="w-full max-w-7xl mx-auto pt-8 mt-auto text-center text-muted-foreground">
          <div className="flex flex-wrap justify-center items-center gap-4">
              <Button variant="ghost" asChild>
                <a href="https://github.com/quelquun667/GitToolz" target="_blank" rel="noopener noreferrer">
                    <Github className="h-5 w-5" />
                    Source Code
                </a>
              </Button>
               <Button variant="ghost" asChild>
                <a href="https://github.com/quelquun667" target="_blank" rel="noopener noreferrer">
                    <Users className="h-5 w-5" />
                    My GitHub
                </a>
               </Button>
              <Button variant="ghost" asChild>
                <a href="https://discord.gg/CqEzYUh48D" target="_blank" rel="noopener noreferrer">
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current"><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4464.8245-.6667 1.2839-2.6834.0276-5.4619-.0276-8.1287 0-.2203-.4594-.4557-.9086-.6667-1.2839a.0741.0741 0 00-.0785-.0371 19.7198 19.7198 0 00-4.8851 1.5152.0699.0699 0 00-.0327.0276C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0327.0549 20.0869 20.0869 0 005.9816 1.6488.0741.0741 0 00.084-.0614c.0462-.119.086-.2382.1252-.3573a.0741.0741 0 00-.0276-.084c-1.1587-.63-2.1953-1.3934-3.0954-2.264a.0741.0741 0 01.0059-.1054c.231-.176.4713-.3572.7116-.5383a.0741.0741 0 01.084.0059c4.5428 2.8021 9.643 2.8021 14.1734 0a.0741.0741 0 01.084-.0059c.2403.1811.4806.3623.7116.5383a.0741.0741 0 01.0059.1054c-.9.8706-1.9367 1.6344-3.0954 2.264a.0741.0741 0 00-.0276.084c.0392.1191.079.2383.1252-.3573a.0741.0741 0 00.084.0614 20.0869 20.0869 0 005.9816-1.6488.0824.0824 0 00.0327-.0549c.5238-5.5657-.8316-10.112-.0992-13.688a.0699.0699 0 00-.0327-.0276zm-6.2201 9.4038c-1.4237 0-2.5834-1.21-2.5834-2.7052 0-1.4952 1.1597-2.7052 2.5834-2.7052s2.5834 1.21 2.5834 2.7052c0 1.4952-1.1597 2.7052-2.5834 2.7052zm-8.1287 0c-1.4237 0-2.5834-1.21-2.5834-2.7052 0-1.4952 1.1597-2.7052 2.5834-2.7052s2.5834 1.21 2.5834 2.7052c.0124 1.4952-1.1597 2.7052-2.5834 2.7052z"/></svg>
                    Discord
                </a>
              </Button>
          </div>
          <p className="text-xs mt-4">Built by quelquun667.</p>
      </footer>
      <FeedbackButton />
    </main>
  );
}

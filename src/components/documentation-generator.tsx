
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { getRepoTree } from '@/app/actions';
import { summarizeAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, GitBranch, Globe, Loader2, BookText, Sparkles, FileText, Copy, Link as LinkIcon, List, Settings, RefreshCw, Terminal, Files, Badge as BadgeIcon, ArrowDownToLine, ArrowUpToLine, Coffee, Twitter, Info, MessageSquare, Linkedin, Star, Search, CheckCircle2, ImageIcon, Check, ChevronsUpDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { getRepoFileContent } from '@/services/github';


const DOC_SECTIONS = [
  { id: 'toc', label: 'Table of Contents', value: 'Table of Contents' },
  { id: 'overview', label: 'Project Overview', value: 'Project Overview' },
  { id: 'features', label: 'Features', value: 'Features' },
  { id: 'prerequisites', label: 'Prerequisites', value: 'Prerequisites' },
  { id: 'installation', label: 'Installation', value: 'Installation' },
  { id: 'usage', label: 'Usage / Getting Started', value: 'Usage / Getting Started' },
];

type BadgeOption = {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
  previewUrl: string;
  placeholder?: string;
  inputType?: 'text' | 'url';
  inputLabel?: string;
};

const BADGE_OPTIONS: BadgeOption[] = [
    { id: 'stars', label: 'Stars', value: 'Stars', icon: Sparkles, previewUrl: 'https://img.shields.io/github/stars/user/repo' },
    { id: 'issues', label: 'Issues', value: 'Issues', icon: Info, previewUrl: 'https://img.shields.io/github/issues/user/repo' },
    { id: 'forks', label: 'Forks', value: 'Forks', icon: GitBranch, previewUrl: 'https://img.shields.io/github/forks/user/repo' },
    { id: 'license', label: 'License', value: 'License', icon: FileText, previewUrl: 'https://img.shields.io/github/license/user/repo' },
    { id: 'lastCommit', label: 'Last Commit', value: 'Last Commit', icon: GitBranch, previewUrl: 'https://img.shields.io/github/last-commit/user/repo' },
    { id: 'repoSize', label: 'Repo Size', value: 'Repo Size', icon: GitBranch, previewUrl: 'https://img.shields.io/github/repo-size/user/repo' },
    { id: 'starHistory', label: 'Star History Chart', value: 'Star History Chart', icon: Star, previewUrl: 'https://api.star-history.com/svg?repos=user/repo&type=Date' },
    { id: 'buymeacoffee', label: 'Buy Me A Coffee', value: 'Buy Me A Coffee', icon: Coffee, previewUrl: 'https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black', placeholder: 'your-username', inputLabel: 'Buy Me A Coffee Username', inputType: 'text'},
    { id: 'twitter', label: 'Twitter Follow', value: 'Twitter', icon: Twitter, previewUrl: 'https://img.shields.io/twitter/follow/QuelquunMe?style=social', placeholder: 'your-username', inputLabel: 'Twitter Username', inputType: 'text'},
    { id: 'discord', label: 'Discord', value: 'Discord', icon: MessageSquare, previewUrl: 'https://img.shields.io/discord/W3Qtess2m5?logo=discord&label=Discord', placeholder: 'your-invite-code', inputLabel: 'Discord Invite Code', inputType: 'text'},
    { id: 'linkedin', label: 'LinkedIn', value: 'LinkedIn', icon: Linkedin, previewUrl: 'https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white', placeholder: 'in/your-profile-name', inputLabel: 'LinkedIn Profile Path (e.g., in/your-name)', inputType: 'text'},
];


function SubmitButton({ isGenerating, hasExistingDocs, isDisabled }: { isGenerating: boolean, hasExistingDocs: boolean, isDisabled: boolean }) {
  const buttonText = hasExistingDocs ? 'Regenerate Documentation' : 'Generate Documentation';
  const Icon = hasExistingDocs ? RefreshCw : Sparkles;

  return (
    <Button type="submit" className="w-full" disabled={isGenerating || isDisabled}>
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

const extractRepoPath = (url: string | null) => {
  if (!url) return 'user/repo';
  try {
    const path = new URL(url).pathname;
    const parts = path.split('/').filter(p => p);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}/${parts[parts.length - 1].replace('.git', '')}`;
    }
    return 'user/repo';
  } catch {
    return 'user/repo';
  }
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

type DocumentationGeneratorProps = {
  repoUrl: string;
  branches: string[];
};

export default function DocumentationGenerator({ repoUrl, branches }: DocumentationGeneratorProps) {
  const { toast } = useToast();
  const [branch, setBranch] = useState('');
  
  const [selectedSections, setSelectedSections] = useState<string[]>(DOC_SECTIONS.map(s => s.value));
  const [customInstructions, setCustomInstructions] = useState('');
  const MAX_INSTRUCTIONS_LENGTH = 500;
  
  // Image State
  const [imageSource, setImageSource] = useState<'none' | 'url' | 'repo'>('none');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [imagePosition, setImagePosition] = useState<'top' | 'bottom'>('top');
  const [repoImages, setRepoImages] = useState<string[]>([]);
  const [isImageSelectorOpen, setIsImageSelectorOpen] = useState(false);
  const [tempSelectedImage, setTempSelectedImage] = useState<string>('');


  // Badge State
  const [selectedBadges, setSelectedBadges] = useState<string[]>(['Stars', 'Issues']);
  const [badgePosition, setBadgePosition] = useState<'top' | 'bottom'>('top');
  const [buyMeACoffeeUsername, setBuyMeACoffeeUsername] = useState('');
  const [twitterUsername, setTwitterUsername] = useState('');
  const [discordInviteCode, setDiscordInviteCode] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);

  const [documentation, setDocumentation] = useState<string | null>(null);
  const [editedDocumentation, setEditedDocumentation] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const [fileTree, setFileTree] = useState<string[]>([]);
  const [isFetchingTree, setIsFetchingTree] = useState(false);
  
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const isConfigurationDisabled = !branch || isFetchingTree;
  const repoPath = useMemo(() => extractRepoPath(repoUrl), [repoUrl]);

  useEffect(() => {
    // Set default branch when branches are loaded
    if (branches.length > 0) {
      if (branches.includes('main')) {
        setBranch('main');
      } else if (branches.includes('master')) {
        setBranch('master');
      } else {
        setBranch(branches[0]);
      }
    }
  }, [branches]);

  useEffect(() => {
    setEditedDocumentation(documentation);
  }, [documentation]);
  
  useEffect(() => {
      const images = fileTree.filter(path => IMAGE_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext.toLowerCase())));
      setRepoImages(images);
  }, [fileTree]);

  useEffect(() => {
    // If user switches to 'repo' and there are no images, switch back to 'none'
    if (imageSource === 'repo' && repoImages.length === 0) {
      setImageSource('none');
    }
  }, [imageSource, repoImages]);

  useEffect(() => {
    // Fetch tree when branch changes
    const fetchTree = async () => {
        if (branch && repoUrl) {
            setIsFetchingTree(true);
            setFileTree([]);
            setImagePath('');
            try {
                const result = await getRepoTree({ repoUrl, branch });
                if (result.error) {
                    throw new Error(result.error);
                }
                const tree = result.tree || [];
                setFileTree(tree);

                // Check for package.json and license
                if (tree.includes('package.json')) {
                    const content = await getRepoFileContent(repoUrl, branch, 'package.json');
                    if (content) {
                        try {
                            const pkg = JSON.parse(content);
                            if (pkg.license) {
                                setSelectedBadges(prev => {
                                    if (!prev.includes('License')) {
                                        return [...prev, 'License'];
                                    }
                                    return prev;
                                });
                            }
                        } catch (e) {
                            console.warn("Failed to parse package.json");
                        }
                    }
                }

            } catch (e) {
                const error = e instanceof Error ? e.message : 'Failed to fetch repository file tree.';
                toast({ variant: 'destructive', title: 'Error', description: error });
            } finally {
                setIsFetchingTree(false);
            }
        } else {
            setFileTree([]);
            setImagePath('');
        }
    };
    fetchTree();
  }, [branch, repoUrl, toast]);


  const headings = useMemo(() => {
    if (!editedDocumentation) return [];
    const headingLines = editedDocumentation.match(/^##\s(.+)/gm) || [];
    return headingLines.map(line => line.replace(/^##\s/, ''));
  }, [editedDocumentation]);

  const handleCopy = () => {
    if (editedDocumentation === null || isCopied) return;
    navigator.clipboard.writeText(editedDocumentation).then(() => {
      setIsCopied(true);
      toast({
        title: 'Copied!',
        description: 'The markdown has been copied to your clipboard.',
      });
      setTimeout(() => setIsCopied(false), 2000);
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
  
  const handleSectionChange = (sectionValue: string, checked: boolean) => {
    setSelectedSections(prev => 
      checked ? [...prev, sectionValue] : prev.filter(s => s !== sectionValue)
    );
  };

  const handleBadgeChange = (badgeValue: string, checked: boolean) => {
    setSelectedBadges(prev =>
      checked ? [...prev, badgeValue] : prev.filter(b => b !== badgeValue)
    );
  };
  
  const getBadgeInputValue = (badgeId: string) => {
    switch(badgeId) {
      case 'buymeacoffee': return buyMeACoffeeUsername;
      case 'twitter': return twitterUsername;
      case 'discord': return discordInviteCode;
      case 'linkedin': return linkedinProfile;
      default: return '';
    }
  }

  const setBadgeInputValue = (badgeId: string, value: string) => {
    switch(badgeId) {
      case 'buymeacoffee': setBuyMeACoffeeUsername(value); break;
      case 'twitter': setTwitterUsername(value); break;
      case 'discord': setDiscordInviteCode(value); break;
      case 'linkedin': setLinkedinProfile(value); break;
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGenerating) return;

    if (documentation) {
      setShowConfirmationDialog(true);
    } else {
      startGeneration();
    }
  };

  const startGeneration = async () => {
    setShowConfirmationDialog(false);

    if (!repoUrl || !branch) {
      toast({ variant: 'destructive', title: 'Please select a branch before generating.' });
      return;
    }
    
    setIsGenerating(true);
    setDocumentation(null);
    setEditedDocumentation(null);
    setSummary(null);
    setGenerationLog([]);

    try {
      const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
            branch,
            sections: selectedSections,
            badges: selectedBadges,
            badgePosition,
            buyMeACoffeeUsername,
            twitterUsername,
            discordInviteCode,
            linkedinProfile,
            customInstructions,
            imageSource,
            imageUrl,
            imagePath,
            imagePosition,
            fileTree: fileTree.join('\n'),
          }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

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
          buffer = lines[lines.length - 1];
        }
      };
      
      await processStream();
      setIsGenerating(false);
      setIsFinalizing(true);
      setTimeout(() => {
        setIsFinalizing(false);
      }, 1500);

    } catch (e) {
      const error = e instanceof Error ? e.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error,
      });
      setIsGenerating(false);
    }
  };

  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  
  const isGenerateDisabled = !repoUrl || !branch || isFetchingTree;

  const getRawImageUrl = (repoPath: string, branch: string, imageFilePath: string) => {
    return `https://raw.githubusercontent.com/${repoPath}/${branch}/${imageFilePath}`;
  };

  const renderMainContent = () => {
    if (isGenerating) {
      return (
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
                        <p key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-500" dangerouslySetInnerHTML={{ __html: log }} />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    if (isFinalizing) {
      return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Done!</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your documentation is ready.</p>
          </div>
        </div>
      );
    }

    if (editedDocumentation !== null) {
      return (
         <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
           <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-grow">
                <CardTitle>Documentation for <span className="text-primary">{repoPath}</span></CardTitle>
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
              </div>
               <TabsContent value="documentation" className="flex-1 flex flex-col overflow-auto mt-0">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border-b bg-muted/50">
                     <div className="flex items-center space-x-2">
                        <Label htmlFor="view-mode" className={cn("text-sm", viewMode === 'raw' ? 'text-primary' : 'text-muted-foreground')}>Raw</Label>
                        <Switch
                          id="view-mode"
                          checked={viewMode === 'preview'}
                          onCheckedChange={(checked) => setViewMode(checked ? 'preview' : 'raw')}
                        />
                        <Label htmlFor="view-mode" className={cn("text-sm", viewMode === 'preview' ? 'text-primary' : 'text-muted-foreground')}>Preview</Label>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button onClick={handleCopy} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                          {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                          {isCopied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button onClick={handleDownload} variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10 hover:text-primary">
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                  </div>
                  <ScrollArea className="flex-1">
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
                              img: ({node, src, ...props}) => {
                                if (!src) return <img {...props} alt="" />;

                                const isBadge = src.includes('shields.io') || src.includes('star-history.com');
                                if (isBadge) {
                                  // eslint-disable-next-line @next/next/no-img-element
                                  return <img src={src} {...props} alt={props.alt || ""} style={{ display: 'inline-block', margin: '0 0.25em' }} />;
                                }
                                
                                const isAbsolute = src.startsWith('http');
                                const imageUrl = isAbsolute ? src : getRawImageUrl(repoPath, branch, src);
                                
                                return <Image src={imageUrl} alt={props.alt || ''} width={800} height={400} className="rounded-md" unoptimized />;
                              }
                            }}
                          >
                            {editedDocumentation}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <Textarea
                          value={editedDocumentation}
                          onChange={(e) => setEditedDocumentation(e.target.value)}
                          className="w-full h-full min-h-full font-mono"
                          rows={1}
                        />
                      )}
                    </div>
                  </ScrollArea>
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
      );
    }
    
    return (
        <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-border/60">
          <div className="text-center p-4">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Awaiting Action</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure your options and generate the documentation.
            </p>
          </div>
        </div>
    );
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] bg-card text-foreground">
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
        <form 
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Repository Details</CardTitle>
              <CardDescription>Select the branch you want to use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="branch" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  Branch / Tag
                </Label>
                <div className="flex items-center gap-2">
                    <Select onValueChange={setBranch} value={branch} disabled={branches.length === 0 || isFetchingTree}>
                        <SelectTrigger>
                            <SelectValue placeholder={"Select a branch"} />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {isFetchingTree && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {!isConfigurationDisabled && (
            <div className="space-y-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4" data-state="open">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Options
                  </CardTitle>
                  <CardDescription>Select the sections to include.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DOC_SECTIONS.map((section) => (
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

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Project Image
                  </CardTitle>
                  <CardDescription>Add a logo or banner to the documentation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup value={imageSource} onValueChange={(value) => setImageSource(value as 'none' | 'url' | 'repo')} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="img-none"/>
                            <Label htmlFor="img-none" className="font-normal">None</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="url" id="img-url"/>
                            <Label htmlFor="img-url" className="font-normal">From URL</Label>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="repo" id="img-repo" disabled={repoImages.length === 0} />
                                  <Label htmlFor="img-repo" className={cn("font-normal", repoImages.length === 0 && "text-muted-foreground cursor-not-allowed")}>From Repository</Label>
                              </div>
                            </TooltipTrigger>
                            {repoImages.length === 0 && (
                              <TooltipContent>
                                <p>No images found in repository.</p>
                                <p className="text-xs text-muted-foreground">Select a branch to scan for images.</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                    </RadioGroup>
                    
                    {imageSource === 'url' && (
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                      </div>
                    )}
                    {imageSource === 'repo' && (
                      <div className="space-y-2">
                        <Label htmlFor="imagePath">Image Path</Label>
                        <Dialog open={isImageSelectorOpen} onOpenChange={setIsImageSelectorOpen}>
                          <DialogTrigger asChild>
                             <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {imagePath || "Select image from repository..."}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Select Repository Image</DialogTitle>
                              <DialogDescription>Click on an image to select it.</DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-96">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                {repoImages.map((path) => (
                                  <div
                                    key={path}
                                    onClick={() => setTempSelectedImage(path)}
                                    className={cn(
                                      "cursor-pointer rounded-lg border-2 p-2 hover:border-primary",
                                      tempSelectedImage === path ? "border-primary bg-primary/10" : "border-transparent"
                                    )}
                                  >
                                    <div className="relative aspect-video w-full">
                                      <Image
                                        src={getRawImageUrl(repoPath, branch, path)}
                                        alt={`Preview of ${path}`}
                                        layout="fill"
                                        objectFit="contain"
                                        className="rounded-md"
                                        unoptimized
                                      />
                                    </div>
                                    <p className="mt-2 text-xs text-center truncate font-mono">{path}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsImageSelectorOpen(false)}>Cancel</Button>
                               <Button onClick={() => {
                                setImagePath(tempSelectedImage);
                                setIsImageSelectorOpen(false);
                              }}>Done</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {imageSource !== 'none' && (
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <RadioGroup value={imagePosition} onValueChange={(value) => setImagePosition(value as 'top' | 'bottom')} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="top" id="pos-top-img"/>
                                <Label htmlFor="pos-top-img" className="font-normal flex items-center gap-1.5"><ArrowUpToLine className="h-4 w-4" /> Top</Label>
                            </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="bottom" id="pos-bottom-img"/>
                                <Label htmlFor="pos-bottom-img" className="font-normal flex items-center gap-1.5"><ArrowDownToLine className="h-4 w-4" /> Bottom</Label>
                            </div>
                        </RadioGroup>
                      </div>
                    )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Custom Instructions
                    </CardTitle>
                    <CardDescription>Provide specific instructions for the AI.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="customInstructions"
                        name="customInstructions"
                        placeholder="e.g., 'Generate the documentation in a formal tone.' or 'Focus on the installation for beginners.'"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        maxLength={MAX_INSTRUCTIONS_LENGTH}
                        className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-2">
                        {customInstructions.length} / {MAX_INSTRUCTIONS_LENGTH}
                    </p>
                </CardContent>
              </Card>
              
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Badges &amp; Visuals</CardTitle>
                  <CardDescription>Configure and add badges to your documentation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" className="w-full">
                        <BadgeIcon className="mr-2 h-4 w-4"/>
                        Configure Badges ({selectedBadges.length} selected)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure Badges &amp; Visuals</DialogTitle>
                        <DialogDescription>
                          Select items to include, provide any required info, and choose their position.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col md:flex-row gap-6 py-4">
                        <div className="w-full md:w-1/2 space-y-4">
                          <h4 className="font-medium text-foreground">Position</h4>
                          <RadioGroup value={badgePosition} onValueChange={(value) => setBadgePosition(value as 'top' | 'bottom')} className="flex gap-4">
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="top" id="pos-top"/>
                                  <Label htmlFor="pos-top" className="font-normal flex items-center gap-1.5"><ArrowUpToLine className="h-4 w-4" /> Top</Label>
                              </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="bottom" id="pos-bottom"/>
                                  <Label htmlFor="pos-bottom" className="font-normal flex items-center gap-1.5"><ArrowDownToLine className="h-4 w-4" /> Bottom</Label>
                              </div>
                          </RadioGroup>
                           <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded-md mt-2">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <p>Usernames, invite codes, and profile paths are not verified. Please ensure they are correct.</p>
                          </div>
                        </div>
                        <Separator orientation='vertical' className="h-auto hidden md:block" />
                        <Separator className="block md:hidden"/>
                        <div className="w-full md:w-1/2">
                           <h4 className="font-medium text-foreground">Available Items</h4>
                           <p className="text-xs text-muted-foreground mb-4">Previews use your entered repository. Please ensure it is public.</p>
                           <ScrollArea className="h-72">
                             <div className="space-y-4 pr-4">
                                {BADGE_OPTIONS.map((badge) => (
                                  <div key={badge.id}>
                                    <div className="flex items-center space-x-3">
                                      <Checkbox
                                        id={`badge-${badge.id}`}
                                        value={badge.value}
                                        checked={selectedBadges.includes(badge.value)}
                                        onCheckedChange={(checked) => handleBadgeChange(badge.value, !!checked)}
                                      />
                                      <Label htmlFor={`badge-${badge.id}`} className="font-normal text-sm flex-1 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <badge.icon className="h-4 w-4 text-muted-foreground" />
                                          {badge.label}
                                        </div>

                                      </Label>
                                       <Image src={badge.previewUrl.replace('user/repo', repoPath)} alt={`${badge.label} badge preview`} width={80} height={20} unoptimized className="rounded-sm"/>
                                    </div>
                                    {badge.inputLabel && selectedBadges.includes(badge.value) && (
                                      <div className="relative pl-7 mt-2">
                                        <Input
                                            type={badge.inputType || 'text'}
                                            placeholder={badge.placeholder}
                                            required={selectedBadges.includes(badge.value)}
                                            value={getBadgeInputValue(badge.id)}
                                            onChange={e => setBadgeInputValue(badge.id, e.target.value)}
                                            className="h-8"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                             </div>
                           </ScrollArea>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => setIsBadgeDialogOpen(false)}>Done</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
              
              <SubmitButton isGenerating={isGenerating} hasExistingDocs={!!documentation} isDisabled={isGenerateDisabled} />
            </div>
          )}
        </form>

        {summary && !isGenerating && !isFinalizing && (
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
        
        {headings.length > 0 && !isGenerating && !isFinalizing && (
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
        {renderMainContent()}
      </main>
    </div>
  );
}

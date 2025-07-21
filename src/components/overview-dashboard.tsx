
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Star, Eye, MessageCircleWarning, FileCode2, GitBranch, Cpu, LineChart, CheckCircle, XCircle } from 'lucide-react';
import type { OverviewStats } from '@/app/page';
import { cn } from '@/lib/utils';

type OverviewDashboardProps = {
  stats: OverviewStats | null;
  repoUrl: string;
  onNavigate: (view: 'assistants' | 'analysis') => void;
};

const StatCard = ({ title, value, icon: Icon }: { title: string; value: number | string; icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 text-sm bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
        <p className="font-bold">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const IssueChart = ({ openIssues, closedIssues }: { openIssues: number; closedIssues: number }) => {
  const data = [
    { name: 'Open', value: openIssues, color: 'hsl(var(--chart-1))' },
    { name: 'Closed', value: closedIssues, color: 'hsl(var(--chart-2))' },
  ];
  const total = openIssues + closedIssues;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Issue Distribution</CardTitle>
        <CardDescription>A breakdown of open and closed issues.</CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={40} paddingAngle={5}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">Total Issues</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
             <MessageCircleWarning className="w-8 h-8" />
            <p className="mt-2 text-sm">No issues found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function OverviewDashboard({ stats, repoUrl, onNavigate }: OverviewDashboardProps) {
  if (!stats) {
    return null;
  }

  const { stars, watchers, openIssues, closedIssues, readmeContent, fileCount, branches } = stats;

  const extractRepoPath = (url: string) => {
    try {
        const path = new URL(url).pathname.split('/').filter(p => p);
        return `${path[0]}/${path[1]}`;
    } catch {
        return 'user/repo';
    }
  }
  const repoPath = extractRepoPath(repoUrl);

  const getRawImageUrl = (branch: string, imageFilePath: string) => {
    return `https://raw.githubusercontent.com/${repoPath}/${branch}/${imageFilePath}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in-50">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Repository Dashboard</h2>
        <p className="text-muted-foreground font-mono text-sm">{repoUrl}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Stars" value={stars} icon={Star} />
        <StatCard title="Watchers" value={watchers} icon={Eye} />
        <StatCard title="Branches" value={branches.length} icon={GitBranch} />
        <StatCard title="Total Files" value={fileCount} icon={FileCode2} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <IssueChart openIssues={openIssues} closedIssues={closedIssues} />
        </div>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>README.md</CardTitle>
                <CardDescription>An overview of the project from its README file.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48 pr-4">
                    {readmeContent ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                 img: ({node, src, ...props}) => {
                                    if (!src) return <img {...props} alt="" />;
                                    const isAbsolute = src.startsWith('http');
                                    const imageUrl = isAbsolute ? src : getRawImageUrl(stats.defaultBranch, src);
                                    return <Image src={imageUrl} alt={props.alt || ''} width={400} height={200} className="rounded-md" unoptimized />;
                                  }
                            }}>
                                {readmeContent}
                            </ReactMarkdown>
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <FileCode2 className="w-8 h-8" />
                            <p className="mt-2 text-sm">No README.md found</p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>What would you like to do next?</CardTitle>
                <CardDescription>Choose a category of tools to explore this repository further.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                                <Cpu className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>AI Assistants</CardTitle>
                                <CardDescription>Generate content and help with your tasks.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => onNavigate('assistants')}>
                            Go to Assistants
                        </Button>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300">
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
                        <Button className="w-full" onClick={() => onNavigate('analysis')}>
                            Explore
                        </Button>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    </div>
  );
}

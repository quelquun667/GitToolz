
'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Star, Eye, MessageCircleWarning, FileCode2, GitBranch, Cpu, LineChart, ArrowRight, GitCommit, HardDrive, Users, Languages, Activity } from 'lucide-react';
import type { OverviewStats } from '@/app/page';
import LanguageDistributionChart from './language-distribution-chart';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';

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

const IssueChart = ({ openIssues = 0, closedIssues = 0 }: { openIssues?: number; closedIssues?: number }) => {
  const data = [
    { name: 'Open', value: openIssues, color: 'hsl(var(--chart-1))' },
    { name: 'Closed', value: closedIssues, color: 'hsl(var(--chart-2))' },
  ];
  const total = openIssues + closedIssues;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircleWarning className="h-5 w-5" /> Issues</CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={30} paddingAngle={5}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
             <MessageCircleWarning className="w-8 h-8" />
            <p className="mt-2 text-sm">No issues found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TopContributors = ({ contributors = [] }: { contributors?: any[] }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Top Contributors</CardTitle>
        </CardHeader>
        <CardContent>
            {contributors.length > 0 ? (
                <div className="space-y-4">
                    {contributors.map(c => (
                        <a href={c.html_url} key={c.login} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={c.avatar_url} alt={c.login} />
                                <AvatarFallback>{c.login.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold group-hover:text-primary">{c.login}</p>
                                <p className="text-xs text-muted-foreground">{c.contributions} commits</p>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Users className="w-8 h-8" />
                    <p className="mt-2 text-sm">No contributor data</p>
                </div>
            )}
        </CardContent>
    </Card>
);

const RecentActivityFeed = ({ activity = [] }: { activity?: any[] }) => {
    const renderEvent = (event: any) => {
        switch (event.type) {
            case 'PushEvent':
                return `Pushed ${event.payload.commits?.length || 0} commit(s)`;
            case 'PullRequestEvent':
                return `${event.payload.action} pull request #${event.payload.pull_request.number}`;
            case 'IssuesEvent':
                return `${event.payload.action} issue #${event.payload.issue.number}`;
            case 'CreateEvent':
                return `Created ${event.payload.ref_type} ${event.payload.ref || ''}`;
            case 'DeleteEvent':
                return `Deleted ${event.payload.ref_type} ${event.payload.ref}`;
            default:
                return event.type;
        }
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {activity.length > 0 ? (
                    <ScrollArea className="h-48">
                        <div className="space-y-4">
                            {activity.map(event => (
                                <div key={event.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={event.actor.avatar_url} alt={event.actor.display_login} />
                                        <AvatarFallback>{event.actor.display_login.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm">
                                            <span className="font-semibold">{event.actor.display_login}</span> {renderEvent(event)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Activity className="w-8 h-8" />
                        <p className="mt-2 text-sm">No recent activity</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function OverviewDashboard({ stats, repoUrl, onNavigate }: OverviewDashboardProps) {
  if (!stats) {
    return null;
  }

  const { stars = 0, watchers = 0, openIssues = 0, closedIssues = 0, fileCount = 0, branches = [], repoSize = 0, topContributors = [], languages = {}, recentActivity = [] } = stats;
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if(sizes[i]) {
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    return bytes + ' KB'; // GitHub API provides size in KB
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in-50">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Repository Dashboard</h2>
        <p className="text-muted-foreground font-mono text-sm">{repoUrl}</p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Stars" value={stars.toLocaleString()} icon={Star} />
            <StatCard title="Branches" value={branches.length} icon={GitBranch} />
            <StatCard title="Repo Size" value={formatBytes(repoSize)} icon={HardDrive} />
            <StatCard title="Total Files" value={fileCount.toLocaleString()} icon={FileCode2} />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <LanguageDistributionChart languages={languages} />
             <div className="space-y-4">
                <IssueChart openIssues={openIssues} closedIssues={closedIssues} />
                <TopContributors contributors={topContributors} />
             </div>
             <RecentActivityFeed activity={recentActivity} />
        </div>
      </div>
      
      <div>
        <Card className="h-full">
            <CardHeader>
                <CardTitle>What would you like to do next?</CardTitle>
                <CardDescription>Choose a category of tools to explore this repository further.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary mb-4 border border-primary/20">
                            <Cpu className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">AI Assistants</CardTitle>
                        <CardDescription>Generate content and get help with your development tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto">
                        <Button className="w-full" onClick={() => onNavigate('assistants')}>
                            Go to Assistants <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
                <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col">
                    <CardHeader>
                         <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary mb-4 border border-primary/20">
                            <LineChart className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-xl">Analysis &amp; Visualization</CardTitle>
                        <CardDescription>Explore your repository with interactive graphs and stats.</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto">
                        <Button className="w-full" onClick={() => onNavigate('analysis')}>
                            Explore Repository <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}

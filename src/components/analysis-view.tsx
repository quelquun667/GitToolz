'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitCommitVertical, Users, Flame, MessageCircleWarning } from 'lucide-react';
import CommitGraph from '@/components/commit-graph';
import ContributorDashboard from './contributor-dashboard';
import CodeHotspots from './code-hotspots';
import IssueAnalyzer from './issue-analyzer';

type AnalysisViewProps = {
  repoUrl: string;
  branches: string[];
};

export default function AnalysisView({ repoUrl, branches }: AnalysisViewProps) {
  return (
    <Tabs defaultValue="commit-graph" className="w-full">
      <div className="flex justify-center mb-4">
        <TabsList className="grid w-full max-w-3xl grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="commit-graph">
            <GitCommitVertical className="mr-2 h-4 w-4" />
            Commit Graph
          </TabsTrigger>
           <TabsTrigger value="contributors">
            <Users className="mr-2 h-4 w-4" />
            Contributors
          </TabsTrigger>
           <TabsTrigger value="hotspots">
            <Flame className="mr-2 h-4 w-4" />
            Code Hotspots
          </TabsTrigger>
           <TabsTrigger value="issues">
            <MessageCircleWarning className="mr-2 h-4 w-4" />
            Issue Analysis
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="commit-graph" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <CommitGraph repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="contributors" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <ContributorDashboard repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="hotspots" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <CodeHotspots repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="issues" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <IssueAnalyzer repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

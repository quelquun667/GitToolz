'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitCommitVertical } from 'lucide-react';
import CommitGraph from '@/components/commit-graph';

type AnalysisViewProps = {
  repoUrl: string;
  branches: string[];
};

export default function AnalysisView({ repoUrl, branches }: AnalysisViewProps) {
  return (
    <Tabs defaultValue="commit-graph" className="w-full">
      <div className="flex justify-center mb-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-1">
          <TabsTrigger value="commit-graph">
            <GitCommitVertical className="mr-2 h-4 w-4" />
            Commit Graph
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
    </Tabs>
  );
}
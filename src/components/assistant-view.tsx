
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode2, History, TestTube2, MessageSquarePlus } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';
import TestGenerator from '@/components/test-generator';
import CommitHelper from '@/components/commit-helper';

type AssistantViewProps = {
  repoUrl: string;
  branches: string[];
};

export default function AssistantView({ repoUrl, branches }: AssistantViewProps) {
  return (
    <Tabs defaultValue="documentation" className="w-full">
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
            <DocumentationGenerator repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="changelog" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <ChangelogGenerator repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="tests" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <TestGenerator repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="commit-helper" className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-top-2 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0">
        <Card>
          <CardContent className="p-0">
            <CommitHelper repoUrl={repoUrl} branches={branches} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

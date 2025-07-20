'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/responsive-tabs';
import { FileCode2, History, TestTube2, MessageSquarePlus } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';
import TestGenerator from '@/components/test-generator';
import CommitHelper from '@/components/commit-helper';

type AssistantViewProps = {
  repoUrl: string;
  branches: string[];
};

const assistantTabs = [
  {
    value: "documentation",
    label: "Documentation",
    icon: FileCode2
  },
  {
    value: "changelog",
    label: "Changelog",
    icon: History
  },
  {
    value: "tests",
    label: "Tests",
    icon: TestTube2
  },
  {
    value: "commit-helper",
    label: "Commit Helper",
    icon: MessageSquarePlus
  }
];

export default function AssistantView({ repoUrl, branches }: AssistantViewProps) {
  return (
     <ResponsiveTabs defaultValue="documentation" tabs={assistantTabs}>
        <Card className="mt-4">
          <CardContent className="p-0">
            <ResponsiveTabs.Content value="documentation">
               <DocumentationGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="changelog">
               <ChangelogGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="tests">
               <TestGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="commit-helper">
               <CommitHelper repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
          </CardContent>
        </Card>
    </ResponsiveTabs>
  );
}

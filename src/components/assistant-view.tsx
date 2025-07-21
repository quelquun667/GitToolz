
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/responsive-tabs';
import { FileCode2, History, TestTube2, MessageSquarePlus, Languages, MessageSquareQuote, Annoyed } from 'lucide-react';
import DocumentationGenerator from '@/components/documentation-generator';
import ChangelogGenerator from '@/components/changelog-generator';
import TestGenerator from '@/components/test-generator';
import CommitHelper from '@/components/commit-helper';
import CodeTranslator from './code-translator';
import CommentGenerator from './comment-generator';
import ReleaseNotesGenerator from './release-notes-generator';

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
    value: "release-notes",
    label: "Release Notes",
    icon: Annoyed,
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
  },
  {
    value: "translator",
    label: "Translator",
    icon: Languages,
  },
  {
    value: "comments",
    label: "Comments",
    icon: MessageSquareQuote,
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
            <ResponsiveTabs.Content value="release-notes">
               <ReleaseNotesGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="tests">
               <TestGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="commit-helper">
               <CommitHelper repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="translator">
              <CodeTranslator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="comments">
              <CommentGenerator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
          </CardContent>
        </Card>
    </ResponsiveTabs>
  );
}

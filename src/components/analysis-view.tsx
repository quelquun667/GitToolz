'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/responsive-tabs';
import { GitCommitVertical, Users, Flame, MessageCircleWarning } from 'lucide-react';
import CommitGraph from '@/components/commit-graph';
import ContributorDashboard from './contributor-dashboard';
import CodeHotspots from './code-hotspots';
import IssueAnalyzer from './issue-analyzer';

type AnalysisViewProps = {
  repoUrl: string;
  branches: string[];
};

const analysisTabs = [
  {
    value: "commit-graph",
    label: "Commit Graph",
    icon: GitCommitVertical
  },
  {
    value: "contributors",
    label: "Contributors",
    icon: Users
  },
  {
    value: "hotspots",
    label: "Code Hotspots",
    icon: Flame
  },
  {
    value: "issues",
    label: "Issue Analysis",
    icon: MessageCircleWarning
  }
];

export default function AnalysisView({ repoUrl, branches }: AnalysisViewProps) {
  return (
    <ResponsiveTabs defaultValue="commit-graph" tabs={analysisTabs}>
        <Card className="mt-4">
          <CardContent className="p-0">
            <ResponsiveTabs.Content value="commit-graph">
              <CommitGraph repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="contributors">
              <ContributorDashboard repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="hotspots">
              <CodeHotspots repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="issues">
              <IssueAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
          </CardContent>
        </Card>
    </ResponsiveTabs>
  );
}

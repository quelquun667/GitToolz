
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/responsive-tabs';
import { GitCommitVertical, Users, Flame, MessageCircleWarning, GitMerge, ShieldCheck, PackageCheck, Fingerprint } from 'lucide-react';
import CommitGraph from '@/components/commit-graph';
import ContributorDashboard from './contributor-dashboard';
import CodeHotspots from './code-hotspots';
import IssueAnalyzer from './issue-analyzer';
import BranchActivity from './branch-activity';
import CodeHealthAnalyzer from './code-health-analyzer';
import DependencyAnalyzer from './dependency-analyzer';
import RegressionDetective from './regression-detective';

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
  },
  {
    value: "branches",
    label: "Branch Activity",
    icon: GitMerge,
  },
  {
    value: "health",
    label: "Code Health",
    icon: ShieldCheck,
  },
  {
    value: "dependencies",
    label: "Dependencies",
    icon: PackageCheck,
  },
  {
    value: "regression",
    label: "Regression",
    icon: Fingerprint,
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
             <ResponsiveTabs.Content value="branches">
              <BranchActivity repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="health">
              <CodeHealthAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="dependencies">
              <DependencyAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="regression">
              <RegressionDetective repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
          </CardContent>
        </Card>
    </ResponsiveTabs>
  );
}

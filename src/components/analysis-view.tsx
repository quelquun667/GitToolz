
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveTabs } from '@/components/responsive-tabs';
import { GitCommitVertical, Users, Flame, MessageCircleWarning, GitMerge, ShieldCheck, PackageCheck, Fingerprint, GitCompareArrows, PackageSearch, ShieldAlert } from 'lucide-react';
import CommitGraph from '@/components/commit-graph';
import ContributorDashboard from './contributor-dashboard';
import CodeHotspots from './code-hotspots';
import IssueAnalyzer from './issue-analyzer';
import BranchActivity from './branch-activity';
import CodeHealthAnalyzer from './code-health-analyzer';
import DependencyAnalyzer from './dependency-analyzer';
import RegressionDetective from './regression-detective';
import AdvancedBranchComparator from './advanced-branch-comparator';
import GhostDependencyAnalyzer from './ghost-dependency-analyzer';
import RepositoryRiskAnalyzer from './repository-risk-analyzer';

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
    value: "branch-comparison",
    label: "Branch Comparator",
    icon: GitCompareArrows,
  },
  {
    value: "risk-analysis",
    label: "Risk Analysis",
    icon: ShieldAlert,
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
    value: "ghost-dependencies",
    label: "Ghost Dependencies",
    icon: PackageSearch,
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
             <ResponsiveTabs.Content value="branch-comparison">
              <AdvancedBranchComparator repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="risk-analysis">
              <RepositoryRiskAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="health">
              <CodeHealthAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="dependencies">
              <DependencyAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
             <ResponsiveTabs.Content value="ghost-dependencies">
              <GhostDependencyAnalyzer repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
            <ResponsiveTabs.Content value="regression">
              <RegressionDetective repoUrl={repoUrl} branches={branches} />
            </ResponsiveTabs.Content>
          </CardContent>
        </Card>
    </ResponsiveTabs>
  );
}

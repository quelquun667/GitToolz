
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-documentation.ts';
import '@/ai/flows/generate-documentation.ts';
import '@/ai/flows/generate-changelog.ts';
import '@/ai/flows/generate-test-cases.ts';
import '@/ai/flows/extract-functions-flow.ts';
import '@/ai/flows/suggest-commit-message.ts';
import '@/ai/flows/analyze-issues-flow.ts';
import '@/ai/flows/translate-code-flow.ts';
import '@/ai/flows/generate-comments-flow.ts';
import '@/ai/flows/code-health-flow.ts';
import '@/ai/flows/dependency-analyzer-flow.ts';
import '@/ai/flows/generate-release-notes-flow.ts';
import '@/ai/flows/generate-onboarding-guide-flow.ts';
import '@/ai/flows/find-regression-flow.ts';
import '@/ai/flows/advanced-branch-comparison-flow.ts';
import '@/ai/flows/ghost-dependency-analyzer-flow.ts';
import '@/ai/flows/repository-risk-analyzer-flow.ts';


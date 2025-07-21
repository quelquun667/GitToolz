
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

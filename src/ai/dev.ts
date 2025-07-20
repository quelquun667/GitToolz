
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-documentation.ts';
import '@/ai/flows/generate-documentation.ts';
import '@/ai/flows/generate-changelog.ts';
import '@/ai/flows/generate-test-cases.ts';
import '@/ai/flows/extract-functions-flow.ts';
import '@/ai/flows/suggest-commit-message.ts';
import '@/ai/flows/analyze-issues-flow.ts';


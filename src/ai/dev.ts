import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-documentation.ts';
import '@/ai/flows/generate-documentation.ts';
import '@/ai/flows/generate-changelog.ts';

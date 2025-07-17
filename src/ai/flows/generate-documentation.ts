'use server';

/**
 * @fileOverview Documentation generation flow for a Git repository.
 *
 * - generateDocumentation - A function that generates documentation for a given repository URL and branch/tag.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The type for a chunk of the streaming output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getRepoTree, getRepoFileContent } from '@/services/github';

const GenerateDocumentationInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch or tag to generate documentation from.'),
  sections: z.array(z.string()).describe('A list of sections to include in the documentation.'),
  badges: z.array(z.string()).optional().describe('A list of specific GitHub badges to include.'),
  badgePosition: z.enum(['top', 'bottom']).optional().default('top').describe('The position of the badges in the document.'),
  fileTree: z.string().optional().describe('The file tree of the repository, if fetched.'),
  fileContents: z.record(z.string()).optional().describe('A map of file paths to their content.')
});
export type GenerateDocumentationInput = z.infer<typeof GenerateDocumentationInputSchema>;

const GenerateDocumentationOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
  fileTree: z.array(z.string()).optional().describe('The file tree of the repository.'),
  documentation: z.string().optional().describe('The final generated documentation for the repository.'),
  error: z.string().optional().describe('An error message if something went wrong.'),
});
export type GenerateDocumentationOutput = z.infer<typeof GenerateDocumentationOutputSchema>;

const generateDocumentationPrompt = ai.definePrompt({
  name: 'generateDocumentationPrompt',
  input: {schema: GenerateDocumentationInputSchema},
  output: {schema: z.object({ documentation: z.string() }) },
  prompt: `You are an AI assistant that generates a high-quality README.md file for a Git repository.

  Use the following information to generate the documentation:
  - Repository URL: {{{repoUrl}}}
  - Branch/Tag: {{{branch}}}
  - Repository File Tree:
    \`\`\`
    {{{fileTree}}}
    \`\`\`
  - Content of key files:
    {{#each fileContents}}
    \`\`\`{{@key}}\`\`\`
    \`\`\`
    {{{this}}}
    \`\`\`
    {{/each}}

  The documentation MUST be structured like a professional README.md file.

  The final output MUST only contain the sections requested by the user. The sections should be in this order:
  {{#each sections}}
  - {{this}}
  {{/each}}

  If 'Table of Contents' is requested, it MUST be the first section. The table of contents should list the other requested sections of the document as clickable anchor links. For example: '[Installation](#installation)'.
  
  For each requested section, generate appropriate and comprehensive content based on the repository's file tree and the content of the key files provided.
  - For **Project Overview**: Provide a brief introduction to the project.
  - For **Features**: Create a bulleted list of key features.
  - For **Prerequisites**: List what users need to have installed to run the project (e.g., Node.js, Python). Use files like 'package.json' or 'requirements.txt' to inform this.
  - For **Installation**: Give a step-by-step guide on how to install project dependencies. Refer to the actual package manager files.
  - For **Usage / Getting Started**: Provide clear instructions and code examples on how to run the project. Look for main scripts or entry points.
  
  {{#if badges}}
  The document MUST include a section for GitHub badges. It should be placed at the {{badgePosition}} of the document.
  Use the repository URL to construct the correct URLs for the badges. For a repo like 'https://github.com/user/repo', the path is 'user/repo'.

  Generate markdown for the following requested badges, in this exact order:
  {{#each badges}}
  - {{this}}
  {{/each}}
  
  Example Badge Markdown:
  - Stars: [![GitHub stars](https://img.shields.io/github/stars/user/repo)](https://github.com/user/repo/stargazers)
  - Issues: [![GitHub issues](https://img.shields.io/github/issues/user/repo)](https://github.com/user/repo/issues)
  - Forks: [![GitHub forks](https://img.shields.io/github/forks/user/repo)](https://github.com/user/repo/network/members)
  - License: [![GitHub license](https://img.shields.io/github/license/user/repo)](https://github.com/user/repo/blob/main/LICENSE)
  - Buy Me A Coffee: [![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-yellow.svg)](https://www.buymeacoffee.com/your-username) (Use 'your-username' as a placeholder)
  - Twitter: [![Twitter Follow](https://img.shields.io/twitter/follow/your-username?style=social)](https://twitter.com/your-username) (Use 'your-username' as a placeholder)
  {{/if}}

  Use clear and concise language. Format code blocks appropriately for markdown.
  Organize the documentation into logical sections with clear headings (e.g., '## Overview').
`,
});

const KEY_FILES_TO_READ = [
  'package.json',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  'composer.json',
  'Gemfile',
  'Pipfile',
  'pyproject.toml',
  'next.config.js',
  'next.config.mjs',
  'vite.config.js',
  'vite.config.ts',
  'README.md',
  'LICENSE',
  'contributing.md',
];


export async function* generateDocumentation(
  input: GenerateDocumentationInput
): AsyncGenerator<GenerateDocumentationOutput> {
  try {
    yield { status: 'Initializing documentation generation...' };
    yield { status: `Analyzing repository: ${input.repoUrl}` };
    
    yield { status: 'Fetching file tree from GitHub...' };
    const tree = await getRepoTree(input.repoUrl, input.branch);
    const filePaths = tree.map(file => file.path);
    yield { status: 'File tree fetched successfully.', fileTree: filePaths };

    const fileContents: Record<string, string> = {};
    const filesToRead = tree
      .map(file => file.path)
      .filter(path => KEY_FILES_TO_READ.some(keyFile => path.toLowerCase().endsWith(keyFile.toLowerCase())));
      
    for (const filePath of filesToRead) {
        yield { status: `Reading file: \`${filePath}\`...` };
        try {
            const content = await getRepoFileContent(input.repoUrl, input.branch, filePath);
            if (content) {
                fileContents[filePath] = content;
            }
        } catch (e) {
            yield { status: `Could not read file: \`${filePath}\`. Skipping.` };
        }
    }

    yield { status: 'Generating content with AI...' };
    const fileTreeString = filePaths.join('\n');
    const { output } = await generateDocumentationPrompt({...input, fileTree: fileTreeString, fileContents});
    
    if (!output?.documentation) {
      throw new Error('AI failed to generate documentation content.');
    }
    
    yield { status: 'Finalizing documentation...' };
    yield { documentation: output.documentation };
    yield { status: 'Done.' };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred during generation.';
    yield { error };
  }
}


'use server';

/**
 * @fileOverview Documentation generation flow for a Git repository.
 *
 * - generateDocumentation - A function that generates documentation for a given repository URL and branch/tag.
 * - GenerateDocumentationInput - The input type for the generateDocumentation function.
 * - GenerateDocumentationOutput - The type for a chunk of the streaming output.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { getRepoFileContent } from '@/services/github';

const GenerateDocumentationInputSchema = z.object({
  repoUrl: z.string().describe('The URL of the Git repository.'),
  branch: z.string().describe('The branch or tag to generate documentation from.'),
  sections: z.array(z.string()).describe('A list of sections to include in the documentation.'),
  badges: z.array(z.string()).optional().describe('A list of specific GitHub badges to include.'),
  badgePosition: z.enum(['top', 'bottom']).optional().default('top').describe('The position of the badges in the document.'),
  buyMeACoffeeUsername: z.string().optional().describe('The username for the Buy Me A Coffee badge.'),
  twitterUsername: z.string().optional().describe('The username for the Twitter badge.'),
  discordInviteCode: z.string().optional().describe('The invite code for the Discord server badge.'),
  linkedinProfile: z.string().optional().describe('The profile path for the LinkedIn badge (e.g., in/your-name).'),
  customInstructions: z.string().optional().describe('Custom instructions to guide the AI in generating the documentation.'),
  fileTree: z.string().describe('The file tree of the repository, provided as a string.'),
  fileContents: z.record(z.string()).optional().describe('A map of file paths to their content.'),
  imageSource: z.enum(['none', 'url', 'repo']).optional().describe("The source for the project image, if any. Can be 'url' or 'repo'."),
  imageUrl: z.string().url().optional().describe("URL of the project image, if source is 'url'."),
  imagePath: z.string().optional().describe("Path to the project image in the repository, if source is 'repo'."),
  imagePosition: z.enum(['top', 'bottom']).optional().default('top').describe("Position of the project image in the document."),
});
export type GenerateDocumentationInput = z.infer<typeof GenerateDocumentationInputSchema>;

const GenerateDocumentationOutputSchema = z.object({
  status: z.string().optional().describe('The current status of the generation process.'),
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
  
  {{#if imageSource}}
  {{#ifneq imageSource "none"}}
  The user wants to include a project image.
  - Image Position: {{imagePosition}}
  {{#if (eq imageSource "url")}}
  - Image URL: {{{imageUrl}}}
  - Markdown to use: ![[Project Image]]({{{imageUrl}}})
  {{/if}}
  {{#if (eq imageSource "repo")}}
  - Image Path in Repo: {{{imagePath}}}
  - Markdown to use: ![[Project Image]]({{{imagePath}}})
  {{/if}}
  Place the image markdown at the {{imagePosition}} of the document, either before all other content or after all other content. Add two newlines after the image if it's at the top, or two newlines before if it's at the bottom.
  {{/ifneq}}
  {{/if}}
  
  The documentation MUST be structured like a professional README.md file.

  The final output MUST only contain the sections requested by the user. The sections should be in this order:
  {{#each sections}}
  - {{this}}
  {{/each}}
  
  {{#if customInstructions}}
  Please adhere to these specific additional instructions from the user:
  <instructions>
  {{{customInstructions}}}
  </instructions>
  {{/if}}

  For each requested section, generate appropriate and comprehensive content based on the repository's file tree and the content of the key files provided.
  - For **Project Overview**: Provide a brief introduction to the project.
  - For **Features**: Create a bulleted list of key features.
  - For **Prerequisites**: List what users need to have installed to run the project (e.g., Node.js, Python). Use files like 'package.json' or 'requirements.txt' to inform this.
  - For **Installation**: Give a step-by-step guide on how to install project dependencies. Refer to the actual package manager files.
  - For **Usage / Getting Started**: Provide clear instructions and code examples on how to run the project. Look for main scripts or entry points.
  
  {{#if badges}}
  The document MUST include a section for GitHub badges and visuals. It should be placed at the {{badgePosition}} of the document.
  Use the repository URL to construct the correct URLs for the badges. For a repo like 'https://github.com/user/repo', the path is 'user/repo'.

  Generate markdown for the following requested items, in this exact order:
  {{#each badges}}
  - {{this}}
  {{/each}}
  
  Example Badge/Visual Markdown:
  - Stars: [![GitHub stars](https://img.shields.io/github/stars/user/repo)](https://github.com/user/repo/stargazers)
  - Issues: [![GitHub issues](https://img.shields.io/github/issues/user/repo)](https://github.com/user/repo/issues)
  - Forks: [![GitHub forks](https://img.shields.io/github/forks/user/repo)](https://github.com/user/repo/network/members)
  - License: [![GitHub license](https://img.shields.io/github/license/user/repo)](https://github.com/user/repo/blob/main/LICENSE)
  - Last Commit: [![GitHub last commit](https://img.shields.io/github/last-commit/user/repo)](https://github.com/user/repo/commits/{{{branch}}})
  - Repo Size: [![GitHub repo size](https://img.shields.io/github/repo-size/user/repo)](https://github.com/user/repo)
  - Buy Me A Coffee: [![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/{{#if buyMeACoffeeUsername}}{{buyMeACoffeeUsername}}{{else}}your-username{{/if}})
  - Twitter: [![Follow on X](https://img.shields.io/twitter/follow/{{#if twitterUsername}}{{twitterUsername}}{{else}}your-username{{/if}}?style=social)](https://x.com/{{#if twitterUsername}}{{twitterUsername}}{{else}}your-username{{/if}})
  - Discord: [![Discord](https://img.shields.io/discord/{{#if discordInviteCode}}{{discordInviteCode}}{{else}}your-invite-code{{/if}}?logo=discord&label=Discord)](https://discord.gg/{{#if discordInviteCode}}{{discordInviteCode}}{{else}}your-invite-code{{/if}})
  - LinkedIn: [![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/{{#if linkedinProfile}}{{linkedinProfile}}{{else}}in/your-profile{{/if}})
  - Star History Chart: [![Star History Chart](https://api.star-history.com/svg?repos=user/repo&type=Date)](https://star-history.com/#user/repo&Date)
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
    
    const filePaths = input.fileTree.split('\n');
    const fileContents: Record<string, string> = {};
    const filesToRead = filePaths
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
    const { output } = await generateDocumentationPrompt({...input, fileContents});
    
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

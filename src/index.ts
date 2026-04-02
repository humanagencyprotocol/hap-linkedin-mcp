#!/usr/bin/env node
/**
 * LinkedIn MCP Server — publish posts, articles, and media to LinkedIn.
 *
 * Env vars:
 *   LINKEDIN_ACCESS_TOKEN — OAuth2 access token (required)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as api from './linkedin-api.js';

const server = new McpServer({
  name: 'linkedin-mcp',
  version: '1.0.0',
});

// ─── Tools ───────────────────────────────────────────────────────────────────

server.tool(
  'get_profile',
  'Get the authenticated LinkedIn profile (name, email, person URN)',
  {},
  async () => {
    try {
      const profile = await api.getProfile();
      return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'create_post',
  'Publish a text post to LinkedIn',
  {
    text: z.string().describe('The post content (up to 3000 characters)'),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS']).optional().describe('Post visibility (default: PUBLIC)'),
  },
  async ({ text, visibility }) => {
    try {
      const result = await api.createPost({ text, visibility });
      return { content: [{ type: 'text', text: `Post published. ID: ${result.id}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'create_article_post',
  'Publish a post with a link/article to LinkedIn',
  {
    text: z.string().describe('Commentary text for the post'),
    articleUrl: z.string().url().describe('URL of the article to share'),
    title: z.string().optional().describe('Article title'),
    description: z.string().optional().describe('Article description'),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS']).optional().describe('Post visibility (default: PUBLIC)'),
  },
  async ({ text, articleUrl, title, description, visibility }) => {
    try {
      const result = await api.createArticlePost({ text, articleUrl, title, description, visibility });
      return { content: [{ type: 'text', text: `Article post published. ID: ${result.id}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'create_image_post',
  'Publish a post with an image to LinkedIn. Provide an image URL — the image will be uploaded to LinkedIn automatically.',
  {
    text: z.string().describe('Commentary text for the post'),
    imageUrl: z.string().url().describe('URL of the image to upload and attach'),
    altText: z.string().optional().describe('Alt text for the image'),
    visibility: z.enum(['PUBLIC', 'CONNECTIONS']).optional().describe('Post visibility (default: PUBLIC)'),
  },
  async ({ text, imageUrl, altText, visibility }) => {
    try {
      const result = await api.createImagePost({ text, imageUrl, altText, visibility });
      return { content: [{ type: 'text', text: `Image post published. ID: ${result.id}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'get_post',
  'Get a LinkedIn post by its URN',
  {
    postUrn: z.string().describe('The post URN (e.g. urn:li:share:123456)'),
  },
  async ({ postUrn }) => {
    try {
      const post = await api.getPost(postUrn);
      return { content: [{ type: 'text', text: JSON.stringify(post, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'list_posts',
  'List your recent LinkedIn posts',
  {
    count: z.number().optional().describe('Number of posts to return (default: 10, max: 100)'),
  },
  async ({ count }) => {
    try {
      const posts = await api.listPosts(count);
      return { content: [{ type: 'text', text: JSON.stringify(posts, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

server.tool(
  'delete_post',
  'Delete a LinkedIn post',
  {
    postUrn: z.string().describe('The post URN to delete'),
  },
  async ({ postUrn }) => {
    try {
      await api.deletePost(postUrn);
      return { content: [{ type: 'text', text: `Post deleted: ${postUrn}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${(e as Error).message}` }], isError: true };
    }
  },
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[linkedin-mcp] server started');
}

main().catch((err) => {
  console.error('[linkedin-mcp] Fatal:', err);
  process.exit(1);
});

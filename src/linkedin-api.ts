/**
 * LinkedIn API client — Posts API (REST).
 *
 * Uses the v2 Posts API with versioned headers.
 * Access token provided via LINKEDIN_ACCESS_TOKEN env var.
 */

const API_BASE = 'https://api.linkedin.com';
const API_VERSION = '202602';

function getAccessToken(): string {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not set');
  return token;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json',
    'LinkedIn-Version': API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  personUrn: string;
}

export async function getProfile(): Promise<LinkedInProfile> {
  const res = await fetch(`${API_BASE}/v2/me`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get profile (${res.status}): ${err}`);
  }
  const data = await res.json() as { id: string; localizedFirstName: string; localizedLastName: string };
  return {
    ...data,
    personUrn: `urn:li:person:${data.id}`,
  };
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type Visibility = 'PUBLIC' | 'CONNECTIONS';

interface CreatePostParams {
  text: string;
  visibility?: Visibility;
  authorUrn?: string;
}

interface PostResponse {
  id: string;
  urn: string;
}

export async function createPost(params: CreatePostParams): Promise<PostResponse> {
  const profile = await getProfile();
  const authorUrn = params.authorUrn ?? profile.personUrn;

  const body = {
    author: authorUrn,
    commentary: params.text,
    visibility: params.visibility ?? 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create post (${res.status}): ${err}`);
  }

  // LinkedIn returns the post URN in the x-restli-id header
  const postId = res.headers.get('x-restli-id') ?? '';
  return { id: postId, urn: `urn:li:share:${postId}` };
}

// ─── Article Post ────────────────────────────────────────────────────────────

interface CreateArticlePostParams {
  text: string;
  articleUrl: string;
  title?: string;
  description?: string;
  visibility?: Visibility;
}

export async function createArticlePost(params: CreateArticlePostParams): Promise<PostResponse> {
  const profile = await getProfile();

  const body = {
    author: profile.personUrn,
    commentary: params.text,
    visibility: params.visibility ?? 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      article: {
        source: params.articleUrl,
        title: params.title,
        description: params.description,
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create article post (${res.status}): ${err}`);
  }

  const postId = res.headers.get('x-restli-id') ?? '';
  return { id: postId, urn: `urn:li:share:${postId}` };
}

// ─── Image Post ──────────────────────────────────────────────────────────────

interface CreateImagePostParams {
  text: string;
  imageUrl: string;
  altText?: string;
  visibility?: Visibility;
}

export async function createImagePost(params: CreateImagePostParams): Promise<PostResponse> {
  const profile = await getProfile();

  // Step 1: Initialize image upload
  const initRes = await fetch(`${API_BASE}/rest/images?action=initializeUpload`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: profile.personUrn,
      },
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Failed to initialize image upload (${initRes.status}): ${err}`);
  }

  const initData = await initRes.json() as {
    value: { uploadUrl: string; image: string };
  };

  // Step 2: Download image from URL and upload to LinkedIn
  const imageRes = await fetch(params.imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to download image from ${params.imageUrl}`);
  const imageBuffer = await imageRes.arrayBuffer();

  const uploadRes = await fetch(initData.value.uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Failed to upload image (${uploadRes.status}): ${err}`);
  }

  // Step 3: Create post with image URN
  const body = {
    author: profile.personUrn,
    commentary: params.text,
    visibility: params.visibility ?? 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        id: initData.value.image,
        title: params.altText ?? '',
      },
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch(`${API_BASE}/rest/posts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create image post (${res.status}): ${err}`);
  }

  const postId = res.headers.get('x-restli-id') ?? '';
  return { id: postId, urn: `urn:li:share:${postId}` };
}

// ─── Get / List / Delete ─────────────────────────────────────────────────────

export interface LinkedInPost {
  id: string;
  author: string;
  commentary: string;
  visibility: string;
  lifecycleState: string;
  createdAt: number;
}

export async function getPost(postUrn: string): Promise<LinkedInPost> {
  const res = await fetch(`${API_BASE}/rest/posts/${encodeURIComponent(postUrn)}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get post (${res.status}): ${err}`);
  }

  return await res.json() as LinkedInPost;
}

export async function listPosts(count = 10): Promise<LinkedInPost[]> {
  const profile = await getProfile();
  const authorUrn = encodeURIComponent(profile.personUrn);

  const res = await fetch(
    `${API_BASE}/rest/posts?author=${authorUrn}&q=author&count=${count}&sortBy=LAST_MODIFIED`,
    { headers: headers() },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list posts (${res.status}): ${err}`);
  }

  const data = await res.json() as { elements: LinkedInPost[] };
  return data.elements;
}

export async function deletePost(postUrn: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rest/posts/${encodeURIComponent(postUrn)}`, {
    method: 'DELETE',
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete post (${res.status}): ${err}`);
  }
}

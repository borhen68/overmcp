import db from "./db";

async function callDeepSeek(messages: { role: string; content: string }[], maxTokens = 4000) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.8,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0]?.message?.content || null;
}

export async function initBlogTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      meta_title TEXT,
      meta_description TEXT,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  createdAt: string;
}

export async function getAllPosts(limit = 50): Promise<BlogPost[]> {
  await initBlogTable();
  const result = await db.execute({
    sql: `SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map(rowToPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  await initBlogTable();
  const result = await db.execute({
    sql: `SELECT * FROM blog_posts WHERE slug = ?`,
    args: [slug],
  });

  if (result.rows.length === 0) return null;
  return rowToPost(result.rows[0]);
}

export async function getPostCount(): Promise<number> {
  await initBlogTable();
  const result = await db.execute(`SELECT COUNT(*) as count FROM blog_posts`);
  return result.rows[0].count as number;
}

function rowToPost(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    coverImage: row.cover_image as string | null,
    tags: JSON.parse((row.tags as string) || "[]"),
    metaTitle: (row.meta_title as string) || (row.title as string),
    metaDescription: (row.meta_description as string) || (row.excerpt as string),
    publishedAt: row.published_at as string,
    createdAt: row.created_at as string,
  };
}

const BLOG_TOPICS = [
  "leaked API keys in vibe-coded apps and how to detect them",
  "common security mistakes in Cursor-generated code",
  "why apps built with Bolt.new often have XSS vulnerabilities",
  "how to secure a Next.js app built with AI coding assistants",
  "the hidden dangers of vibe coding without security review",
  "API key exposure in client-side JavaScript — a growing epidemic",
  "SQL injection in AI-generated code: real examples",
  "why your Lovable.dev app might be leaking user data",
  "hardcoded secrets in v0-generated components",
  "OWASP Top 10 vulnerabilities found in vibe-coded projects",
  "how AI coding tools skip input validation",
  "the cost of a data breach for indie developers",
  "securing your SaaS before the first paying customer",
  "why dependency vulnerabilities matter in 2025",
  "AI visibility (AEO) — making your site discoverable by ChatGPT and Claude",
  "how to add llms.txt to your website for AI crawlers",
  "performance bottlenecks in AI-generated React code",
  "rate limiting and DDOS protection for indie SaaS",
  "why you need a security scanner before deploying to Vercel",
  "secrets management for solo developers and small teams",
  "CORS misconfigurations in AI-built APIs",
  "how to audit your npm dependencies for known CVEs",
  "authentication bypass vulnerabilities in vibe-coded apps",
  "the difference between security scanning and penetration testing",
  "how exposed .env files lead to complete account takeover",
  "server-side request forgery in AI-generated backend code",
  "protecting user data when you ship fast with AI tools",
  "open redirect vulnerabilities in Next.js apps",
  "why your AI-built app needs Content Security Policy headers",
  "securing webhook endpoints in your SaaS application",
];

export async function generateBlogPost(): Promise<BlogPost | null> {
  await initBlogTable();

  const existingResult = await db.execute(`SELECT title FROM blog_posts`);
  const existingTitles = existingResult.rows.map((r) => r.title as string);

  const usedTopics = existingTitles.join(", ");
  const topicPool = BLOG_TOPICS.filter(
    (t) => !existingTitles.some((title) => title.toLowerCase().includes(t.split(" ").slice(0, 3).join(" ").toLowerCase()))
  );

  const suggestedTopic = topicPool.length > 0
    ? topicPool[Math.floor(Math.random() * topicPool.length)]
    : null;

  const content = await callDeepSeek([
    {
      role: "system",
      content: `You are an expert technical content writer for OverMCP (overmcp.com), a security scanning platform for "vibe-coded" apps — apps built quickly with AI coding tools like Cursor, Bolt.new, v0, Lovable, Replit Agent, etc.

Your audience: indie developers, solopreneurs, and makers who ship fast with AI but often skip security.

Write a blog post that:
1. Is 800-1200 words
2. Targets a long-tail SEO keyword naturally
3. Provides genuine educational value (real examples, code snippets)
4. Subtly positions OverMCP as the solution (mention it once, naturally — not salesy)
5. Uses markdown formatting (## headings, code blocks, bullet points)
6. Includes a compelling meta title (under 60 chars) and meta description (under 155 chars)
7. Has a practical, actionable tone

DO NOT write about topics already covered: ${usedTopics || "none yet"}

Return valid JSON:
{
  "title": "string (compelling, SEO-friendly, under 65 chars)",
  "slug": "string (url-safe-kebab-case)",
  "excerpt": "string (1-2 sentences, hooks the reader)",
  "content": "string (full markdown article, 800-1200 words)",
  "tags": ["string", "string", "string"],
  "metaTitle": "string (under 60 chars, includes primary keyword)",
  "metaDescription": "string (under 155 chars, includes CTA)"
}`,
    },
    {
      role: "user",
      content: suggestedTopic
        ? `Write a blog post about: ${suggestedTopic}`
        : `Write a blog post about a fresh security topic relevant to vibe-coded apps that hasn't been covered yet.`,
    },
  ]);
  if (!content) return null;

  const post = JSON.parse(content);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO blog_posts (id, slug, title, excerpt, content, tags, meta_title, meta_description, published_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      post.slug,
      post.title,
      post.excerpt,
      post.content,
      JSON.stringify(post.tags || []),
      post.metaTitle || post.title,
      post.metaDescription || post.excerpt,
      now,
      now,
    ],
  });

  return {
    id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: null,
    tags: post.tags || [],
    metaTitle: post.metaTitle || post.title,
    metaDescription: post.metaDescription || post.excerpt,
    publishedAt: now,
    createdAt: now,
  };
}

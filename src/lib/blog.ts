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

const INTERNAL_LINK_TARGETS = [
  { label: "free AI app security scanner", url: "https://www.overmcp.com/" },
  { label: "security headers checker", url: "https://www.overmcp.com/tools/headers" },
  { label: "SSL certificate checker", url: "https://www.overmcp.com/tools/ssl" },
  { label: "secret leak scanner", url: "https://www.overmcp.com/tools/leak" },
  { label: "Vercel security scanner", url: "https://www.overmcp.com/connect/vercel" },
  { label: "continuous security monitoring", url: "https://www.overmcp.com/monitor" },
];

function sanitizeSlug(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function truncateMeta(value: unknown, maxLength: number) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}…`;
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

const SEO_TOPIC_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "apps",
  "built",
  "bug",
  "bugs",
  "check",
  "complete",
  "for",
  "from",
  "guide",
  "how",
  "issue",
  "issues",
  "in",
  "it",
  "known",
  "new",
  "site",
  "step",
  "steps",
  "the",
  "to",
  "vulnerabilities",
  "vulnerability",
  "website",
  "with",
  "your",
  "2025",
]);

function seoTopicKey(post: Pick<BlogPost, "title" | "slug">) {
  const normalized = `${post.title} ${post.slug}`
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/llms?\.?txt/g, "llmstxt")
    .replace(/json[\s-]?ld/g, "jsonld")
    .replace(/bolt\.?new/g, "boltnew")
    .replace(/api[\s-]?key/g, "apikey")
    .replace(/open[\s-]?redirect/g, "openredirect")
    .replace(/authentication[\s-]?bypass/g, "authbypass")
    .replace(/security[\s-]?headers?/g, "securityheaders")
    .replace(/content[\s-]?security[\s-]?policy/g, "csp")
    .replace(/pre[\s-]?launch/g, "prelaunch")
    .replace(/[^a-z0-9]+/g, " ");

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token.length > 2 && !SEO_TOPIC_STOP_WORDS.has(token));

  return Array.from(new Set(tokens)).sort().join(" ");
}

function seoTopicTokens(post: Pick<BlogPost, "title" | "slug">) {
  return new Set(seoTopicKey(post).split(" ").filter(Boolean));
}

function isSimilarSeoTopic(a: Set<string>, b: Set<string>) {
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return false;

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }

  return overlap / smaller >= 0.75;
}

export async function getSeoPosts(limit = 50): Promise<BlogPost[]> {
  const posts = await getAllPosts(Math.max(limit * 4, limit));
  const seen: Set<string>[] = [];
  const unique: BlogPost[] = [];

  for (const post of posts) {
    const tokens = seoTopicTokens(post);
    if (seen.some((existing) => isSimilarSeoTopic(existing, tokens))) continue;
    seen.push(tokens);
    unique.push(post);
    if (unique.length >= limit) break;
  }

  return unique;
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

// Each topic is shaped like a real search query (the way people actually type
// into Google / ChatGPT) and carries a distinctive `keyword` — the long-tail
// phrase the post should rank for. The keyword is used to (a) target on-page
// SEO and (b) reliably de-duplicate against already-published posts.
interface BlogTopic {
  query: string;
  keyword: string;
  cluster?: string;
  searchDemand?: number;
  intentScore?: number;
  priority?: number;
  angle?: string;
}

const BLOG_TOPICS: BlogTopic[] = [
  // --- Highest-demand, product-adjacent keywords first ---
  {
    query: "What is the best free website security checker?",
    keyword: "free website security checker",
    cluster: "website-vulnerability-scanner",
    searchDemand: 5,
    intentScore: 5,
    priority: 100,
    angle: "Compare what a security checker should test, then show a practical pre-launch scan workflow.",
  },
  {
    query: "How to scan a website for vulnerabilities for free",
    keyword: "free website vulnerability scanner",
    cluster: "website-vulnerability-scanner",
    searchDemand: 5,
    intentScore: 5,
    priority: 98,
    angle: "Focus on what free scanners can and cannot safely detect before a launch.",
  },
  {
    query: "How to check security headers online",
    keyword: "security headers checker",
    cluster: "security-headers",
    searchDemand: 5,
    intentScore: 5,
    priority: 96,
    angle: "Explain CSP, HSTS, X-Frame-Options, and what each missing header means in practice.",
  },
  {
    query: "How to check if an SSL certificate is valid",
    keyword: "ssl certificate checker",
    cluster: "ssl-checker",
    searchDemand: 5,
    intentScore: 4,
    priority: 94,
    angle: "Cover expiry, issuer, TLS protocol, mixed content, and deployment checks.",
  },
  {
    query: "How to find leaked API keys in JavaScript and GitHub",
    keyword: "api key leak scanner",
    cluster: "secret-leak-scanner",
    searchDemand: 5,
    intentScore: 5,
    priority: 92,
    angle: "Show the exact leak patterns for OpenAI, Stripe, AWS, Supabase, and Firebase keys.",
  },
  {
    query: "Next.js security checklist before production launch",
    keyword: "nextjs security checklist",
    cluster: "nextjs-security-checklist",
    searchDemand: 5,
    intentScore: 5,
    priority: 90,
    angle: "Make this a launch checklist for auth, headers, env vars, rate limiting, and data exposure.",
  },
  {
    query: "How to fix npm audit vulnerabilities safely",
    keyword: "fix npm audit vulnerabilities",
    cluster: "npm-audit",
    searchDemand: 5,
    intentScore: 4,
    priority: 88,
    angle: "Separate real exploitable dependency risk from noisy low-impact package warnings.",
  },
  {
    query: "Content Security Policy header example for Next.js",
    keyword: "content security policy next.js",
    cluster: "content-security-policy",
    searchDemand: 4,
    intentScore: 5,
    priority: 86,
    angle: "Give a safe starter CSP and explain how to avoid breaking analytics, fonts, and payments.",
  },
  {
    query: "Supabase row level security example for SaaS apps",
    keyword: "supabase row level security",
    cluster: "supabase-rls",
    searchDemand: 5,
    intentScore: 5,
    priority: 84,
    angle: "Use concrete multi-tenant SaaS examples for select/insert/update policies.",
  },
  {
    query: "Firebase security rules examples for web apps",
    keyword: "firebase security rules",
    cluster: "firebase-rules",
    searchDemand: 5,
    intentScore: 5,
    priority: 82,
    angle: "Show unsafe public rules, then corrected per-user and per-team access rules.",
  },
  {
    query: "JWT security best practices for web apps",
    keyword: "jwt security best practices",
    cluster: "jwt-security",
    searchDemand: 5,
    intentScore: 4,
    priority: 80,
    angle: "Focus on token storage, expiry, refresh rotation, audience checks, and common AI-code mistakes.",
  },
  {
    query: "How to prevent XSS in React and Next.js apps",
    keyword: "prevent xss next.js",
    cluster: "xss-prevention",
    searchDemand: 5,
    intentScore: 5,
    priority: 78,
    angle: "Use React/Next.js examples for dangerous HTML, markdown rendering, URL sanitization, and CSP.",
  },
  {
    query: "How to prevent SQL injection in API routes",
    keyword: "prevent sql injection",
    cluster: "sql-injection",
    searchDemand: 5,
    intentScore: 5,
    priority: 76,
    angle: "Show vulnerable string interpolation and safe parameterized queries.",
  },
  {
    query: "How to fix CORS errors without creating a security bug",
    keyword: "cors security misconfiguration",
    cluster: "cors-security",
    searchDemand: 5,
    intentScore: 4,
    priority: 74,
    angle: "Target the common high-volume CORS error search but teach safe allowlists instead of wildcard fixes.",
  },
  {
    query: "What to do if your OpenAI API key is leaked",
    keyword: "leaked openai api key",
    cluster: "openai-key-leak",
    searchDemand: 5,
    intentScore: 5,
    priority: 72,
    angle: "Give an emergency rotation and blast-radius checklist for exposed AI API keys.",
  },
  { query: "How do I find leaked API keys in a Next.js app?", keyword: "find leaked api keys" },
  { query: "Is code generated by Cursor secure?", keyword: "is cursor code secure" },
  { query: "How to fix XSS vulnerabilities in a Bolt.new app", keyword: "bolt.new xss vulnerability" },
  { query: "How to secure a Next.js app built with AI coding tools", keyword: "secure ai-generated next.js app" },
  { query: "Is v0 (Vercel) generated code safe to deploy?", keyword: "is v0 code safe" },
  { query: "How to scan a website for vulnerabilities for free", keyword: "free website vulnerability scanner" },
  { query: "How to find exposed secrets in client-side JavaScript", keyword: "exposed secrets in javascript" },
  { query: "How to prevent SQL injection in AI-generated code", keyword: "prevent sql injection ai code" },
  { query: "Is my Lovable.dev app leaking user data?", keyword: "lovable.dev data leak" },
  { query: "How to remove hardcoded secrets from v0 components", keyword: "hardcoded secrets v0" },
  { query: "OWASP Top 10 checklist for vibe-coded apps", keyword: "owasp top 10 vibe coding" },
  { query: "How to add input validation to AI-generated code", keyword: "input validation ai code" },
  { query: "Security checklist before launching a SaaS", keyword: "saas security checklist" },
  { query: "How to check npm dependencies for known CVEs", keyword: "check npm dependencies cve" },
  { query: "How to make your website appear in ChatGPT and Claude", keyword: "appear in chatgpt and claude" },
  { query: "How to add an llms.txt file to your website", keyword: "add llms.txt file" },
  { query: "What is Answer Engine Optimization (AEO)?", keyword: "what is answer engine optimization" },
  { query: "How to improve Core Web Vitals in a Next.js app", keyword: "improve core web vitals next.js" },
  { query: "How to add rate limiting to an indie SaaS API", keyword: "rate limiting saas api" },
  { query: "Do I need a security scan before deploying to Vercel?", keyword: "security scan before vercel deploy" },
  { query: "How should solo developers manage secrets and env vars?", keyword: "secrets management solo developer" },
  { query: "How to fix CORS misconfigurations in an API", keyword: "fix cors misconfiguration" },
  { query: "How to spot authentication bypass bugs in your app", keyword: "authentication bypass vulnerability" },
  { query: "Security scanning vs penetration testing: what's the difference?", keyword: "security scanning vs pentesting" },
  { query: "How an exposed .env file leads to account takeover", keyword: "exposed .env file risk" },
  { query: "How to prevent SSRF in AI-generated backend code", keyword: "prevent ssrf vulnerability" },
  { query: "How to add Content Security Policy headers to a Next.js app", keyword: "content security policy next.js" },
  { query: "How to secure webhook endpoints in a SaaS app", keyword: "secure webhook endpoints" },
  { query: "How to fix open redirect vulnerabilities in Next.js", keyword: "open redirect next.js" },
  { query: "Why AI coding tools skip security (and how to catch it)", keyword: "ai coding tools security risks" },

  // --- Per-tool security guides (capture every "is X safe / secure X" search) ---
  { query: "Is Replit Agent generated code secure?", keyword: "is replit agent code secure" },
  { query: "Is Windsurf (Codeium) generated code safe to ship?", keyword: "is windsurf code safe" },
  { query: "Are ChatGPT-generated apps secure?", keyword: "chatgpt generated app security" },
  { query: "Is code from Claude artifacts safe to deploy?", keyword: "claude artifacts security" },
  { query: "How to secure a Base44 app", keyword: "base44 app security" },
  { query: "How to secure a Replit-hosted app", keyword: "replit app security" },
  { query: "How to secure an app built with GitHub Copilot", keyword: "github copilot code security" },

  // --- Provider-specific secret leaks (high commercial intent) ---
  { query: "How to find a leaked Supabase service_role key", keyword: "leaked supabase service role key" },
  { query: "How to find a leaked Stripe secret key in your code", keyword: "leaked stripe secret key" },
  { query: "How to find a leaked OpenAI API key", keyword: "leaked openai api key" },
  { query: "How to fix an exposed Firebase API key", keyword: "exposed firebase api key" },
  { query: "What to do when your AWS access key is leaked", keyword: "leaked aws access key" },

  // --- Platform security configuration ---
  { query: "How to set up Supabase Row Level Security correctly", keyword: "supabase row level security" },
  { query: "How to write secure Firebase security rules", keyword: "firebase security rules" },
  { query: "How to store secrets safely in Vercel environment variables", keyword: "vercel environment variables secrets" },
  { query: "How to add authentication to a Next.js app the right way", keyword: "nextjs authentication best practices" },
  { query: "How to secure a Netlify-deployed site", keyword: "netlify site security" },

  // --- More OWASP / vulnerability classes ---
  { query: "What is IDOR and how do I fix it in my app?", keyword: "idor vulnerability fix" },
  { query: "How to prevent mass assignment vulnerabilities", keyword: "mass assignment vulnerability" },
  { query: "How to securely handle JWT tokens in a web app", keyword: "jwt security best practices" },
  { query: "How to prevent CSRF attacks in a SaaS app", keyword: "prevent csrf attack" },
  { query: "How to prevent path traversal vulnerabilities", keyword: "path traversal vulnerability" },
  { query: "What is prompt injection and how do I defend against it?", keyword: "prompt injection defense" },
  { query: "How to securely store passwords (hashing done right)", keyword: "secure password hashing" },
  { query: "How to prevent broken access control in your API", keyword: "broken access control fix" },

  // --- AEO / GEO (answer & generative engine optimization) ---
  { query: "How to rank in Google AI Overviews", keyword: "rank in google ai overviews" },
  { query: "How to get cited by Perplexity AI", keyword: "get cited by perplexity" },
  { query: "What is Generative Engine Optimization (GEO)?", keyword: "what is generative engine optimization" },
  { query: "How to add structured data (JSON-LD) to a Next.js site", keyword: "json-ld structured data nextjs" },
  { query: "robots.txt vs llms.txt: what's the difference?", keyword: "robots.txt vs llms.txt" },
  { query: "How to make your docs easy for AI to cite", keyword: "ai citable content" },

  // --- Commercial-intent comparisons & alternatives ---
  { query: "Snyk vs OverMCP: which security scanner should you use?", keyword: "snyk alternative vibe coding" },
  { query: "Best security scanners for indie hackers in 2025", keyword: "best security scanner indie hackers" },
  { query: "Free vs paid website security scanners compared", keyword: "free vs paid security scanner" },
  { query: "Semgrep vs automated AI security scanning", keyword: "semgrep alternative" },
  { query: "How much does a security audit cost for a small SaaS?", keyword: "saas security audit cost" },

  // --- Practical how-to (long-tail, high volume) ---
  { query: "How to check if my website has been hacked", keyword: "check if website hacked" },
  { query: "How to do a security audit of your own website", keyword: "diy website security audit" },
  { query: "How to add security headers to a Vercel deployment", keyword: "security headers vercel" },
  { query: "How to scan a GitHub repo for secrets", keyword: "scan github repo for secrets" },
  { query: "How to fix npm audit vulnerabilities", keyword: "fix npm audit vulnerabilities" },
  { query: "How to set up a Content Security Policy without breaking your site", keyword: "content security policy setup" },
  { query: "How to handle a data breach as a solo founder", keyword: "data breach response solo founder" },
  { query: "Pre-launch security checklist for AI-built MVPs", keyword: "pre-launch security checklist mvp" },
];

const HIGH_DEMAND_TERMS = [
  "scanner",
  "checker",
  "free",
  "best",
  "nextjs",
  "api key",
  "openai",
  "stripe",
  "aws",
  "supabase",
  "firebase",
  "npm audit",
  "jwt",
  "xss",
  "sql injection",
  "cors",
  "ssl",
  "security headers",
  "content security policy",
  "owasp",
];

const BUYING_INTENT_TERMS = [
  "scanner",
  "checker",
  "scan",
  "audit",
  "fix",
  "leaked",
  "secure",
  "best",
  "free",
  "before production",
  "before launch",
];

function normalizeTopicText(value: string) {
  return value
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/llms?\.?txt/g, "llmstxt")
    .replace(/json[\s-]?ld/g, "jsonld")
    .replace(/bolt\.?new/g, "boltnew")
    .replace(/api[\s-]?key/g, "api key")
    .replace(/open[\s-]?redirect/g, "openredirect")
    .replace(/authentication[\s-]?bypass/g, "authbypass");
}

function keywordTokens(value: string) {
  return normalizeTopicText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !SEO_TOPIC_STOP_WORDS.has(token));
}

function topicAlreadyCovered(topic: BlogTopic, existingEntries: string[]) {
  const topicNeedles = [
    topic.keyword,
    topic.cluster || "",
    ...keywordTokens(topic.keyword),
  ].filter(Boolean);

  return existingEntries.some((entry) => {
    const normalizedEntry = normalizeTopicText(entry);
    if (topic.cluster && normalizedEntry.includes(normalizeTopicText(topic.cluster))) return true;
    if (normalizedEntry.includes(normalizeTopicText(topic.keyword))) return true;

    const tokens = keywordTokens(topic.keyword);
    if (tokens.length === 0) return false;

    const matched = tokens.filter((token) => normalizedEntry.includes(token)).length;
    const coverage = matched / tokens.length;
    const hasSpecificNeedle = topicNeedles.some((needle) => {
      const normalizedNeedle = normalizeTopicText(needle);
      return normalizedNeedle.length > 4 && normalizedEntry.includes(normalizedNeedle);
    });

    return coverage >= 0.78 && (hasSpecificNeedle || tokens.length <= 3);
  });
}

function scoreTopic(topic: BlogTopic) {
  const text = normalizeTopicText(`${topic.query} ${topic.keyword}`);
  const demandBoost = HIGH_DEMAND_TERMS.filter((term) => text.includes(term)).length * 8;
  const intentBoost = BUYING_INTENT_TERMS.filter((term) => text.includes(term)).length * 10;
  const longTailBoost = Math.max(0, 6 - keywordTokens(topic.keyword).length) * 2;

  return (
    (topic.priority || 0) +
    (topic.searchDemand || 3) * 20 +
    (topic.intentScore || 3) * 15 +
    demandBoost +
    intentBoost +
    longTailBoost
  );
}

function getCandidateTopics() {
  const raw = process.env.SEO_KEYWORDS_JSON;
  if (!raw) return BLOG_TOPICS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BLOG_TOPICS;

    const externalTopics: BlogTopic[] = parsed
      .map((item) => ({
        query: String(item.query || item.keyword || "").trim(),
        keyword: String(item.keyword || item.query || "").trim().toLowerCase(),
        cluster: item.cluster ? String(item.cluster) : undefined,
        searchDemand: Number(item.searchDemand || item.volumeTier || item.volume || 5),
        intentScore: Number(item.intentScore || item.intent || 5),
        priority: Number(item.priority || 200),
        angle: item.angle ? String(item.angle) : undefined,
      }))
      .filter((item) => item.query && item.keyword);

    return [...externalTopics, ...BLOG_TOPICS];
  } catch {
    return BLOG_TOPICS;
  }
}

// When the curated BLOG_TOPICS pool is exhausted, ask the model to invent a
// fresh, specific, non-duplicate search query + primary keyword. This keeps the
// generation engine supplied indefinitely no matter how high the daily count is.
async function generateFreshTopic(existing: string[]): Promise<BlogTopic | null> {
  const content = await callDeepSeek(
    [
      {
        role: "system",
        content: `You are an SEO/AEO strategist for OverMCP (overmcp.com), a security scanner for "vibe-coded" apps built with AI tools (Cursor, Bolt.new, v0, Lovable, Replit Agent, Windsurf, GitHub Copilot, Claude, etc.).

Invent ONE fresh, highly specific, long-tail blog topic that real indie developers actually search on Google or ask ChatGPT/Perplexity. It must concern security, SEO, AEO/GEO, performance, dependency CVEs, or safe deployment of AI-built apps. It needs clear search intent and a distinctive primary keyword.

Prefer keywords with either high product intent ("scanner", "checker", "fix", "leaked", "audit", "best", "free") or broad evergreen demand (Next.js security, API keys, XSS, SQL injection, JWT, CORS, Firebase rules, Supabase RLS, security headers, SSL, npm audit).

Return ONLY valid JSON:
{
  "query": "the exact natural-language search query a user would type",
  "keyword": "the distinctive long-tail primary keyword, lowercase, 2-6 words"
}`,
      },
      {
        role: "user",
        content: `Do NOT repeat or pick anything semantically similar to these already-covered topics:\n${
          existing.length ? existing.join("\n") : "none yet"
        }`,
      },
    ],
    400
  );
  if (!content) return null;
  try {
    const t = JSON.parse(content);
    if (t.query && t.keyword) {
      return { query: String(t.query), keyword: String(t.keyword) };
    }
  } catch {
    /* malformed JSON — caller falls back to the generic prompt */
  }
  return null;
}

export async function generateBlogPost(): Promise<BlogPost | null> {
  await initBlogTable();

  const existingResult = await db.execute(`SELECT title, slug FROM blog_posts`);
  const existingTitles = existingResult.rows.map((r) => r.title as string);
  const existingEntries = existingResult.rows.map(
    (r) => `${r.title as string} ${r.slug as string}`
  );

  const usedTopics = existingTitles.join(", ");
  const topicPool = getCandidateTopics()
    .filter((t) => !topicAlreadyCovered(t, existingEntries))
    .sort((a, b) => scoreTopic(b) - scoreTopic(a));

  // Prefer the highest-scored, vetted topic. Once the pool is drained, fall back
  // to AI-invented fresh topics so a high daily count never starves the engine.
  let suggestedTopic: BlogTopic | null = topicPool[0] || null;

  if (!suggestedTopic) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const fresh = await generateFreshTopic(existingTitles);
      if (fresh && !topicAlreadyCovered(fresh, existingEntries)) {
        suggestedTopic = fresh;
        break;
      }
    }
  }

  const content = await callDeepSeek([
    {
      role: "system",
      content: `You are an expert technical content writer for OverMCP (overmcp.com), a security scanning platform for "vibe-coded" apps — apps built quickly with AI coding tools like Cursor, Bolt.new, v0, Lovable, Replit Agent, etc.

Your audience: indie developers, solopreneurs, and makers who ship fast with AI but often skip security.

Write a blog post that:
1. Is 1200-1700 words
2. Directly and completely ANSWERS the search query it targets with non-commodity, experience-rich guidance
3. Places the PRIMARY KEYWORD verbatim in: the title, the first 100 words, and at least one ## heading — naturally, never stuffed
4. Opens with a "## Quick answer" section: 2-3 concise sentences that answer the query in a way Google AI Overviews, ChatGPT, Claude, and Perplexity can quote
5. Includes a "## What to check first" section with a concrete checklist
6. Includes a "## Step-by-step fix" section with specific actions and at least one realistic code/config snippet when relevant
7. Includes a "## Common mistakes" section that explains what fast AI-built apps usually get wrong
8. Includes 3-5 natural internal links using markdown link syntax. Pick only relevant links from this list: ${INTERNAL_LINK_TARGETS.map((l) => `[${l.label}](${l.url})`).join(", ")}
9. Subtly positions OverMCP as the solution once or twice, naturally — not salesy
10. Uses markdown: ## headings, ### subheadings, code blocks, bullet/numbered lists
11. ENDS with a "## FAQ" section containing 3 question/answer pairs (### Question then a short answer)
12. Includes a compelling meta title (under 60 chars) and meta description (under 155 chars), both containing the primary keyword
13. Does not invent statistics, fake benchmark numbers, fake citations, or fake customer stories. If you are not certain, explain the concept without a number.
14. Must feel clearly different from every existing post title listed below. Use a unique angle, examples, structure, and code/config snippet.

DO NOT write about topics already covered: ${usedTopics || "none yet"}

Return valid JSON:
{
  "title": "string (compelling, SEO-friendly, under 65 chars, contains the primary keyword)",
  "slug": "string (url-safe-kebab-case, derived from the primary keyword)",
  "excerpt": "string (1-2 sentences, hooks the reader, contains the primary keyword)",
  "content": "string (full markdown article, 1200-1700 words, ends with a ## FAQ section)",
  "tags": ["string", "string", "string"],
  "metaTitle": "string (under 60 chars, includes primary keyword)",
  "metaDescription": "string (under 155 chars, includes CTA)"
}`,
    },
    {
      role: "user",
      content: suggestedTopic
        ? `Write a blog post that answers this exact search query: "${suggestedTopic.query}"
The PRIMARY KEYWORD to target is: "${suggestedTopic.keyword}"
Estimated search demand tier: ${suggestedTopic.searchDemand || "medium-high"}/5
Search intent score: ${suggestedTopic.intentScore || "medium-high"}/5
Unique angle to use: ${suggestedTopic.angle || "Give a practical, developer-first workflow with examples specific to AI-built web apps."}`
        : `Write a blog post about a fresh security topic relevant to vibe-coded apps that hasn't been covered yet.`,
    },
  ]);
  if (!content) return null;

  const post = JSON.parse(content);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = sanitizeSlug(post.slug || post.title);
  if (!slug) return null;
  const existingSlug = await db.execute({
    sql: `SELECT 1 FROM blog_posts WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  if (existingSlug.rows.length > 0) return null;

  const title = truncateMeta(post.title, 80);
  const excerpt = truncateMeta(post.excerpt, 220);
  const metaTitle = truncateMeta(post.metaTitle || post.title, 60);
  const metaDescription = truncateMeta(post.metaDescription || post.excerpt, 155);
  const tags = Array.isArray(post.tags)
    ? post.tags.map((tag: unknown) => String(tag).trim()).filter(Boolean).slice(0, 5)
    : [];

  await db.execute({
    sql: `INSERT INTO blog_posts (id, slug, title, excerpt, content, tags, meta_title, meta_description, published_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      slug,
      title,
      excerpt,
      post.content,
      JSON.stringify(tags),
      metaTitle,
      metaDescription,
      now,
      now,
    ],
  });

  return {
    id,
    slug,
    title,
    excerpt,
    content: post.content,
    coverImage: null,
    tags,
    metaTitle,
    metaDescription,
    publishedAt: now,
    createdAt: now,
  };
}

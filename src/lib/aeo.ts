import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface AEOResult {
  score: number; // 0-100 how visible to AI
  issues: {
    category: string;
    issue: string;
    fix: string;
    impact: "critical" | "high" | "medium" | "low";
    fixedCode?: string;
  }[];
  recommendations: {
    title: string;
    description: string;
    priority: "must-have" | "important" | "nice-to-have";
    code?: string;
  }[];
  generatedFiles: {
    filename: string;
    content: string;
    purpose: string;
  }[];
}

export async function analyzeAEO(
  files: { name: string; content: string }[],
  siteUrl?: string
): Promise<AEOResult> {
  const filesContent = files
    .map((f) => `--- FILE: ${f.name} ---\n${f.content}\n`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are an expert in AEO (Answer Engine Optimization) — making websites visible and correctly represented by AI systems like ChatGPT, Claude, Perplexity, and Google AI Overviews.

AI systems discover and understand websites through:
1. **Structured Data (JSON-LD)** — Schema.org markup that AI can parse
2. **llms.txt** — A plain-text file at /llms.txt that tells AI about the site (like robots.txt for AI)
3. **Clear semantic HTML** — Headings, sections, and content that AI can extract meaning from
4. **Meta descriptions & OG tags** — AI reads these for context
5. **FAQ sections** — Structured Q&A that AI can directly quote
6. **sitemap.xml** — Helps AI discover all pages
7. **Content structure** — Clear, scannable content with H2/H3 hierarchy
8. **API/Programmatic access** — APIs that AI tools can use to get data
9. **Citation-friendly content** — Content formatted so AI can quote it with attribution
10. **robots.txt AI directives** — Allowing/managing AI crawler access (GPTBot, ClaudeBot, etc.)

Analyze the provided code and return JSON:
{
  "score": number (0-100, how AI-visible this site is),
  "issues": [{
    "category": "structured-data" | "llms-txt" | "semantic-html" | "meta-tags" | "faq" | "sitemap" | "content-structure" | "ai-access" | "citation" | "robots",
    "issue": string,
    "fix": string,
    "impact": "critical" | "high" | "medium" | "low",
    "fixedCode": string | null
  }],
  "recommendations": [{
    "title": string,
    "description": string,
    "priority": "must-have" | "important" | "nice-to-have",
    "code": string | null (full code example to implement)
  }],
  "generatedFiles": [{
    "filename": string (e.g. "llms.txt", "schema.json", "sitemap.xml"),
    "content": string (the full file content ready to deploy),
    "purpose": string
  }]
}

IMPORTANT: Always generate these files in generatedFiles:
- llms.txt — describing what the site does, its features, and how AI should represent it
- Structured data JSON-LD snippet for the main page
- Updated robots.txt with AI bot permissions

Be specific and actionable. Include ready-to-use code.`,
      },
      {
        role: "user",
        content: `Analyze this website for AEO (Answer Engine Optimization)${siteUrl ? ` - URL: ${siteUrl}` : ""}:\n\n${filesContent}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from DeepSeek");

  return JSON.parse(content) as AEOResult;
}

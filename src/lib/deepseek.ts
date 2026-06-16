import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});

export interface VulnerabilityResult {
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    seoScore: number;
    aeoScore: number;
  };
  vulnerabilities: {
    severity: "critical" | "high" | "medium" | "low";
    type: string;
    file: string;
    line: number;
    description: string;
    fix: string;
    fixedCode?: string;
  }[];
  seoIssues: {
    issue: string;
    recommendation: string;
    impact: "high" | "medium" | "low";
  }[];
  improvements: {
    category: string;
    suggestion: string;
    priority: "high" | "medium" | "low";
  }[];
}

export async function analyzeCode(
  code: string,
  filename: string
): Promise<VulnerabilityResult> {
  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are an expert security auditor and SEO specialist for web applications.

CRITICAL RULES:
- ONLY report vulnerabilities you can prove exist in the provided code.
- Every vulnerability MUST include the exact file name, line number, and the offending code pattern.
- If you cannot point to a specific line, DO NOT report it.
- Do NOT assume or guess what might exist outside the provided file.
- Fewer accurate findings are better than many false positives.

Analyze the provided code for:
1. Security vulnerabilities (OWASP Top 10) — only those provably present in the code
2. SEO issues (missing meta tags, poor structure, missing alt tags, slow loading patterns)
3. Code quality improvements (performance, best practices, accessibility)

Return your analysis as valid JSON matching this exact structure:
{
  "summary": { "totalIssues": number, "critical": number, "high": number, "medium": number, "low": number, "seoScore": number (0-100) },
  "vulnerabilities": [{ "severity": "critical"|"high"|"medium"|"low", "type": string, "file": string, "line": number (REQUIRED), "description": string, "fix": string, "fixedCode": string|null }],
  "seoIssues": [{ "issue": string, "recommendation": string, "impact": "high"|"medium"|"low" }],
  "improvements": [{ "category": string, "suggestion": string, "priority": "high"|"medium"|"low" }]
}

If no security vulnerabilities are found, return an empty vulnerabilities array. Do NOT fabricate issues.`,
      },
      {
        role: "user",
        content: `Analyze this file (${filename}):\n\n\`\`\`\n${code}\n\`\`\``,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from DeepSeek");

  return JSON.parse(content) as VulnerabilityResult;
}

export async function analyzeMultipleFiles(
  files: { name: string; content: string }[]
): Promise<VulnerabilityResult> {
  const filesContent = files
    .map((f) => `--- FILE: ${f.name} ---\n${f.content}\n`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are an expert security auditor and SEO specialist for web applications.

CRITICAL RULES:
- ONLY report vulnerabilities you can prove exist in the provided code.
- Every vulnerability MUST include the exact file name, line number, and a snippet of the offending code.
- If you cannot point to a specific line in the provided files, DO NOT report it.
- Do NOT assume or guess what might exist outside the provided files.
- Do NOT report issues about files that were not provided (e.g. .env files, config.yaml, etc. unless they are in the provided code).
- Fewer accurate findings are better than many false positives.

Analyze ALL provided files holistically for:
1. Security vulnerabilities (OWASP Top 10) — only those provably present in the code
2. SEO issues (meta tags, structure, performance, accessibility)
3. AEO issues (Answer Engine Optimization — visibility to AI like ChatGPT, Claude, Perplexity)
4. Code quality improvements

AEO checks include:
- Missing structured data (JSON-LD / Schema.org)
- No llms.txt file (AI-readable site description)
- Missing or blocking AI crawlers in robots.txt (GPTBot, ClaudeBot, PerplexityBot)
- Poor content structure for AI extraction
- No FAQ schema
- Missing citation-friendly formatting
- No semantic HTML hierarchy

Return your analysis as valid JSON:
{
  "summary": { "totalIssues": number, "critical": number, "high": number, "medium": number, "low": number, "seoScore": number (0-100), "aeoScore": number (0-100) },
  "vulnerabilities": [{ "severity": "critical"|"high"|"medium"|"low", "type": string, "file": string, "line": number (REQUIRED — must reference actual line in provided code), "description": string, "fix": string, "fixedCode": string|null }],
  "seoIssues": [{ "issue": string, "recommendation": string, "impact": "high"|"medium"|"low" }],
  "improvements": [{ "category": string, "suggestion": string, "priority": "high"|"medium"|"low" }]
}

If no security vulnerabilities are found, return an empty vulnerabilities array. Do NOT fabricate issues.`,
      },
      {
        role: "user",
        content: `Analyze these files from a vibe-coded application:\n\n${filesContent}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from DeepSeek");

  return JSON.parse(content) as VulnerabilityResult;
}

import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface VulnerabilityResult {
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    seoScore: number;
  };
  vulnerabilities: {
    severity: "critical" | "high" | "medium" | "low";
    type: string;
    file: string;
    line?: number;
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
Analyze the provided code for:
1. Security vulnerabilities (OWASP Top 10: XSS, SQL Injection, CSRF, exposed secrets, insecure auth, etc.)
2. SEO issues (missing meta tags, poor structure, missing alt tags, slow loading patterns, etc.)
3. Code quality improvements (performance, best practices, accessibility)

Return your analysis as valid JSON matching this exact structure:
{
  "summary": { "totalIssues": number, "critical": number, "high": number, "medium": number, "low": number, "seoScore": number (0-100) },
  "vulnerabilities": [{ "severity": "critical"|"high"|"medium"|"low", "type": string, "file": string, "line": number|null, "description": string, "fix": string, "fixedCode": string|null }],
  "seoIssues": [{ "issue": string, "recommendation": string, "impact": "high"|"medium"|"low" }],
  "improvements": [{ "category": string, "suggestion": string, "priority": "high"|"medium"|"low" }]
}

Be thorough but accurate. Only report real issues, not theoretical ones.`,
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
        content: `You are an expert security auditor and SEO specialist for web applications built with vibe coding tools (Cursor, Bolt, v0, Lovable, Replit).

These apps commonly have:
- Exposed API keys in frontend code
- No input validation or sanitization
- Missing authentication/authorization
- SQL injection via raw queries
- XSS through unescaped user input
- CSRF vulnerabilities
- Insecure direct object references
- Missing rate limiting
- Hardcoded secrets
- Overly permissive CORS

Analyze ALL provided files holistically for:
1. Security vulnerabilities (OWASP Top 10 + common vibe-coded app issues)
2. SEO issues (meta tags, structure, performance, accessibility)
3. Code quality improvements

Return your analysis as valid JSON:
{
  "summary": { "totalIssues": number, "critical": number, "high": number, "medium": number, "low": number, "seoScore": number (0-100) },
  "vulnerabilities": [{ "severity": "critical"|"high"|"medium"|"low", "type": string, "file": string, "line": number|null, "description": string, "fix": string, "fixedCode": string|null }],
  "seoIssues": [{ "issue": string, "recommendation": string, "impact": "high"|"medium"|"low" }],
  "improvements": [{ "category": string, "suggestion": string, "priority": "high"|"medium"|"low" }]
}`,
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

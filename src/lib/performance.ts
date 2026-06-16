import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export interface PerformanceResult {
  score: number;
  issues: {
    category: "loading" | "rendering" | "bundle-size" | "images" | "caching" | "network" | "javascript";
    issue: string;
    impact: "critical" | "high" | "medium" | "low";
    fix: string;
    fixedCode?: string;
    metric?: string;
  }[];
  coreWebVitals: {
    lcp: { status: "good" | "needs-improvement" | "poor"; issues: string[] };
    fid: { status: "good" | "needs-improvement" | "poor"; issues: string[] };
    cls: { status: "good" | "needs-improvement" | "poor"; issues: string[] };
    ttfb: { status: "good" | "needs-improvement" | "poor"; issues: string[] };
  };
  bundleAnalysis: {
    estimatedSize: string;
    heavyDependencies: string[];
    suggestions: string[];
  };
}

export async function analyzePerformance(
  files: { name: string; content: string }[]
): Promise<PerformanceResult> {
  const filesContent = files
    .map((f) => `--- FILE: ${f.name} ---\n${f.content}\n`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a web performance expert specializing in Core Web Vitals and frontend optimization.

Analyze the provided code for performance issues including:
1. Core Web Vitals (LCP, FID/INP, CLS, TTFB)
2. Bundle size issues (large imports, tree-shaking problems, unnecessary dependencies)
3. Image optimization (unoptimized images, missing lazy loading, no srcset)
4. Render-blocking resources (CSS/JS blocking first paint)
5. JavaScript execution (long tasks, heavy computations on main thread)
6. Caching issues (no cache headers, missing service worker considerations)
7. Network waterfall (too many requests, no preloading, missing resource hints)

Return valid JSON:
{
  "score": number (0-100 performance score),
  "issues": [{
    "category": "loading"|"rendering"|"bundle-size"|"images"|"caching"|"network"|"javascript",
    "issue": string,
    "impact": "critical"|"high"|"medium"|"low",
    "fix": string,
    "fixedCode": string|null,
    "metric": string|null (which Core Web Vital this affects)
  }],
  "coreWebVitals": {
    "lcp": {"status": "good"|"needs-improvement"|"poor", "issues": [string]},
    "fid": {"status": "good"|"needs-improvement"|"poor", "issues": [string]},
    "cls": {"status": "good"|"needs-improvement"|"poor", "issues": [string]},
    "ttfb": {"status": "good"|"needs-improvement"|"poor", "issues": [string]}
  },
  "bundleAnalysis": {
    "estimatedSize": string,
    "heavyDependencies": [string],
    "suggestions": [string]
  }
}

Be specific — reference actual files and code patterns you see. Only flag real issues.`,
      },
      {
        role: "user",
        content: `Analyze these files for performance:\n\n${filesContent}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
    max_tokens: 6000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from DeepSeek");

  return JSON.parse(content) as PerformanceResult;
}

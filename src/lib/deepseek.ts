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
    verified?: boolean;
    verifyReason?: string;
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

// Empty result used as a safe fallback when a chunk fails.
function emptyResult(): VulnerabilityResult {
  return {
    summary: { totalIssues: 0, critical: 0, high: 0, medium: 0, low: 0, seoScore: 100, aeoScore: 100 },
    vulnerabilities: [],
    seoIssues: [],
    improvements: [],
  };
}

// Analyze a large set of files by splitting into focused chunks (so each LLM
// pass sees few enough files to reason deeply) and merging the results. This
// is what turns the deep repo scan from "20 files in one shallow call" into a
// real audit. A chunk that fails degrades gracefully to empty rather than
// failing the whole scan.
export async function analyzeFilesInChunks(
  files: { name: string; content: string }[],
  chunkFiles = 8,
  maxChunkChars = 60_000
): Promise<VulnerabilityResult> {
  if (files.length === 0) return emptyResult();

  // Build chunks bounded by both file count and total characters.
  const chunks: { name: string; content: string }[][] = [];
  let current: { name: string; content: string }[] = [];
  let currentChars = 0;
  for (const f of files) {
    const size = f.content.length;
    if (current.length > 0 && (current.length >= chunkFiles || currentChars + size > maxChunkChars)) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(f);
    currentChars += size;
  }
  if (current.length) chunks.push(current);

  // Run chunks with bounded concurrency to stay within rate/time limits.
  const concurrency = 3;
  const results: VulnerabilityResult[] = [];
  for (let i = 0; i < chunks.length; i += concurrency) {
    const slice = chunks.slice(i, i + concurrency);
    const settled = await Promise.allSettled(slice.map((c) => analyzeMultipleFiles(c)));
    for (const s of settled) {
      results.push(s.status === "fulfilled" ? s.value : emptyResult());
    }
  }

  return mergeResults(results);
}

// Merge multiple VulnerabilityResults: dedupe vulnerabilities by file+line+type,
// concatenate SEO/improvement items, recompute counts, and take the WORST
// (lowest) SEO/AEO score seen so a single clean chunk doesn't mask problems.
export function mergeResults(results: VulnerabilityResult[]): VulnerabilityResult {
  const merged = emptyResult();
  const seenVuln = new Set<string>();
  const seenSeo = new Set<string>();
  const seenImp = new Set<string>();
  let seoScore = 100;
  let aeoScore = 100;

  for (const r of results) {
    if (!r) continue;
    for (const v of r.vulnerabilities || []) {
      const key = `${v.file}:${v.line}:${v.type}`;
      if (seenVuln.has(key)) continue;
      seenVuln.add(key);
      merged.vulnerabilities.push(v);
    }
    for (const s of r.seoIssues || []) {
      const key = s.issue;
      if (seenSeo.has(key)) continue;
      seenSeo.add(key);
      merged.seoIssues.push(s);
    }
    for (const imp of r.improvements || []) {
      const key = imp.suggestion;
      if (seenImp.has(key)) continue;
      seenImp.add(key);
      merged.improvements.push(imp);
    }
    if (typeof r.summary?.seoScore === "number") seoScore = Math.min(seoScore, r.summary.seoScore);
    if (typeof r.summary?.aeoScore === "number") aeoScore = Math.min(aeoScore, r.summary.aeoScore);
  }

  const sev = (s: string) => merged.vulnerabilities.filter((v) => v.severity === s).length;
  merged.summary = {
    totalIssues: merged.vulnerabilities.length,
    critical: sev("critical"),
    high: sev("high"),
    medium: sev("medium"),
    low: sev("low"),
    seoScore,
    aeoScore,
  };

  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  merged.vulnerabilities.sort((a, b) => order[a.severity] - order[b.severity]);
  return merged;
}

type Vuln = VulnerabilityResult["vulnerabilities"][number];

// Adversarial verification pass. For each file with claimed vulnerabilities,
// re-examine the ACTUAL code and confirm only the ones provably present —
// quoting the offending line. Anything theoretical, out-of-context, or
// unprovable is dropped. This is what stops the scanner from crying wolf.
//
// Resilient by design: if verification fails for a file, we KEEP that file's
// original findings (fail-open) rather than hiding real issues due to an API
// hiccup — but mark them unverified so the UI can distinguish.
export async function verifyVulnerabilities(
  files: { name: string; content: string }[],
  result: VulnerabilityResult
): Promise<VulnerabilityResult> {
  const vulns = result.vulnerabilities || [];
  if (vulns.length === 0) return result;

  const contentByFile = new Map(files.map((f) => [f.name, f.content]));

  // Group by file; vulns whose file we don't have content for can't be
  // verified — keep them but mark unverified.
  const byFile = new Map<string, Vuln[]>();
  const orphans: Vuln[] = [];
  for (const v of vulns) {
    if (v.file && contentByFile.has(v.file)) {
      const list = byFile.get(v.file) || [];
      list.push(v);
      byFile.set(v.file, list);
    } else {
      orphans.push({ ...v, verified: false });
    }
  }

  const confirmed: Vuln[] = [...orphans];

  const entries = Array.from(byFile.entries());
  const concurrency = 3;
  for (let i = 0; i < entries.length; i += concurrency) {
    const slice = entries.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      slice.map(([file, list]) => verifyFileVulns(file, contentByFile.get(file)!, list))
    );
    settled.forEach((s, idx) => {
      const [, list] = slice[idx];
      if (s.status === "fulfilled") confirmed.push(...s.value);
      // Fail-open: keep originals (unverified) if the call errored.
      else confirmed.push(...list.map((v) => ({ ...v, verified: false })));
    });
  }

  const sev = (s: string) => confirmed.filter((v) => v.severity === s).length;
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return {
    ...result,
    vulnerabilities: confirmed.sort((a, b) => order[a.severity] - order[b.severity]),
    summary: {
      ...result.summary,
      totalIssues: confirmed.length,
      critical: sev("critical"),
      high: sev("high"),
      medium: sev("medium"),
      low: sev("low"),
    },
  };
}

async function verifyFileVulns(
  filename: string,
  content: string,
  claims: Vuln[]
): Promise<Vuln[]> {
  const numbered = content
    .split("\n")
    .map((l, i) => `${i + 1}: ${l}`)
    .join("\n")
    .slice(0, 24_000);

  const claimList = claims
    .map((c, i) => `[${i}] (${c.severity}) ${c.type} @ line ${c.line}: ${c.description}`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a skeptical senior security reviewer doing a SECOND-PASS verification.
You are given a source file (with line numbers) and a list of claimed vulnerabilities in it.
For EACH claim, decide if it is a REAL, provable vulnerability in THIS code.

Confirm ONLY if you can point to the exact offending code. REJECT if it is:
- theoretical / "could be a problem" without evidence in the code,
- already mitigated elsewhere in the file,
- a framework feature that is safe by default,
- dependent on code not shown,
- a false positive.

Be strict: when in doubt, REJECT. Correct the severity if the claim over- or under-states it.

Return ONLY JSON:
{ "verdicts": [ { "index": number, "confirmed": boolean, "severity": "critical"|"high"|"medium"|"low", "evidence": "the exact line or code you found", "reason": "short justification" } ] }`,
      },
      {
        role: "user",
        content: `File: ${filename}\n\nClaims:\n${claimList}\n\nSource:\n\`\`\`\n${numbered}\n\`\`\``,
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return claims.map((v) => ({ ...v, verified: false }));

  let verdicts: { index: number; confirmed: boolean; severity?: Vuln["severity"]; reason?: string }[] = [];
  try {
    verdicts = JSON.parse(raw).verdicts || [];
  } catch {
    return claims.map((v) => ({ ...v, verified: false }));
  }

  const byIndex = new Map(verdicts.map((v) => [v.index, v]));
  const out: Vuln[] = [];
  claims.forEach((claim, idx) => {
    const verdict = byIndex.get(idx);
    if (!verdict) {
      // No verdict returned for this claim — keep it, unverified.
      out.push({ ...claim, verified: false });
      return;
    }
    if (!verdict.confirmed) return; // dropped as a false positive
    out.push({
      ...claim,
      severity: verdict.severity || claim.severity,
      verified: true,
      verifyReason: verdict.reason,
    });
  });
  return out;
}

export interface FileFix {
  changed: boolean;
  fixedContent: string;
  summary: string;
}

// Regenerate the COMPLETE corrected file for a set of vulnerabilities found in
// it. Returning the whole file (rather than a snippet) is what lets us safely
// replace the file in a PR. The caller still validates the result before use.
export async function generateFileFix(
  filename: string,
  originalContent: string,
  vulns: { severity: string; type: string; line: number; description: string; fix: string }[]
): Promise<FileFix> {
  const issueList = vulns
    .map((v, i) => `${i + 1}. [${v.severity}] ${v.type} (around line ${v.line}): ${v.description}\n   Suggested fix: ${v.fix}`)
    .join("\n");

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a senior engineer applying SECURITY fixes to a single source file.

ABSOLUTE RULES:
- Return the ENTIRE file content with the fixes applied — never a snippet or diff.
- Preserve ALL existing code, imports, comments, formatting and behavior that is unrelated to the security issues.
- Change ONLY what is necessary to fix the listed vulnerabilities. Do not refactor, rename, or reformat unrelated code.
- Never remove functionality. Never invent imports that don't exist in the project.
- If a fix cannot be applied safely with only this file's context (e.g. it needs other files), DO NOT guess — leave that part unchanged.
- If you cannot safely fix anything, set "changed" to false and return the original content unchanged.

Return ONLY valid JSON:
{
  "changed": boolean,
  "fixedContent": "the complete file content as a single string",
  "summary": "one sentence describing exactly what you changed"
}`,
      },
      {
        role: "user",
        content: `File: ${filename}\n\nVulnerabilities to fix:\n${issueList}\n\nOriginal file content:\n\`\`\`\n${originalContent}\n\`\`\``,
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from DeepSeek");

  const parsed = JSON.parse(content) as FileFix;
  return {
    changed: Boolean(parsed.changed),
    fixedContent: typeof parsed.fixedContent === "string" ? parsed.fixedContent : "",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
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

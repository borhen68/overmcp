import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";
import OpenAI from "openai";

let _deepseek: OpenAI | null = null;
function getDeepseek() {
  if (!_deepseek) {
    _deepseek = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
      timeout: 45_000,
      maxRetries: 1,
    });
  }
  return _deepseek;
}

export async function POST(request: NextRequest) {
  try {
    const { scanId, message } = await request.json();

    if (!scanId || !message) {
      return NextResponse.json({ error: "scanId and message required" }, { status: 400 });
    }

    let scan = getScan(scanId);
    if (!scan) {
      scan = await getScanWithDB(scanId);
    }

    if (!scan || !scan.paid) {
      return NextResponse.json({ error: "Paid scan required for AI chat" }, { status: 403 });
    }

    if (!scan.result) {
      return NextResponse.json({ error: "No scan results available" }, { status: 400 });
    }

    const context = buildContext(scan);

    const response = await getDeepseek().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a security expert assistant for OverMCP. The user has scanned their website and you have access to their full security report. Help them understand their vulnerabilities, prioritize fixes, and implement solutions.

Be concise, practical, and specific. Reference actual findings from their report when relevant. If they ask about something not in the report, say so clearly.

${context}`,
        },
        { role: "user", content: message },
      ],
      max_tokens: 1000,
    });

    const reply = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildContext(scan: NonNullable<Awaited<ReturnType<typeof getScanWithDB>>>): string {
  const parts: string[] = [];

  if (scan.url) parts.push(`Site: ${scan.url}`);
  if (scan.platform) parts.push(`Platform: ${scan.platform}`);

  if (scan.result) {
    const s = scan.result.summary;
    parts.push(`\nSecurity Summary: ${s.totalIssues} issues (${s.critical} critical, ${s.high} high, ${s.medium} medium, ${s.low} low)`);
    parts.push(`SEO Score: ${s.seoScore}/100, AEO Score: ${s.aeoScore}/100`);

    parts.push(`\nVulnerabilities:`);
    scan.result.vulnerabilities.forEach((v, i) => {
      parts.push(`${i + 1}. [${v.severity.toUpperCase()}] ${v.type} in ${v.file}${v.line ? `:${v.line}` : ""} — ${v.description}`);
    });

    if (scan.result.seoIssues.length > 0) {
      parts.push(`\nSEO Issues:`);
      scan.result.seoIssues.forEach((s, i) => {
        parts.push(`${i + 1}. ${s.issue} — ${s.recommendation}`);
      });
    }
  }

  if (scan.performance) {
    parts.push(`\nPerformance Score: ${scan.performance.score}/100`);
    const cwv = scan.performance.coreWebVitals;
    parts.push(`Core Web Vitals: LCP=${cwv.lcp.status}, FID=${cwv.fid.status}, CLS=${cwv.cls.status}, TTFB=${cwv.ttfb.status}`);
  }

  if (scan.dependencies) {
    parts.push(`\nDependencies: ${scan.dependencies.totalDependencies} packages, ${scan.dependencies.vulnerableDependencies} vulnerable`);
    if (scan.dependencies.vulnerabilities.length > 0) {
      parts.push(`CVEs:`);
      scan.dependencies.vulnerabilities.forEach((v) => {
        parts.push(`- ${v.package}@${v.version}: ${v.title} (${v.severity})${v.fixedIn ? ` — fix: ${v.fixedIn}` : ""}`);
      });
    }
  }

  return parts.join("\n");
}

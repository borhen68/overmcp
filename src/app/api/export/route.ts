import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("id");

  if (!scanId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let scan = getScan(scanId);
  if (!scan) {
    scan = await getScanWithDB(scanId);
  }

  if (!scan || !scan.paid || !scan.result) {
    return NextResponse.json({ error: "Paid scan with results required" }, { status: 403 });
  }

  const report = generateMarkdownReport(scan);

  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="overmcp-report-${scanId.slice(0, 8)}.md"`,
    },
  });
}

function generateMarkdownReport(scan: NonNullable<Awaited<ReturnType<typeof getScanWithDB>>>): string {
  const lines: string[] = [];
  const result = scan.result!;
  const s = result.summary;

  lines.push(`# OverMCP Security Report`);
  lines.push(``);
  lines.push(`**Site:** ${scan.url || "N/A"}`);
  lines.push(`**Platform:** ${scan.platform || "Unknown"}`);
  lines.push(`**Scanned:** ${new Date(scan.createdAt).toLocaleDateString()}`);
  lines.push(`**Report ID:** ${scan.id}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Issues | ${s.totalIssues} |`);
  lines.push(`| Critical | ${s.critical} |`);
  lines.push(`| High | ${s.high} |`);
  lines.push(`| Medium | ${s.medium} |`);
  lines.push(`| Low | ${s.low} |`);
  lines.push(`| SEO Score | ${s.seoScore}/100 |`);
  lines.push(`| AEO Score | ${s.aeoScore}/100 |`);
  if (scan.performance) lines.push(`| Performance | ${scan.performance.score}/100 |`);
  if (scan.dependencies) lines.push(`| Dependency Risk | ${scan.dependencies.riskScore}/100 |`);
  lines.push(``);

  if (result.vulnerabilities.length > 0) {
    lines.push(`## Security Vulnerabilities`);
    lines.push(``);
    result.vulnerabilities.forEach((v, i) => {
      lines.push(`### ${i + 1}. [${v.severity.toUpperCase()}] ${v.type}`);
      lines.push(``);
      lines.push(`- **File:** ${v.file}${v.line ? `:${v.line}` : ""}`);
      lines.push(`- **Description:** ${v.description}`);
      lines.push(`- **Fix:** ${v.fix}`);
      if (v.fixedCode) {
        lines.push(``);
        lines.push(`\`\`\`javascript`);
        lines.push(v.fixedCode);
        lines.push(`\`\`\``);
      }
      lines.push(``);
    });
  }

  if (result.seoIssues.length > 0) {
    lines.push(`## SEO Issues`);
    lines.push(``);
    result.seoIssues.forEach((issue, i) => {
      lines.push(`${i + 1}. **${issue.issue}** (${issue.impact})`);
      lines.push(`   - ${issue.recommendation}`);
    });
    lines.push(``);
  }

  if (scan.aeo) {
    lines.push(`## AI Visibility (AEO)`);
    lines.push(``);
    lines.push(`Score: **${scan.aeo.score}/100**`);
    lines.push(``);
    if (scan.aeo.issues.length > 0) {
      lines.push(`### Issues`);
      scan.aeo.issues.forEach((issue, i) => {
        lines.push(`${i + 1}. [${issue.category}] ${issue.issue} — ${issue.fix}`);
      });
      lines.push(``);
    }
    if (scan.aeo.generatedFiles.length > 0) {
      lines.push(`### Generated Files`);
      lines.push(``);
      scan.aeo.generatedFiles.forEach((f) => {
        lines.push(`#### ${f.filename}`);
        lines.push(`> ${f.purpose}`);
        lines.push(``);
        lines.push(`\`\`\``);
        lines.push(f.content);
        lines.push(`\`\`\``);
        lines.push(``);
      });
    }
  }

  if (scan.performance) {
    lines.push(`## Performance`);
    lines.push(``);
    lines.push(`Score: **${scan.performance.score}/100**`);
    lines.push(``);
    const cwv = scan.performance.coreWebVitals;
    lines.push(`| Metric | Status |`);
    lines.push(`|--------|--------|`);
    lines.push(`| LCP | ${cwv.lcp.status} |`);
    lines.push(`| FID | ${cwv.fid.status} |`);
    lines.push(`| CLS | ${cwv.cls.status} |`);
    lines.push(`| TTFB | ${cwv.ttfb.status} |`);
    lines.push(``);
    if (scan.performance.issues.length > 0) {
      lines.push(`### Issues`);
      scan.performance.issues.forEach((issue, i) => {
        lines.push(`${i + 1}. [${issue.impact}] ${issue.issue} — ${issue.fix}`);
      });
      lines.push(``);
    }
  }

  if (scan.dependencies) {
    lines.push(`## Dependencies`);
    lines.push(``);
    lines.push(`- Total packages: ${scan.dependencies.totalDependencies}`);
    lines.push(`- Vulnerable: ${scan.dependencies.vulnerableDependencies}`);
    lines.push(`- Safety score: ${scan.dependencies.riskScore}/100`);
    lines.push(``);
    if (scan.dependencies.vulnerabilities.length > 0) {
      lines.push(`### Known CVEs`);
      lines.push(``);
      lines.push(`| Package | Version | Severity | CVE | Fix |`);
      lines.push(`|---------|---------|----------|-----|-----|`);
      scan.dependencies.vulnerabilities.forEach((v) => {
        lines.push(`| ${v.package} | ${v.version} | ${v.severity} | ${v.cve} | ${v.fixedIn || "N/A"} |`);
      });
      lines.push(``);
    }
    if (scan.dependencies.outdated.length > 0) {
      lines.push(`### Outdated Packages`);
      lines.push(``);
      lines.push(`| Package | Current | Latest | Behind |`);
      lines.push(`|---------|---------|--------|--------|`);
      scan.dependencies.outdated.forEach((d) => {
        lines.push(`| ${d.package} | ${d.current} | ${d.latest} | ${d.behind} |`);
      });
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`*Generated by [OverMCP](${process.env.NEXT_PUBLIC_APP_URL || "https://overmcp.app"}) — AI-powered security for vibe-coded apps*`);

  return lines.join("\n");
}

import { NextResponse } from "next/server";

export async function GET() {
  const content = `# OverMCP

> AI-powered security scanner for vibe-coded apps built with Cursor, Bolt, v0, Lovable, and other AI coding tools.

## Overview

OverMCP scans any website or GitHub repo for security vulnerabilities, SEO issues, AI visibility (AEO) gaps, performance problems, and dependency CVEs. It provides auto-fix via GitHub PR and one-click deploy to Vercel, Netlify, Cloudflare Pages, or Railway.

## Services

- Security audit (OWASP Top 10)
- SEO analysis and fixes
- AI Engine Optimization (AEO) — makes sites visible to ChatGPT, Claude, Perplexity
- Core Web Vitals and performance audit
- Dependency CVE scanning via OSV.dev
- Auto-fix with GitHub PR creation
- One-click secure redeployment
- Weekly monitoring rescans
- AI security chat assistant
- Downloadable reports
- Embeddable security badge

## Pricing

- Free: scan summary with scores
- $5 (crypto): full report + fixes + GitHub PR
- $19 (crypto): full report + fixes + auto-deploy + rescan monitoring

## Links

- Homepage: https://overmcp.com
- Dashboard: https://overmcp.com/dashboard
- Connect platforms: https://overmcp.com/connect
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

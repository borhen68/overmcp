import { NextResponse } from "next/server";

export async function GET() {
  const content = `# OverMCP

> AI-powered security scanner for vibe-coded apps. Scans websites built with Cursor, Bolt, v0, Lovable, and other AI coding tools for vulnerabilities, SEO issues, AEO gaps, performance problems, and dependency CVEs.

## What OverMCP Does

OverMCP is a SaaS tool that accepts any URL (live website or GitHub repo), crawls the deployed code, and runs 4 parallel AI analyses:

1. **Security Audit** — OWASP Top 10 vulnerabilities (XSS, SQL injection, exposed secrets, broken auth, CSRF, etc.)
2. **SEO & AEO Analysis** — Meta tags, structured data, AI visibility, llms.txt generation
3. **Performance Audit** — Core Web Vitals (LCP, FID, CLS, TTFB), bundle analysis, render-blocking resources
4. **Dependency CVE Scan** — Checks every npm package against OSV.dev for known vulnerabilities

## Pricing

- **Free Scan** — Vulnerability count, risk summary, scores, 1 issue preview
- **Fix ($5 USD)** — Full report with all vulnerabilities, fixed code, SEO/AEO recommendations, auto PR on GitHub
- **Deploy ($19 USD)** — Everything in Fix plus auto-deploy to Vercel/Netlify/Cloudflare/Railway, rescan monitoring

## Supported Platforms

- Any live website (auto-detected via headers)
- Vercel
- Netlify
- Cloudflare Pages
- Railway
- GitHub (public and private repos)

## Key Features

- Universal URL scanner (paste any site URL)
- AI security chat (ask questions about your vulnerabilities)
- Downloadable security report
- Embeddable security badge
- Email notifications when scans complete
- Scheduled weekly rescans with alerts
- Auto-fix via GitHub PR
- One-click deploy of fixed version
- AI visibility optimization (AEO)
- Generated llms.txt and JSON-LD schema

## Target Users

- Solo developers using AI coding tools (Cursor, Bolt, v0, Lovable)
- Indie hackers shipping MVPs fast
- Agencies building for clients with vibe coding tools
- Anyone who needs to secure AI-generated code quickly

## How It Works

1. User pastes any URL or GitHub repo link
2. OverMCP crawls the site and extracts source code
3. DeepSeek AI analyzes all code files in parallel
4. User gets a free summary with scores
5. Paid tier unlocks full report with fixes and auto-deploy

## Contact

Website: https://www.overmcp.com
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

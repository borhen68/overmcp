import type { Metadata } from "next";
import HomeClient from "./home-client";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

// Homepage is the #1 commercial ranking target — keep title under ~60 chars
// and lead with the highest-volume intent phrases.
export const metadata: Metadata = {
  title: {
    absolute:
      "Free Website Vulnerability Scanner for AI-Built Apps | OverMCP",
  },
  description:
    "Free website vulnerability scanner and security checker for Cursor, Bolt, v0, and Lovable apps. Find OWASP issues, leaked API keys, CVEs, SEO & AEO gaps in 30 seconds.",
  keywords: [
    "free website vulnerability scanner",
    "website security checker",
    "AI app security scanner",
    "website vulnerability scanner",
    "vibe coding security",
    "Cursor security scanner",
    "API key leak scanner",
    "OWASP scanner",
  ],
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: "Free Website Vulnerability Scanner for AI-Built Apps | OverMCP",
    description:
      "Paste any URL. Find OWASP vulnerabilities, leaked secrets, CVEs, SEO issues, and AEO/GEO gaps. Free scan, no signup.",
    url: baseUrl,
    type: "website",
    siteName: "OverMCP",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Website Vulnerability Scanner | OverMCP",
    description:
      "Scan AI-built apps for OWASP issues, leaked keys, and CVEs in 30 seconds. Free.",
  },
};

export default function HomePage() {
  return <HomeClient />;
}

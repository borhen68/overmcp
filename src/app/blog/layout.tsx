import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "AI App Security Blog — Vibe Coding, AEO & CVEs",
  description:
    "Actionable guides for securing AI-built apps from Cursor, Bolt, v0, Lovable, Replit, and Windsurf. Learn OWASP fixes, leaked secret cleanup, CVE scanning, SEO, AEO, and GEO.",
  keywords: [
    "AI app security blog",
    "vibe coding security",
    "Cursor security",
    "Lovable security",
    "Bolt.new security",
    "v0 security",
    "AI generated code vulnerabilities",
    "answer engine optimization",
    "generative engine optimization",
  ],
  alternates: { canonical: `${baseUrl}/blog` },
  openGraph: {
    title: "OverMCP Blog — AI App Security, SEO, AEO & GEO",
    description:
      "Practical security and AI-search visibility guides for developers shipping fast with AI coding tools.",
    url: `${baseUrl}/blog`,
    type: "website",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

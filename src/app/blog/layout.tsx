import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Blog — Security Tips for AI-Built Apps",
  description:
    "Learn how to secure vibe-coded apps built with Cursor, Bolt, v0, and Lovable. Practical guides on XSS, leaked secrets, CVEs, AEO, and deploying safely.",
  alternates: { canonical: `${baseUrl}/blog` },
  openGraph: {
    title: "OverMCP Blog — Security Tips for AI-Built Apps",
    description:
      "Practical security guides for developers shipping fast with AI coding tools.",
    url: `${baseUrl}/blog`,
    type: "website",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

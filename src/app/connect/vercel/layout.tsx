import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Scan Your Vercel Deployment for Vulnerabilities",
  description:
    "Select a Vercel project and scan its latest deployment for security vulnerabilities, SEO issues, AEO gaps, performance problems, and dependency CVEs. Free instant scan.",
  alternates: { canonical: `${baseUrl}/connect/vercel` },
  openGraph: {
    title: "Scan Vercel Deployments | OverMCP",
    description:
      "Scan your Vercel deployments for OWASP Top 10 vulnerabilities and more.",
    url: `${baseUrl}/connect/vercel`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

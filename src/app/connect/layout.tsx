import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Connect Vercel or GitHub for Deep Security Scans",
  description:
    "Connect your Vercel account or GitHub repos to run deep security scans. OverMCP crawls your deployed code and checks for OWASP Top 10 vulnerabilities, SEO issues, and CVEs.",
  alternates: { canonical: `${baseUrl}/connect` },
  openGraph: {
    title: "Connect Platforms for Deep Scans | OverMCP",
    description:
      "Connect Vercel or GitHub to scan your deployed code for vulnerabilities.",
    url: `${baseUrl}/connect`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

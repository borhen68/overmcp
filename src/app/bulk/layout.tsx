import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Bulk Security Scanner — Scan Multiple Sites at Once",
  description:
    "Scan up to 10 websites at once for security vulnerabilities, SEO issues, AEO gaps, and dependency CVEs. Free bulk scanner for agencies and teams managing multiple sites.",
  alternates: { canonical: `${baseUrl}/bulk` },
  openGraph: {
    title: "Bulk Security Scanner | OverMCP",
    description: "Scan up to 10 websites for vulnerabilities in one go.",
    url: `${baseUrl}/bulk`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

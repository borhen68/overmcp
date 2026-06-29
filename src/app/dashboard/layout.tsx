import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Your Security Scans Dashboard",
  description:
    "View your past security scans, track vulnerability counts over time, and re-scan your GitHub repos. Sign in with GitHub to get started.",
  alternates: { canonical: `${baseUrl}/dashboard` },
  openGraph: {
    title: "Security Scans Dashboard | OverMCP",
    description: "Track your security scans and vulnerability history.",
    url: `${baseUrl}/dashboard`,
  },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

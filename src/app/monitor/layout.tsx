import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Continuous Security Monitoring for Your App",
  description:
    "Set up automated weekly security rescans for your website. Get email alerts when new vulnerabilities appear, issues are fixed, or dependencies go stale. Deploy-tier feature.",
  alternates: { canonical: `${baseUrl}/monitor` },
  openGraph: {
    title: "Continuous Security Monitoring | OverMCP",
    description:
      "Automated weekly rescans with email alerts. Know the moment new vulnerabilities appear.",
    url: `${baseUrl}/monitor`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

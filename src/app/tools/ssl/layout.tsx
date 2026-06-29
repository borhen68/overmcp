import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Free SSL Certificate Checker",
  description:
    "Check any domain's SSL/TLS certificate for free. See issuer, expiry date, days remaining, and protocol version. Instant results.",
  alternates: { canonical: `${baseUrl}/tools/ssl` },
  openGraph: {
    title: "Free SSL Certificate Checker | OverMCP",
    description:
      "Check any domain's SSL/TLS certificate for free. See issuer, expiry date, days remaining, and protocol version.",
    url: `${baseUrl}/tools/ssl`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

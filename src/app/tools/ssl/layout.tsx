import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: { absolute: "Free SSL Certificate Checker Online — Expiry & Issuer | OverMCP" },
  description:
    "Free SSL certificate checker online. Check HTTPS certificate expiry, issuer, and validity for any domain. Instant results, no signup.",
  keywords: ["SSL certificate checker", "HTTPS checker", "SSL expiry check", "TLS certificate test"],
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

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free SSL Certificate Checker",
  description:
    "Check any domain's SSL/TLS certificate for free. See issuer, expiry date, days remaining, and protocol version. Instant results.",
  openGraph: {
    title: "Free SSL Certificate Checker | OverMCP",
    description:
      "Check any domain's SSL/TLS certificate for free. See issuer, expiry date, days remaining, and protocol version.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

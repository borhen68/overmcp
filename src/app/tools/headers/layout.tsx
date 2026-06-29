import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Free Security Headers Checker",
  description:
    "Check any website's HTTP security headers for free. Detects Content-Security-Policy, HSTS, X-Frame-Options, and more. Get a letter grade instantly.",
  alternates: { canonical: `${baseUrl}/tools/headers` },
  openGraph: {
    title: "Free Security Headers Checker | OverMCP",
    description:
      "Check any website's HTTP security headers for free. Detects Content-Security-Policy, HSTS, X-Frame-Options, and more.",
    url: `${baseUrl}/tools/headers`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: { absolute: "Free Security Headers Checker Online — CSP, HSTS Grade | OverMCP" },
  description:
    "Free security headers checker online. Test Content-Security-Policy, HSTS, X-Frame-Options, and more on any URL. Instant letter grade. No signup.",
  keywords: [
    "security headers checker",
    "CSP checker",
    "HSTS checker",
    "HTTP security headers test",
    "X-Frame-Options checker",
  ],
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

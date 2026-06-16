import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Security Headers Checker",
  description:
    "Check any website's HTTP security headers for free. Detects Content-Security-Policy, HSTS, X-Frame-Options, and more. Get a letter grade instantly.",
  openGraph: {
    title: "Free Security Headers Checker | OverMCP",
    description:
      "Check any website's HTTP security headers for free. Detects Content-Security-Policy, HSTS, X-Frame-Options, and more.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

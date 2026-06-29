import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Embed a Security Badge on Your Site",
  description:
    "Show your OverMCP security score on your website with an embeddable badge. Copy a simple snippet to display your scan result and build trust with visitors.",
  alternates: { canonical: `${baseUrl}/badge` },
  openGraph: {
    title: "Embeddable Security Badge | OverMCP",
    description: "Display your security score on your site with a badge.",
    url: `${baseUrl}/badge`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

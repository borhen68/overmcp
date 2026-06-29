import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: "Free Secret Leak Scanner",
  description:
    "Paste your code and instantly detect leaked secrets — AWS keys, Stripe keys, OpenAI keys, Firebase configs, JWTs, and private keys. Runs entirely in your browser.",
  alternates: { canonical: `${baseUrl}/tools/leak` },
  openGraph: {
    title: "Free Secret Leak Scanner | OverMCP",
    description:
      "Paste your code and instantly detect leaked secrets — AWS keys, Stripe keys, OpenAI keys, Firebase configs, JWTs, and private keys.",
    url: `${baseUrl}/tools/leak`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

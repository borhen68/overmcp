import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: { absolute: "Free Secret & API Key Leak Scanner Online | OverMCP" },
  description:
    "Free API key leak scanner. Detect exposed AWS, Stripe, OpenAI, Supabase, Firebase keys, JWTs, and private keys in code or live sites. No signup.",
  keywords: [
    "API key leak scanner",
    "secret leak scanner",
    "find leaked API keys",
    "exposed OpenAI key",
    "Stripe key scanner",
  ],
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

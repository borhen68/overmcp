import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Secret Leak Scanner",
  description:
    "Paste your code and instantly detect leaked secrets — AWS keys, Stripe keys, OpenAI keys, Firebase configs, JWTs, and private keys. Runs entirely in your browser.",
  openGraph: {
    title: "Free Secret Leak Scanner | OverMCP",
    description:
      "Paste your code and instantly detect leaked secrets — AWS keys, Stripe keys, OpenAI keys, Firebase configs, JWTs, and private keys.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://overmcp.app";

export const metadata: Metadata = {
  title: {
    default: "OverMCP — Security Scanner for Vibe-Coded Apps",
    template: "%s | OverMCP",
  },
  description:
    "Scan any website for vulnerabilities, fix security issues, optimize SEO & AI visibility, audit performance, and detect dependency CVEs. Built for apps made with Cursor, Bolt, v0, and Lovable. Auto-fix & deploy in one click. Pay with crypto.",
  keywords: [
    "security scanner",
    "vibe coding security",
    "cursor security audit",
    "bolt.new vulnerability scanner",
    "v0 security check",
    "lovable app security",
    "AI code audit",
    "OWASP scanner",
    "website vulnerability scanner",
    "SEO audit tool",
    "AEO optimization",
    "AI visibility",
    "answer engine optimization",
    "llms.txt generator",
    "dependency CVE scanner",
    "core web vitals audit",
    "auto fix deploy",
    "crypto payment SaaS",
    "vibe coded app security",
    "AI generated code security",
  ],
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: "OverMCP — Secure Your Vibe-Coded App in 60 Seconds",
    description:
      "Paste any URL. Get a full security audit with OWASP Top 10 scan, SEO fixes, AI visibility score, performance report, and CVE scan. Auto-fix & deploy. Pay with crypto.",
    type: "website",
    siteName: "OverMCP",
    url: baseUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OverMCP — Security Scanner for Vibe-Coded Apps",
    description:
      "Paste a URL → vulnerabilities + SEO + AEO + performance + CVEs → auto-fix → deploy. Built for Cursor/Bolt/v0/Lovable apps.",
    creator: "@overmcp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="canonical" href={baseUrl} />
        <meta name="theme-color" content="#0a0a0a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "OverMCP",
              applicationCategory: "SecurityApplication",
              operatingSystem: "Web",
              url: baseUrl,
              description:
                "AI-powered security scanner for vibe-coded apps. Scans for OWASP Top 10 vulnerabilities, optimizes SEO & AEO, audits Core Web Vitals, checks dependencies for CVEs, and auto-deploys fixes.",
              featureList: [
                "OWASP Top 10 vulnerability scanning",
                "SEO audit and optimization",
                "AI Engine Optimization (AEO)",
                "Core Web Vitals performance audit",
                "Dependency CVE scanning",
                "Auto-fix via GitHub PR",
                "One-click deploy to Vercel, Netlify, Cloudflare, Railway",
                "AI security chat assistant",
                "Weekly monitoring rescans",
                "Embeddable security badge",
                "Downloadable security report",
              ],
              offers: [
                {
                  "@type": "Offer",
                  name: "Free Scan",
                  price: "0",
                  priceCurrency: "USD",
                  description:
                    "Vulnerability count, risk summary, SEO & AEO scores, 1 issue preview",
                },
                {
                  "@type": "Offer",
                  name: "Fix",
                  price: "9",
                  priceCurrency: "USD",
                  description:
                    "Full report with all vulnerabilities, fixed code snippets, SEO + AEO optimization, performance report, dependency audit, auto PR on GitHub",
                },
                {
                  "@type": "Offer",
                  name: "Deploy",
                  price: "29",
                  priceCurrency: "USD",
                  description:
                    "Everything in Fix plus auto-deploy to any platform, llms.txt generated, weekly rescan monitoring, priority support",
                },
              ],
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "47",
                bestRating: "5",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is vibe coding and why does it need security scanning?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Vibe coding means using AI tools like Cursor, Bolt, v0, and Lovable to generate code quickly by describing what you want. While fast, AI-generated code often contains security vulnerabilities like XSS, SQL injection, exposed API keys, and missing authentication. OverMCP scans this code and fixes it automatically.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How does OverMCP scan my website?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Paste any live URL or GitHub repo link. OverMCP crawls your site, extracts all code (HTML, JS, CSS), follows source maps to find original source files, and runs 4 parallel AI analyses: security audit, SEO/AEO check, performance audit, and dependency CVE scan.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What is AEO (Answer Engine Optimization)?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "AEO makes your website visible and recommendable by AI chatbots like ChatGPT, Claude, and Perplexity. OverMCP checks your AI bot permissions, generates llms.txt files, adds JSON-LD structured data, and optimizes your content for AI comprehension.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Why crypto payments?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "OverMCP accepts cryptocurrency payments via NOWPayments, supporting Bitcoin, Ethereum, USDT, and 100+ other currencies. This makes the service accessible globally without geographic payment restrictions.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can OverMCP automatically fix my code?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. The $9 Fix tier creates a GitHub Pull Request with all security fixes applied. The $29 Deploy tier goes further — it deploys the fixed version directly to your hosting platform (Vercel, Netlify, Cloudflare Pages, or Railway) in one click.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-950 text-white">
        {children}
      </body>
    </html>
  );
}

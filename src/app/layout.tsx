import type { Metadata } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import PaddleLoader from "@/components/PaddleLoader";
import { serializeJsonLd } from "@/lib/json-ld";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  applicationName: "OverMCP",
  authors: [{ name: "OverMCP Team", url: baseUrl }],
  creator: "OverMCP",
  publisher: "OverMCP",
  title: {
    default: "OverMCP — AI App Security Scanner for Vibe-Coded Apps",
    template: "%s | OverMCP",
  },
  description:
    "Free AI app security scanner for Cursor, Bolt.new, v0, Lovable, Replit, and Windsurf apps. Find OWASP vulnerabilities, leaked secrets, dependency CVEs, SEO issues, AEO gaps, and deployment risks.",
  keywords: [
    "AI app security scanner",
    "AI generated code security scanner",
    "vibe coding security scanner",
    "security scanner",
    "vibe coding security",
    "cursor security audit",
    "cursor security scanner",
    "bolt.new vulnerability scanner",
    "bolt.new security scanner",
    "v0 security check",
    "v0 security scanner",
    "lovable app security",
    "lovable security scanner",
    "replit agent security",
    "windsurf code security",
    "AI code audit",
    "OWASP scanner",
    "OWASP Top 10 scanner",
    "website vulnerability scanner",
    "free website vulnerability scanner",
    "secret leak scanner",
    "API key leak scanner",
    "dependency CVE scanner",
    "npm vulnerability scanner",
    "security headers checker",
    "SSL certificate checker",
    "SEO audit tool",
    "AEO optimization",
    "GEO optimization",
    "AI visibility",
    "answer engine optimization",
    "generative engine optimization",
    "llms.txt generator",
    "core web vitals audit",
    "auto fix deploy",
    "vibe coded app security",
  ],
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
    types: {
      "application/rss+xml": `${baseUrl}/rss.xml`,
    },
  },
  openGraph: {
    title: "OverMCP — AI App Security Scanner for Vibe-Coded Apps",
    description:
      "Paste any URL. Find OWASP vulnerabilities, leaked secrets, CVEs, SEO issues, AEO/GEO gaps, and deployment risks in apps built with AI coding tools.",
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
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
      className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0c0a09" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@id": `${baseUrl}/#software`,
              "@type": "SoftwareApplication",
              name: "OverMCP",
              alternateName: "OverMCP AI App Security Scanner",
              applicationCategory: "SecurityApplication",
              applicationSubCategory: "Website vulnerability scanner",
              operatingSystem: "Web",
              url: baseUrl,
              description:
                "AI-powered security scanner for vibe-coded apps built with Cursor, Bolt.new, v0, Lovable, Replit, Windsurf, and other AI coding tools. Scans for OWASP Top 10 vulnerabilities, leaked secrets, SEO and AEO/GEO gaps, Core Web Vitals, dependency CVEs, and deployment risks.",
              keywords:
                "AI app security scanner, vibe coding security, Cursor security scanner, Bolt.new vulnerability scanner, Lovable security scanner, OWASP scanner, secret leak scanner, AEO, GEO, llms.txt",
              audience: {
                "@type": "Audience",
                audienceType:
                  "Indie developers, solo founders, agencies, and AI coding tool users",
              },
              featureList: [
                "OWASP Top 10 vulnerability scanning",
                "Secret leak and API key exposure detection",
                "SEO audit and optimization",
                "Answer Engine Optimization (AEO)",
                "Generative Engine Optimization (GEO)",
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
                  url: baseUrl,
                  description:
                    "Vulnerability count, risk summary, SEO & AEO scores, 1 issue preview",
                },
                {
                  "@type": "Offer",
                  name: "Fix",
                  price: "5",
                  priceCurrency: "USD",
                  url: `${baseUrl}/#pricing`,
                  description:
                    "Full report with all vulnerabilities, fixed code snippets, SEO + AEO optimization, performance report, dependency audit, auto PR on GitHub",
                },
                {
                  "@type": "Offer",
                  name: "Deploy",
                  price: "19",
                  priceCurrency: "USD",
                  url: `${baseUrl}/#pricing`,
                  description:
                    "Everything in Fix plus auto-deploy to any platform, llms.txt generated, weekly rescan monitoring, priority support",
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@id": `${baseUrl}/#website`,
              "@type": "WebSite",
              name: "OverMCP",
              url: baseUrl,
              description:
                "AI-powered security scanner and security education site for vibe-coded apps. Covers OWASP vulnerabilities, leaked secrets, CVEs, SEO, AEO, GEO, and safe deployment.",
              publisher: { "@id": `${baseUrl}/#organization` },
              hasPart: [
                { "@type": "WebPage", name: "Free scanner", url: baseUrl },
                { "@type": "WebPage", name: "Blog", url: `${baseUrl}/blog` },
                {
                  "@type": "WebPage",
                  name: "Security headers checker",
                  url: `${baseUrl}/tools/headers`,
                },
                {
                  "@type": "WebPage",
                  name: "Secret leak scanner",
                  url: `${baseUrl}/tools/leak`,
                },
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              "@context": "https://schema.org",
              "@id": `${baseUrl}/#organization`,
              "@type": "Organization",
              name: "OverMCP",
              url: baseUrl,
              logo: `${baseUrl}/icon`,
              description:
                "OverMCP helps developers secure AI-built web apps before launch.",
              knowsAbout: [
                "AI-generated code security",
                "Vibe coding security",
                "OWASP Top 10",
                "Secret leak detection",
                "Dependency CVE scanning",
                "Answer Engine Optimization",
                "Generative Engine Optimization",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
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
                  name: "What payment methods are accepted?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "OverMCP accepts cards, Apple Pay, Google Pay, and PayPal via Paddle. Checkout is handled securely by Paddle — OverMCP never stores card details.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can OverMCP automatically fix my code?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. The $5 Fix tier creates a GitHub Pull Request with all security fixes applied. The $19 Deploy tier goes further — it deploys the fixed version directly to your hosting platform (Vercel, Netlify, Cloudflare Pages, or Railway) in one click.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0c0a09] text-stone-100">
        {children}
        <PaddleLoader />
      </body>
    </html>
  );
}

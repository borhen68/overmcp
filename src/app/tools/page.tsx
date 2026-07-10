import Link from "next/link";
import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export const metadata: Metadata = {
  title: { absolute: "Free Website Security Tools — Headers, SSL, Secret Leak | OverMCP" },
  description:
    "Free website security tools: security headers checker, SSL certificate checker, and API key / secret leak scanner. No signup. Built for AI-generated apps.",
  alternates: { canonical: `${baseUrl}/tools` },
  openGraph: {
    title: "Free Website Security Tools | OverMCP",
    description:
      "Check security headers, SSL certificates, and leaked API keys for free — then run a full vulnerability scan.",
    url: `${baseUrl}/tools`,
  },
};

const tools = [
  {
    href: "/tools/headers",
    title: "Security Headers Checker",
    blurb: "Grade CSP, HSTS, X-Frame-Options, and more on any URL.",
    keyword: "security headers checker",
  },
  {
    href: "/tools/ssl",
    title: "SSL Certificate Checker",
    blurb: "Validate HTTPS certificates, expiry, and issuer signals.",
    keyword: "SSL certificate checker",
  },
  {
    href: "/tools/leak",
    title: "Secret Leak Scanner",
    blurb: "Find exposed OpenAI, Stripe, AWS, Supabase, and Firebase keys.",
    keyword: "API key leak scanner",
  },
];

const guides = [
  { href: "/free-website-vulnerability-scanner", label: "Free website vulnerability scanner" },
  { href: "/website-security-checker", label: "Website security checker" },
  { href: "/ai-app-security-scanner", label: "AI app security scanner" },
  { href: "/nextjs-security-scanner", label: "Next.js security scanner" },
  { href: "/api-key-leak-scanner", label: "API key leak scanner" },
  { href: "/vibe-coding-security", label: "Vibe coding security" },
];

export default function ToolsHubPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free OverMCP security tools",
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `${baseUrl}${t.href}`,
    })),
  };

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gradient">
            OverMCP
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/#scan" className="text-gray-400 hover:text-white">
              Full scan
            </Link>
            <Link href="/blog" className="text-gray-400 hover:text-white">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Free website <span className="text-gradient">security tools</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mb-12 leading-relaxed">
          Instant, no-signup checkers for the most common launch blockers — then upgrade to a full
          free website vulnerability scanner when you need OWASP, SEO, AEO, and CVE coverage in one
          pass.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card p-6 group hover:border-green-500/30 transition-colors"
            >
              <h2 className="text-xl font-bold mb-2 group-hover:text-green-400 transition-colors">
                {tool.title}
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">{tool.blurb}</p>
              <span className="text-xs text-green-400 font-medium">Open free tool →</span>
            </Link>
          ))}
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Full scanner & guides</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            These pages target the searches people type when they need a complete check — not just
            one header or certificate field.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3">
            {guides.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="block p-4 rounded-xl border border-white/5 bg-white/[0.02] text-sm text-gray-300 hover:text-green-400 hover:border-green-500/20 transition-colors"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Need everything at once?</h2>
          <p className="text-gray-400 text-sm mb-5">
            Run OverMCP’s free full scan: OWASP-style findings, secrets, headers, SSL signals, CVEs,
            SEO, and AEO.
          </p>
          <Link
            href="/#scan"
            className="inline-flex px-6 py-3 rounded-xl font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            Scan my site free
          </Link>
        </div>
      </main>
    </div>
  );
}

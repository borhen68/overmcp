import Link from "next/link";
import { serializeJsonLd } from "@/lib/json-ld";

export type ToolSeoConfig = {
  toolName: string;
  keyword: string;
  intro: string;
  whyHeading: string;
  whyBody: string;
  checks: string[];
  howHeading: string;
  howSteps: string[];
  faqs: { q: string; a: string }[];
  related: { href: string; label: string }[];
};

export function ToolSeoContent({ config }: { config: ToolSeoConfig }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use the free ${config.toolName}`,
    description: config.intro,
    step: config.howSteps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
  };

  return (
    <div className="mt-16 space-y-12 text-left max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(howToJsonLd) }}
      />

      <section>
        <h2 className="text-2xl font-bold mb-3">About this free {config.keyword}</h2>
        <p className="text-gray-400 leading-relaxed">{config.intro}</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">{config.whyHeading}</h2>
        <p className="text-gray-400 leading-relaxed mb-4">{config.whyBody}</p>
        <ul className="space-y-2">
          {config.checks.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-gray-300">
              <span className="text-green-400 shrink-0">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-3">{config.howHeading}</h2>
        <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm leading-relaxed">
          {config.howSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">FAQ</h2>
        <div className="space-y-3">
          {config.faqs.map((f) => (
            <div key={f.q} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <h3 className="font-semibold text-sm mb-1">{f.q}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="Related tools" className="pt-4">
        <h2 className="text-lg font-bold mb-3">Related free tools</h2>
        <div className="flex flex-wrap gap-2">
          {config.related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="text-sm text-gray-400 hover:text-green-400 border border-white/10 rounded-lg px-3 py-2 transition-colors"
            >
              {r.label}
            </Link>
          ))}
          <Link
            href="/"
            className="text-sm text-amber-400/90 hover:text-amber-300 border border-amber-500/20 rounded-lg px-3 py-2 transition-colors"
          >
            Full vulnerability scanner
          </Link>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Part of{" "}
          <Link href={baseUrl} className="underline hover:text-gray-400">
            OverMCP
          </Link>{" "}
          — free website vulnerability scanner for AI-built apps.
        </p>
      </nav>
    </div>
  );
}

export const HEADERS_SEO: ToolSeoConfig = {
  toolName: "Security Headers Checker",
  keyword: "security headers checker",
  intro:
    "This free security headers checker inspects any public URL for critical HTTP response headers that reduce XSS, clickjacking, MIME sniffing, and downgrade attacks. It returns a letter grade so you can fix gaps before launch.",
  whyHeading: "Why security headers matter",
  whyBody:
    "Browsers enforce security policies only when your server sends the right headers. AI-generated Next.js and static sites often ship with none configured on Vercel or Netlify.",
  checks: [
    "Content-Security-Policy (CSP)",
    "Strict-Transport-Security (HSTS)",
    "X-Frame-Options / frame-ancestors",
    "X-Content-Type-Options",
    "Referrer-Policy and Permissions-Policy",
  ],
  howHeading: "How to use this checker",
  howSteps: [
    "Paste your production or preview URL (include https://).",
    "Click Check — we fetch response headers only (read-only).",
    "Review missing headers and prioritize CSP + HSTS first.",
    "Add headers in next.config, vercel.json, or your CDN, then re-check.",
  ],
  faqs: [
    {
      q: "What is a good security headers grade?",
      a: "Aim for A. Grade B usually means one important header is weak or missing. C or lower means multiple browser protections are absent.",
    },
    {
      q: "Will CSP break my site?",
      a: "A strict CSP can block inline scripts and third-party tags. Start with report-only or a carefully allowlisted policy, then tighten.",
    },
    {
      q: "Is this the same as a full vulnerability scan?",
      a: "No. Headers are one layer. Use OverMCP’s full free scanner for secrets, OWASP issues, SSL, CVEs, and AEO gaps.",
    },
  ],
  related: [
    { href: "/tools/ssl", label: "SSL checker" },
    { href: "/tools/leak", label: "Secret leak scanner" },
    { href: "/free-website-vulnerability-scanner", label: "Vulnerability scanner" },
    { href: "/nextjs-security-scanner", label: "Next.js security scanner" },
  ],
};

export const SSL_SEO: ToolSeoConfig = {
  toolName: "SSL Certificate Checker",
  keyword: "SSL certificate checker",
  intro:
    "This free SSL certificate checker validates HTTPS configuration for any hostname — expiry, issuer chain basics, and whether the site presents a usable certificate for browsers.",
  whyHeading: "Why SSL checks still fail launches",
  whyBody:
    "Preview domains, custom domains, and mis-pointed DNS often leave sites on expired or mismatched certificates. Users and Google both penalize broken HTTPS.",
  checks: [
    "Certificate presence on the hostname",
    "Visible expiry window",
    "Issuer / chain signals from the TLS handshake",
    "HTTPS reachability of the URL you entered",
  ],
  howHeading: "How to check SSL in seconds",
  howSteps: [
    "Enter the exact hostname users type (www vs apex matters).",
    "Run the check and note days until expiry.",
    "If invalid, fix DNS and host TLS settings, then re-check.",
    "Enable auto-renewal (Let’s Encrypt, Vercel, Cloudflare) so this never pages you at 2am.",
  ],
  faqs: [
    {
      q: "Does a valid SSL mean my site is secure?",
      a: "TLS protects transport only. You still need auth, headers, secret hygiene, and vulnerability scanning for real security.",
    },
    {
      q: "Why does www work but apex fail?",
      a: "Certificates and DNS records are often issued for one hostname only. Cover both with SAN certs or redirects.",
    },
  ],
  related: [
    { href: "/tools/headers", label: "Security headers checker" },
    { href: "/tools/leak", label: "Secret leak scanner" },
    { href: "/website-security-checker", label: "Website security checker" },
  ],
};

export const LEAK_SEO: ToolSeoConfig = {
  toolName: "Secret Leak Scanner",
  keyword: "secret leak scanner",
  intro:
    "This free secret leak scanner looks for API keys and credentials that accidentally shipped in public web assets — the most common critical finding in AI-built apps.",
  whyHeading: "Why AI apps leak keys",
  whyBody:
    "Coding agents paste keys into client components to “make the demo work.” Those strings land in JS bundles, GitHub, and CDN caches where scrapers harvest them.",
  checks: [
    "OpenAI / AI provider key patterns",
    "Stripe secret key patterns",
    "AWS access key patterns",
    "Supabase service_role and Firebase patterns",
    "Private key and JWT-like material",
  ],
  howHeading: "How to scan for leaked secrets",
  howSteps: [
    "Paste your live site URL.",
    "Run the leak scan on public assets.",
    "If anything is found, rotate keys at the provider immediately.",
    "Move secrets to server-only env vars and re-scan.",
  ],
  faqs: [
    {
      q: "I found a key — what now?",
      a: "Revoke it first, then remove it from code and git history, then audit provider logs for abuse. Re-scan until clean.",
    },
    {
      q: "Are false positives possible?",
      a: "Pattern matchers can flag lookalikes. Always verify in context before rotating production credentials.",
    },
  ],
  related: [
    { href: "/api-key-leak-scanner", label: "API key leak scanner guide" },
    { href: "/tools/headers", label: "Security headers checker" },
    { href: "/ai-app-security-scanner", label: "AI app security scanner" },
  ],
};

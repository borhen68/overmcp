import Link from "next/link";
import type { SeoLanding } from "@/lib/seo-landings";
import { serializeJsonLd } from "@/lib/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

export function SeoLandingPage({ page }: { page: SeoLanding }) {
  const url = `${baseUrl}/${page.slug}`;

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    isPartOf: { "@id": `${baseUrl}/#website` },
    about: { "@type": "Thing", name: page.keyword },
    primaryImageOfPage: `${baseUrl}/opengraph-image`,
    inLanguage: "en-US",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: page.h1, item: url },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "OverMCP",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    url: baseUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free website security scan",
    },
    description: page.description,
  };

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(softwareJsonLd) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gradient">
            OverMCP
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/#scan" className="text-gray-400 hover:text-white transition-colors">
              Free scan
            </Link>
            <Link href="/tools/headers" className="text-gray-400 hover:text-white transition-colors">
              Tools
            </Link>
            <Link href="/blog" className="text-gray-400 hover:text-white transition-colors">
              Blog
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-14">
        <p className="text-xs font-medium tracking-wide uppercase text-amber-500/80 mb-3">
          Free online security tool
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">{page.h1}</h1>
        <p className="text-lg text-gray-400 leading-relaxed mb-8">{page.heroSub}</p>

        <div className="mb-10 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
          <p className="text-sm font-semibold text-amber-400 mb-2">Quick answer</p>
          <p className="text-gray-200 leading-relaxed">{page.quickAnswer}</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-14">
          <Link
            href={page.ctaHref}
            className="inline-flex px-6 py-3 rounded-xl font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 transition-all"
          >
            {page.cta}
          </Link>
          <Link
            href="/blog"
            className="inline-flex px-6 py-3 rounded-xl font-medium text-gray-300 border border-white/10 hover:border-white/20 transition-colors"
          >
            Read security guides
          </Link>
        </div>

        <article className="space-y-12">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
              {section.body.map((para) => (
                <p key={para.slice(0, 40)} className="text-gray-300 leading-relaxed mb-3">
                  {para}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-2 text-gray-300 text-sm leading-relaxed">
                      <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-bold mb-6">FAQ</h2>
            <div className="space-y-4">
              {page.faqs.map((f) => (
                <div
                  key={f.q}
                  className="p-5 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <h3 className="font-semibold text-white mb-2">{f.q}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <div className="mt-14 p-8 rounded-2xl text-center border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.06] to-transparent">
          <h2 className="text-xl font-bold mb-2">Ready to check your site?</h2>
          <p className="text-gray-400 text-sm mb-5">
            Free {page.keyword} results in about 30 seconds. No signup.
          </p>
          <Link
            href={page.ctaHref}
            className="inline-block px-6 py-3 rounded-xl font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 transition-colors"
          >
            {page.cta}
          </Link>
        </div>

        {page.related.length > 0 && (
          <nav className="mt-14 pt-10 border-t border-white/5" aria-label="Related pages">
            <h2 className="font-bold text-lg mb-4">Related</h2>
            <ul className="flex flex-wrap gap-3">
              {page.related.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="text-sm text-gray-400 hover:text-green-400 border border-white/10 hover:border-green-500/30 rounded-lg px-3 py-2 transition-colors"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </main>
    </div>
  );
}

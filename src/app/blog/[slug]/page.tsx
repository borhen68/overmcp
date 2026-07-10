import { getPostBySlug, getRelatedPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";

// Cacheable HTML helps Google crawl efficiently; new posts appear within an hour.
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  try { post = await getPostBySlug(slug); } catch { /* DB not ready */ }
  if (!post) {
    return {
      title: "Post Not Found",
      robots: { index: false, follow: true },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

  return {
    // absolute avoids the root title template appending " | OverMCP" twice/over-length.
    title: { absolute: post.metaTitle },
    description: post.metaDescription,
    keywords: post.tags,
    authors: [{ name: "OverMCP Team", url: baseUrl }],
    publisher: "OverMCP",
    category: "technology",
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      url: `${baseUrl}/blog/${post.slug}`,
      siteName: "OverMCP",
      locale: "en_US",
      images: [
        {
          url: `${baseUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [`${baseUrl}/opengraph-image`],
    },
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
      types: {
        "application/rss+xml": `${baseUrl}/rss.xml`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractToc(content: string): { id: string; text: string; level: 2 | 3 }[] {
  const toc: { id: string; text: string; level: 2 | 3 }[] = [];
  const used = new Set<string>();
  let inCode = false;
  for (const line of content.split("\n")) {
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const raw = h2?.[1] || h3?.[1];
    if (!raw) continue;
    if (/^faq|frequently asked/i.test(raw) && h2) {
      // include FAQ in TOC
    }
    let id = slugifyHeading(raw);
    if (!id) continue;
    if (used.has(id)) id = `${id}-${used.size}`;
    used.add(id);
    toc.push({ id, text: raw.trim(), level: h2 ? 2 : 3 });
  }
  return toc;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";
  const usedIds = new Set<string>();

  const headingId = (text: string) => {
    let id = slugifyHeading(text);
    if (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);
    return id;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-gray-950/80 border border-white/5 rounded-xl p-5 overflow-x-auto my-6">
            <code data-language={codeLanguage || undefined} className="text-sm text-green-300 font-mono whitespace-pre">{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      const text = line.slice(3);
      const id = headingId(text);
      elements.push(
        <h2 key={i} id={id} className="text-2xl font-bold mt-10 mb-4 scroll-mt-24">
          <a href={`#${id}`} className="hover:text-green-400 transition-colors no-underline">
            {text}
          </a>
        </h2>
      );
    } else if (line.startsWith("### ")) {
      const text = line.slice(4);
      const id = headingId(text);
      elements.push(
        <h3 key={i} id={id} className="text-xl font-semibold mt-8 mb-3 scroll-mt-24">
          <a href={`#${id}`} className="hover:text-green-400 transition-colors no-underline">
            {text}
          </a>
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-gray-300 leading-relaxed ml-4 flex items-start gap-2 mb-2">
          <span className="text-green-400 mt-1.5 shrink-0">&#x2022;</span>
          <span>{formatInline(line.slice(2))}</span>
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\.\s*/, "");
      elements.push(
        <li key={i} className="text-gray-300 leading-relaxed ml-4 mb-2 list-decimal list-inside">
          {formatInline(text)}
        </li>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-green-500/30 pl-4 my-4 text-gray-400 italic">
          {formatInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-4" />);
    } else {
      elements.push(
        <p key={i} className="text-gray-300 leading-relaxed mb-4">{formatInline(line)}</p>
      );
    }
  }

  return <div className="prose-custom">{elements}</div>;
}

// Parse the "## FAQ" section of a markdown post into question/answer pairs.
// Questions are "### ..." headings; the answer is the text until the next heading.
function extractFaqs(content: string): { question: string; answer: string }[] {
  const lines = content.split("\n");
  const faqs: { question: string; answer: string }[] = [];
  let inFaq = false;
  let current: { question: string; answer: string } | null = null;

  for (const line of lines) {
    const heading2 = line.match(/^##\s+(.*)/);
    if (heading2) {
      // Entering the FAQ section, or leaving it for another ## section.
      if (/faq|frequently asked/i.test(heading2[1])) {
        inFaq = true;
      } else if (inFaq) {
        break;
      }
      continue;
    }
    if (!inFaq) continue;

    const question = line.match(/^###\s+(.*)/);
    if (question) {
      if (current && current.answer.trim()) faqs.push(current);
      current = { question: question[1].trim(), answer: "" };
    } else if (current && line.trim()) {
      // Strip markdown emphasis/code markers so the schema text is clean.
      current.answer += (current.answer ? " " : "") + line.replace(/[*`>]/g, "").trim();
    }
  }
  if (current && current.answer.trim()) faqs.push(current);
  return faqs;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\((?:https?:\/\/|\/|#)[^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const className = "text-green-300 underline decoration-green-500/40 underline-offset-4 hover:text-green-200";
      if (href.startsWith("/")) {
        return <Link key={i} href={href} className={className}>{formatInline(label)}</Link>;
      }
      return (
        <a key={i} href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
          {formatInline(label)}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="italic text-gray-200">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-green-300 text-sm font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  try { post = await getPostBySlug(slug); } catch { /* DB not ready */ }

  if (!post) notFound();

  let related: Awaited<ReturnType<typeof getRelatedPosts>> = [];
  try {
    related = await getRelatedPosts(post, 4);
  } catch { /* ignore */ }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";
  const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 220));
  const toc = extractToc(post.content).filter((t) => t.level === 2).slice(0, 12);

  // Extract the "## Quick answer" block for speakable / AI-citation signals (AEO/GEO).
  const quickAnswerMatch = post.content.match(
    /##\s+Quick answer\s*\n+([\s\S]*?)(?=\n##\s+)/i
  );
  const quickAnswer = quickAnswerMatch
    ? quickAnswerMatch[1].replace(/[*`>#]/g, "").replace(/\s+/g, " ").trim().slice(0, 500)
    : post.excerpt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${baseUrl}/blog/${post.slug}#article`,
    url: `${baseUrl}/blog/${post.slug}`,
    headline: post.title,
    description: post.excerpt,
    abstract: quickAnswer,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    keywords: post.tags.join(", "),
    articleSection: post.tags[0] || "AI app security",
    wordCount,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    about: post.tags.map((tag) => ({ "@type": "Thing", name: tag })),
    author: {
      "@type": "Organization",
      name: "OverMCP",
      url: baseUrl,
      "@id": `${baseUrl}/#organization`,
    },
    publisher: {
      "@type": "Organization",
      name: "OverMCP",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon` },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}`,
    },
    image: {
      "@type": "ImageObject",
      url: `${baseUrl}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "article h2"],
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${baseUrl}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${baseUrl}/blog/${post.slug}`,
      },
    ],
  };

  // Pull the post's "## FAQ" Q&A pairs into FAQPage structured data — this is
  // what earns featured snippets and lets ChatGPT/Claude quote the answers.
  const faqs = extractFaqs(post.content);
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      )}

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gradient">OverMCP</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Scan</Link>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-400 transition-colors mb-8">
          &larr; All posts
        </Link>

        <article>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 border border-green-500/20 text-green-400">
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-green-400">O</span>
            </div>
            <div>
              <p className="text-sm font-medium">OverMCP Team</p>
              <p className="text-xs text-gray-500">
                <time dateTime={post.publishedAt}>
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                <span className="mx-1.5">·</span>
                <span>{readingMinutes} min read</span>
                <span className="mx-1.5">·</span>
                <span>{wordCount.toLocaleString()} words</span>
              </p>
            </div>
          </div>

          {toc.length >= 3 && (
            <nav
              aria-label="Table of contents"
              className="mb-10 p-5 rounded-xl border border-white/5 bg-white/[0.02]"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                On this page
              </p>
              <ol className="space-y-2">
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <MarkdownRenderer content={post.content} />
        </article>

        {/* Commercial internal links — pass PageRank to money pages */}
        <aside className="mt-12 p-6 rounded-xl border border-white/5 bg-white/[0.02]">
          <p className="text-sm font-semibold text-white mb-3">Free security tools</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li>
              <Link href="/free-website-vulnerability-scanner" className="text-green-400/90 hover:text-green-300 underline-offset-2 hover:underline">
                Vulnerability scanner
              </Link>
            </li>
            <li className="text-gray-600">·</li>
            <li>
              <Link href="/tools/headers" className="text-green-400/90 hover:text-green-300 underline-offset-2 hover:underline">
                Headers checker
              </Link>
            </li>
            <li className="text-gray-600">·</li>
            <li>
              <Link href="/tools/leak" className="text-green-400/90 hover:text-green-300 underline-offset-2 hover:underline">
                Secret leak scanner
              </Link>
            </li>
            <li className="text-gray-600">·</li>
            <li>
              <Link href="/ai-app-security-scanner" className="text-green-400/90 hover:text-green-300 underline-offset-2 hover:underline">
                AI app scanner
              </Link>
            </li>
          </ul>
        </aside>

        {/* CTA */}
        <div className="mt-10 p-8 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 100%)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <h2 className="text-xl font-bold mb-2">Is your app secure?</h2>
          <p className="text-gray-400 text-sm mb-5">Free website vulnerability scan in 30 seconds. No signup needed.</p>
          <Link
            href="/#scan"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 transition-all"
          >
            Scan My App Free
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/5">
            <h2 className="font-bold text-lg mb-6">Related posts</h2>
            <div className="grid gap-4">
              {related.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-green-500/20 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-green-400 transition-colors truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{p.excerpt}</p>
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

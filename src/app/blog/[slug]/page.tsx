import { getPostBySlug, getAllPosts } from "@/lib/blog";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof getPostBySlug>> = null;
  try { post = await getPostBySlug(slug); } catch { /* DB not ready */ }
  if (!post) return { title: "Post Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://overmcp.com";

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt,
      url: `${baseUrl}/blog/${post.slug}`,
      siteName: "OverMCP",
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
    },
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
    },
  };
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-gray-950/80 border border-white/5 rounded-xl p-5 overflow-x-auto my-6">
            <code className="text-sm text-green-300 font-mono whitespace-pre">{codeLines.join("\n")}</code>
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
      elements.push(<h2 key={i} className="text-2xl font-bold mt-10 mb-4">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-xl font-semibold mt-8 mb-3">{line.slice(4)}</h3>);
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

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
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

  let related: Awaited<ReturnType<typeof getAllPosts>> = [];
  try {
    const allPosts = await getAllPosts(10);
    related = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  } catch { /* ignore */ }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: "OverMCP" },
    publisher: { "@type": "Organization", name: "OverMCP", url: "https://overmcp.com" },
    mainEntityOfPage: `https://overmcp.com/blog/${post.slug}`,
  };

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70">
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

          <div className="flex items-center gap-4 mb-10 pb-8 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-green-400">O</span>
            </div>
            <div>
              <p className="text-sm font-medium">OverMCP Team</p>
              <time className="text-xs text-gray-500">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>

          <MarkdownRenderer content={post.content} />
        </article>

        {/* CTA */}
        <div className="mt-16 p-8 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <h3 className="text-xl font-bold mb-2">Is your app secure?</h3>
          <p className="text-gray-400 text-sm mb-5">Free scan in 30 seconds. No signup needed.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 transition-all"
          >
            Scan My App Free
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-white/5">
            <h3 className="font-bold text-lg mb-6">Related posts</h3>
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

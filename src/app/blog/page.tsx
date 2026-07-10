import Link from "next/link";
import { getAllPostsForIndex } from "@/lib/blog";
import { serializeJsonLd } from "@/lib/json-ld";

// Revalidate hourly so Google can crawl a stable, cacheable HTML document
// while still picking up newly generated posts within an hour.
export const revalidate = 3600;

export default async function BlogPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";
  let posts: Awaited<ReturnType<typeof getAllPostsForIndex>> = [];
  try {
    // List every post so crawlers and users can discover the full archive.
    posts = await getAllPostsForIndex(500);
  } catch {
    posts = [];
  }

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${baseUrl}/blog#blog`,
    name: "OverMCP Blog — AI App Security",
    description:
      "Practical security, SEO, AEO, and GEO guides for developers shipping apps built with AI coding tools.",
    url: `${baseUrl}/blog`,
    publisher: {
      "@type": "Organization",
      name: "OverMCP",
      url: baseUrl,
      logo: { "@type": "ImageObject", url: `${baseUrl}/icon` },
    },
    blogPost: posts.slice(0, 50).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${baseUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      description: post.excerpt,
    })),
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.slice(0, 50).map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/blog/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gradient">OverMCP</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
              Scan
            </Link>
            <Link href="/blog" className="text-sm text-white font-medium">
              Blog
            </Link>
            <a
              href="/rss.xml"
              className="text-sm text-gray-400 hover:text-white transition-colors"
              rel="alternate"
              type="application/rss+xml"
            >
              RSS
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Security for <span className="text-gradient">Vibe Coders</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Practical security, SEO, AEO, and GEO guides for developers who build fast with AI.
            No gatekeeping — just fixes.
          </p>
          {posts.length > 0 && (
            <p className="text-sm text-gray-600 mt-3">
              {posts.length} guides · updated daily
            </p>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">First posts coming soon...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group card p-6 flex flex-col"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 border border-green-500/20 text-green-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-green-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-400 flex-1 leading-relaxed">{post.excerpt}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <time
                    className="text-xs text-gray-600"
                    dateTime={post.publishedAt}
                  >
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                  <span className="text-xs text-green-400 font-medium group-hover:translate-x-1 transition-transform">
                    Read more &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

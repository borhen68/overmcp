import { MetadataRoute } from "next";
import { getAllPostsForIndex } from "@/lib/blog";
import { SEO_LANDINGS } from "@/lib/seo-landings";

// Always render from the live DB so newly generated posts appear immediately
// for Googlebot. Static empty sitemaps at build time were a real indexing gap.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools/headers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/tools/ssl`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/tools/leak`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/bulk`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/connect`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/connect/vercel`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    {
      url: `${baseUrl}/badge`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: `${baseUrl}/monitor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rss.xml`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // High-intent commercial landings (money keywords).
  const landingRoutes: MetadataRoute.Sitemap = SEO_LANDINGS.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: page.priority ?? 0.85,
  }));

  // Include EVERY published post (not topic-deduped).
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllPostsForIndex(10_000);
    const newest = posts[0] ? new Date(posts[0].publishedAt).getTime() : Date.now();
    blogRoutes = posts.map((post) => {
      const ageDays =
        (newest - new Date(post.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      // Fresher posts get slightly higher priority so Google recrawls them sooner.
      const priority = ageDays < 14 ? 0.8 : ageDays < 60 ? 0.7 : 0.6;
      return {
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: "monthly" as const,
        priority,
      };
    });
  } catch {
    blogRoutes = [];
  }

  return [...staticRoutes, ...landingRoutes, ...blogRoutes];
}

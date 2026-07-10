import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API routes + private/user-specific surfaces should not burn crawl budget.
        disallow: ["/api/", "/dashboard", "/report/"],
      },
      // OpenAI: training crawler, live-search crawler, and in-chat fetcher
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      // Anthropic / Claude: training crawler + in-chat fetcher (+ legacy name)
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      // Perplexity
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      // Google Gemini / Vertex AI grounding
      { userAgent: "Google-Extended", allow: "/" },
      // Common Crawl (feeds many open LLM training sets)
      { userAgent: "CCBot", allow: "/" },
      // Apple Intelligence
      { userAgent: "Applebot-Extended", allow: "/" },
      // Bing / Copilot
      { userAgent: "Bingbot", allow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

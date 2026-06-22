import axios from "axios";
import { assertSafeUrl } from "./url-guard";

// Validate the destination host (SSRF guard) before every request, then fetch.
async function safeFetch(targetUrl: string, opts: Record<string, unknown>) {
  await assertSafeUrl(targetUrl);
  return axios.get(targetUrl, opts);
}

export interface CrawledFile {
  name: string;
  content: string;
  type: "html" | "js" | "css" | "source-map" | "inline" | "endpoints";
}

export interface CrawlResult {
  url: string;
  platform: "vercel" | "netlify" | "cloudflare" | "railway" | "github-pages" | "unknown";
  files: CrawledFile[];
  pagesCrawled: string[];
  endpoints: string[];
}

function detectPlatform(url: string, headers: Record<string, string>): CrawlResult["platform"] {
  const serverHeader = (headers["server"] || "").toLowerCase();
  const xPoweredBy = (headers["x-powered-by"] || "").toLowerCase();

  if (url.includes(".vercel.app") || serverHeader.includes("vercel")) return "vercel";
  if (url.includes(".netlify.app") || headers["x-nf-request-id"]) return "netlify";
  if (url.includes(".pages.dev") || serverHeader.includes("cloudflare")) return "cloudflare";
  if (url.includes(".up.railway.app") || xPoweredBy.includes("railway")) return "railway";
  if (url.includes(".github.io")) return "github-pages";
  return "unknown";
}

// How far we crawl. Multi-page so we see more than the landing page, but
// bounded so a scan stays fast and polite.
const MAX_PAGES = 5;
const MAX_ASSETS = 15;
const MAX_FILES = 24;

// Pull internal, same-origin page links out of an HTML document.
export function extractInternalLinks(html: string, baseUrl: string, origin: string): string[] {
  const links = new Set<string>();
  const matches = html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi);
  for (const m of matches) {
    const href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const abs = new URL(href, baseUrl).href;
      const u = new URL(abs);
      if (u.origin !== origin) continue; // same-origin only
      // Skip obvious asset/file links — we want HTML pages.
      if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|mjs|json|xml|txt|pdf|zip|woff2?|ttf)(\?|$)/i.test(u.pathname)) continue;
      u.hash = "";
      links.add(u.href);
    } catch {
      // ignore malformed URLs
    }
  }
  return Array.from(links);
}

// Discover API endpoints referenced in client code. This surfaces the server
// attack surface (which a pure HTML scan misses) without us probing anything —
// we only read what the app already ships to the browser.
export function extractEndpoints(content: string, origin: string): string[] {
  const found = new Set<string>();
  const patterns = [
    // fetch("/api/..."), axios.get('/api/...'), etc.
    /["'`](\/(?:api|graphql|trpc|rest|v\d+)\/[A-Za-z0-9._\-/[\]:]*)["'`]/g,
    // absolute same-origin API URLs
    new RegExp(`["'\`](https?://[^"'\`]*${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"'\`]*\\/(?:api|graphql|trpc)\\/[A-Za-z0-9._\\-/]*)["'\`]`, "g"),
  ];
  for (const re of patterns) {
    for (const m of content.matchAll(re)) {
      const ep = m[1];
      if (ep && ep.length < 200) found.add(ep);
    }
  }
  return Array.from(found);
}

export async function crawlSite(inputUrl: string): Promise<CrawlResult> {
  // Normalize + SSRF-validate the entered URL.
  let url = inputUrl.trim();
  if (!url.startsWith("http")) url = `https://${url}`;
  url = await assertSafeUrl(url);
  const origin = new URL(url).origin;

  const files: CrawledFile[] = [];
  const assetUrls = new Set<string>();
  const endpoints = new Set<string>();
  const pagesCrawled: string[] = [];

  // 1. BFS over a few same-origin pages, starting at the entered URL.
  const queue: string[] = [url];
  const visited = new Set<string>();
  let platform: CrawlResult["platform"] = "unknown";

  while (queue.length > 0 && pagesCrawled.length < MAX_PAGES) {
    const pageUrl = queue.shift()!;
    if (visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    let html: string;
    try {
      const res = await safeFetch(pageUrl, {
        headers: { "User-Agent": "OverMCP-Scanner/1.0" },
        timeout: 15000,
        maxContentLength: 2_000_000,
      });
      html = typeof res.data === "string" ? res.data : "";
      if (pagesCrawled.length === 0) {
        platform = detectPlatform(pageUrl, res.headers as Record<string, string>);
      }
    } catch {
      continue;
    }

    pagesCrawled.push(pageUrl);

    // Store the page HTML (only a handful, to keep the payload bounded).
    if (files.filter((f) => f.type === "html").length < MAX_PAGES) {
      const rel = pageUrl === url ? "index.html" : new URL(pageUrl).pathname.replace(/\/$/, "") + ".html";
      files.push({ name: rel.replace(/^\//, "") || "index.html", content: html.slice(0, 100000), type: "html" });
    }

    // Collect asset references.
    for (const m of html.matchAll(/(?:src|href)=["']([^"']*\.(?:js|css|mjs)(?:\?[^"']*)?)["']/g)) {
      let assetUrl = m[1];
      if (assetUrl.startsWith("//")) assetUrl = `https:${assetUrl}`;
      else if (assetUrl.startsWith("/")) assetUrl = new URL(assetUrl, pageUrl).href;
      else if (!assetUrl.startsWith("http")) assetUrl = new URL(assetUrl, pageUrl).href;
      if (assetUrl.includes("cdn.") || assetUrl.includes("googleapis")) continue;
      if (assetUrl.includes("chunk-") || assetUrl.includes("vendor")) continue;
      assetUrls.add(assetUrl);
    }

    // Endpoints referenced inline in the HTML (e.g. <script> blobs).
    for (const ep of extractEndpoints(html, origin.replace(/^https?:\/\//, ""))) endpoints.add(ep);

    // Queue more same-origin pages.
    for (const link of extractInternalLinks(html, pageUrl, origin)) {
      if (!visited.has(link) && queue.length + pagesCrawled.length < MAX_PAGES * 3) queue.push(link);
    }
  }

  // 2. Fetch the collected JS/CSS assets (bounded).
  const assetList = Array.from(assetUrls).slice(0, MAX_ASSETS);
  await Promise.allSettled(
    assetList.map(async (assetUrl) => {
      try {
        const { data: content } = await safeFetch(assetUrl, {
          timeout: 10000,
          responseType: "text",
          maxContentLength: 100000,
        });
        if (typeof content === "string" && content.length > 0 && content.length <= 100000) {
          const name = assetUrl.split("/").pop()?.split("?")[0] || "unknown";
          const ext = name.split(".").pop()?.toLowerCase();
          files.push({ name, content, type: ext === "css" ? "css" : "js" });
          // Mine endpoints out of JS bundles.
          if (ext !== "css") {
            for (const ep of extractEndpoints(content, origin.replace(/^https?:\/\//, ""))) endpoints.add(ep);
          }
        }
      } catch {
        // skip failed fetches
      }
    })
  );

  // 3. Try to find source maps (reveals original source).
  for (const file of [...files]) {
    if (file.type !== "js") continue;
    const sourceMapMatch = file.content.match(/\/\/# sourceMappingURL=(.+)/);
    if (sourceMapMatch) {
      let mapUrl = sourceMapMatch[1].trim();
      if (mapUrl.startsWith("/")) mapUrl = new URL(mapUrl, url).href;
      else if (!mapUrl.startsWith("http")) {
        mapUrl = new URL(mapUrl, url + "/").href;
      }
      try {
        const { data: mapData } = await safeFetch(mapUrl, { timeout: 10000, maxContentLength: 500000 });
        if (mapData && mapData.sources && mapData.sourcesContent) {
          const sources = mapData.sources as string[];
          const contents = mapData.sourcesContent as string[];
          for (let i = 0; i < sources.length && files.length < MAX_FILES; i++) {
            const sourcePath = sources[i];
            if (!sourcePath || !contents[i]) continue;
            if (sourcePath.includes("node_modules")) continue;
            if (contents[i].length > 100000) continue;
            files.push({
              name: sourcePath.replace(/^.*\/src\//, "src/").replace(/^\.\//, ""),
              content: contents[i],
              type: "source-map",
            });
          }
        }
      } catch {
        // source map not accessible
      }
    }
  }

  // 4. Add discovered endpoints as a synthetic file so the AI audit reasons
  //    about the server attack surface, and the user sees what's exposed.
  const endpointList = Array.from(endpoints).sort();
  if (endpointList.length > 0) {
    files.push({
      name: "discovered-api-endpoints.txt",
      content:
        `API endpoints referenced by the client code (discovered, not probed):\n\n` +
        endpointList.map((e) => `- ${e}`).join("\n") +
        `\n\nReview each for missing authentication/authorization, rate limiting, and input validation.`,
      type: "endpoints",
    });
  }

  return {
    url,
    platform,
    files: files.slice(0, MAX_FILES),
    pagesCrawled,
    endpoints: endpointList,
  };
}

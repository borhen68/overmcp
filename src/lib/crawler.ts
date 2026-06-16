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
  type: "html" | "js" | "css" | "source-map" | "inline";
}

export interface CrawlResult {
  url: string;
  platform: "vercel" | "netlify" | "cloudflare" | "railway" | "github-pages" | "unknown";
  files: CrawledFile[];
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

export async function crawlSite(inputUrl: string): Promise<CrawlResult> {
  // Normalize + SSRF-validate the entered URL.
  let url = inputUrl.trim();
  if (!url.startsWith("http")) url = `https://${url}`;
  url = await assertSafeUrl(url);

  const files: CrawledFile[] = [];

  // 1. Fetch the main HTML page
  const { data: html, headers } = await safeFetch(url, {
    headers: { "User-Agent": "OverMCP-Scanner/1.0" },
    timeout: 15000,
  });

  const platform = detectPlatform(url, headers as Record<string, string>);

  files.push({
    name: "index.html",
    content: typeof html === "string" ? html.slice(0, 100000) : "",
    type: "html",
  });

  // 2. Extract linked JS/CSS files from HTML
  const scriptMatches = (typeof html === "string" ? html : "").matchAll(
    /(?:src|href)=["']([^"']*\.(?:js|css|mjs)(?:\?[^"']*)?)["']/g
  );

  const assetUrls = new Set<string>();
  for (const match of scriptMatches) {
    let assetUrl = match[1];
    if (assetUrl.startsWith("//")) assetUrl = `https:${assetUrl}`;
    else if (assetUrl.startsWith("/")) assetUrl = new URL(assetUrl, url).href;
    else if (!assetUrl.startsWith("http")) assetUrl = new URL(assetUrl, url).href;

    // Skip external CDNs and large bundles
    if (assetUrl.includes("cdn.") || assetUrl.includes("googleapis")) continue;
    if (assetUrl.includes("chunk-") || assetUrl.includes("vendor")) continue;

    assetUrls.add(assetUrl);
  }

  // 3. Fetch each asset (limit to 15)
  const assetList = Array.from(assetUrls).slice(0, 15);

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
          files.push({
            name,
            content,
            type: ext === "css" ? "css" : "js",
          });
        }
      } catch {
        // skip failed fetches
      }
    })
  );

  // 4. Try to find source maps (reveals original source)
  for (const file of [...files]) {
    if (file.type !== "js") continue;
    const sourceMapMatch = file.content.match(/\/\/# sourceMappingURL=(.+)/);
    if (sourceMapMatch) {
      let mapUrl = sourceMapMatch[1].trim();
      if (mapUrl.startsWith("/")) mapUrl = new URL(mapUrl, url).href;
      else if (!mapUrl.startsWith("http")) {
        const base = file.name.includes("/")
          ? url + "/" + file.name.replace(/\/[^/]+$/, "/")
          : url + "/";
        mapUrl = new URL(mapUrl, base).href;
      }

      try {
        const { data: mapData } = await safeFetch(mapUrl, {
          timeout: 10000,
          maxContentLength: 500000,
        });

        if (mapData && mapData.sources && mapData.sourcesContent) {
          const sources = mapData.sources as string[];
          const contents = mapData.sourcesContent as string[];

          for (let i = 0; i < sources.length && files.length < 20; i++) {
            const sourcePath = sources[i];
            if (!sourcePath || !contents[i]) continue;
            if (sourcePath.includes("node_modules")) continue;
            if (contents[i].length > 100000) continue;

            files.push({
              name: sourcePath.replace(/^.*\/src\//, "src/").replace(/^\.\//,""),
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

  return { url, platform, files: files.slice(0, 20) };
}

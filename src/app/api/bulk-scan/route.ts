import { NextRequest, NextResponse, after } from "next/server";
import { crawlSite } from "@/lib/crawler";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { analyzeAEO } from "@/lib/aeo";
import { analyzePerformance } from "@/lib/performance";
import { scanDependencies } from "@/lib/dependencies";
import { scanSecrets } from "@/lib/secrets";
import { analyzeAccessibility } from "@/lib/accessibility";
import { detectTechStack } from "@/lib/techstack";
import { setScan, updateScan, flushScan } from "@/lib/store";
import { rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const { allowed } = rateLimit(ip, 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded for bulk scan. Try again in an hour." },
        { status: 429 }
      );
    }

    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 });
    }

    if (urls.length > 10) {
      return NextResponse.json({ error: "Maximum 10 URLs per bulk scan" }, { status: 400 });
    }

    const scanIds: { url: string; scanId: string }[] = [];

    for (const url of urls) {
      if (typeof url !== "string" || url.length < 4) continue;

      const scanId = randomUUID();
      scanIds.push({ url, scanId });

      setScan(scanId, {
        id: scanId,
        createdAt: new Date().toISOString(),
        status: "scanning",
        paid: false,
        tier: "free",
        url,
        files: [],
      });

      await flushScan(scanId);

      // Run each scan in the background; `after` keeps the function alive on serverless.
      after(async () => {
        try {
          const crawlResult = await crawlSite(url);
          if (crawlResult.files.length === 0) {
            updateScan(scanId, { status: "error", error: "Could not crawl site" });
            return;
          }

          const analysisFiles = crawlResult.files.map((f) => ({ name: f.name, content: f.content }));
          updateScan(scanId, { files: analysisFiles, url, platform: crawlResult.platform });

          const [result, aeoResult, perfResult, cveResult] = await Promise.all([
            analyzeMultipleFiles(analysisFiles),
            analyzeAEO(analysisFiles, url).catch(() => null),
            analyzePerformance(analysisFiles).catch(() => null),
            scanDependencies(analysisFiles).catch(() => null),
          ]);

          updateScan(scanId, {
            status: "done",
            result,
            ...(aeoResult ? { aeo: aeoResult } : {}),
            ...(perfResult ? { performance: perfResult } : {}),
            ...(cveResult ? { dependencies: cveResult } : {}),
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Scan failed";
          updateScan(scanId, { status: "error", error: message });
        } finally {
          await flushScan(scanId);
        }
      });
    }

    return NextResponse.json({ scans: scanIds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bulk scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse, after } from "next/server";
import { crawlSite } from "@/lib/crawler";
import { analyzeMultipleFiles, verifyVulnerabilities } from "@/lib/deepseek";
import { analyzeAEO } from "@/lib/aeo";
import { analyzePerformance } from "@/lib/performance";
import { scanDependencies } from "@/lib/dependencies";
import { scanSecrets } from "@/lib/secrets";
import { analyzeAccessibility } from "@/lib/accessibility";
import { detectTechStack } from "@/lib/techstack";
import { setScan, updateScan, getScan, flushScan } from "@/lib/store";
import { sendReportReady } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

// Scans run AI analysis across multiple files — allow time for the work that
// continues (via `after`) once the initial response is sent.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const { allowed, remaining } = rateLimit(ip, 10, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in an hour." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const cleaned = url.trim().replace(/^https?:\/\//, "");
    if (!cleaned || cleaned.length < 4 || !cleaned.includes(".")) {
      return NextResponse.json(
        { error: "Enter a valid URL (e.g. myapp.vercel.app)" },
        { status: 400 }
      );
    }

    const scanId = randomUUID();

    setScan(scanId, {
      id: scanId,
      createdAt: new Date().toISOString(),
      status: "scanning",
      paid: false,
      tier: "free",
      url,
      files: [],
    });

    // Persist the initial "scanning" record before responding so polling from a
    // different serverless instance sees it instead of a 404.
    await flushScan(scanId);

    after(async () => {
      try {
        updateScan(scanId, { progress: "Crawling your site & extracting code…" });
        const crawlResult = await crawlSite(url);

        if (crawlResult.files.length === 0) {
          updateScan(scanId, {
            status: "error",
            error: "Could not find any code files on this site. Make sure the URL is correct and the site is live.",
          });
          return;
        }

        const analysisFiles = crawlResult.files.map((f) => ({
          name: f.name,
          content: f.content,
        }));

        updateScan(scanId, {
          files: analysisFiles,
          url,
          platform: crawlResult.platform,
          progress: `Found ${analysisFiles.length} files — auditing for vulnerabilities…`,
        });

        // Run all analyses in parallel — AI-powered + static checks
        const [rawResult, aeoResult, perfResult, cveResult] = await Promise.all([
          analyzeMultipleFiles(analysisFiles),
          analyzeAEO(analysisFiles, url).catch(() => null),
          analyzePerformance(analysisFiles).catch(() => null),
          scanDependencies(analysisFiles).catch(() => null),
        ]);

        // Second-pass adversarial verification drops unprovable findings so we
        // never show a user a vulnerability we can't point to in their code.
        const found = rawResult.vulnerabilities?.length || 0;
        updateScan(scanId, {
          progress: found > 0 ? `Verifying ${found} finding${found > 1 ? "s" : ""} to remove false positives…` : "Finalizing report…",
        });
        const result = await verifyVulnerabilities(analysisFiles, rawResult).catch(() => rawResult);

        // Instant local checks (no API calls)
        const secretsResult = scanSecrets(analysisFiles);
        const a11yResult = analyzeAccessibility(analysisFiles);
        const techResult = detectTechStack(analysisFiles, crawlResult.platform);

        updateScan(scanId, {
          status: "done",
          result,
          ...(aeoResult ? { aeo: aeoResult } : {}),
          ...(perfResult ? { performance: perfResult } : {}),
          ...(cveResult ? { dependencies: cveResult } : {}),
          secrets: secretsResult,
          accessibility: a11yResult,
          techStack: techResult,
        });

        // Send email notification if user provided email
        const current = getScan(scanId);
        if (current?.email) {
          sendReportReady(current.email, scanId, url, result.summary).catch(() => {});
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Scan failed";
        updateScan(scanId, {
          status: "error",
          error: message.includes("timeout")
            ? "Site took too long to respond. Make sure it's live and accessible."
            : message.includes("404") || message.includes("ENOTFOUND")
            ? "Site not found. Check the URL and try again."
            : `Scan failed: ${message}`,
        });
      } finally {
        // Guarantee the final state reaches the DB before the function freezes.
        await flushScan(scanId);
      }
    });

    return NextResponse.json(
      { scanId, status: "scanning" },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

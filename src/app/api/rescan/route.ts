import { NextRequest, NextResponse, after } from "next/server";
import { getScan, getScanWithDB, setScan, updateScan, flushScan } from "@/lib/store";
import { crawlSite } from "@/lib/crawler";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { analyzeAEO } from "@/lib/aeo";
import { analyzePerformance } from "@/lib/performance";
import { scanDependencies } from "@/lib/dependencies";
import { sendRescanAlert } from "@/lib/email";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { scanId } = await request.json();

    if (!scanId) {
      return NextResponse.json({ error: "scanId required" }, { status: 400 });
    }

    let originalScan = getScan(scanId);
    if (!originalScan) {
      originalScan = await getScanWithDB(scanId);
    }

    if (!originalScan) {
      return NextResponse.json({ error: "Original scan not found" }, { status: 404 });
    }

    if (!originalScan.paid || originalScan.tier !== "deploy") {
      return NextResponse.json({ error: "Rescan requires Deploy tier ($19)" }, { status: 403 });
    }

    if (!originalScan.url) {
      return NextResponse.json({ error: "No URL to rescan" }, { status: 400 });
    }

    const newScanId = randomUUID();

    setScan(newScanId, {
      id: newScanId,
      createdAt: new Date().toISOString(),
      status: "scanning",
      paid: true,
      tier: "deploy",
      url: originalScan.url,
      email: originalScan.email,
      files: [],
    });

    const url = originalScan.url;
    const email = originalScan.email;
    const previousIssueCount = originalScan.result?.summary.totalIssues || 0;

    await flushScan(newScanId);

    after(async () => {
      try {
        const crawlResult = await crawlSite(url);

        if (crawlResult.files.length === 0) {
          updateScan(newScanId, { status: "error", error: "Could not crawl site" });
          return;
        }

        const analysisFiles = crawlResult.files.map((f) => ({ name: f.name, content: f.content }));
        updateScan(newScanId, { files: analysisFiles, platform: crawlResult.platform });

        const [result, aeoResult, perfResult, cveResult] = await Promise.all([
          analyzeMultipleFiles(analysisFiles),
          analyzeAEO(analysisFiles, url).catch(() => null),
          analyzePerformance(analysisFiles).catch(() => null),
          scanDependencies(analysisFiles).catch(() => null),
        ]);

        updateScan(newScanId, {
          status: "done",
          result,
          ...(aeoResult ? { aeo: aeoResult } : {}),
          ...(perfResult ? { performance: perfResult } : {}),
          ...(cveResult ? { dependencies: cveResult } : {}),
        });

        // Send alert email if user has email
        if (email) {
          const currentIssueCount = result.summary.totalIssues;
          const newIssues = Math.max(0, currentIssueCount - previousIssueCount);
          const fixedIssues = Math.max(0, previousIssueCount - currentIssueCount);

          await sendRescanAlert(email, newScanId, url, newIssues, fixedIssues).catch(() => {});
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Rescan failed";
        updateScan(newScanId, { status: "error", error: message });
      } finally {
        await flushScan(newScanId);
      }
    });

    return NextResponse.json({ scanId: newScanId, status: "scanning" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

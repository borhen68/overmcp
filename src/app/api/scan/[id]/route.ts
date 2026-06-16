import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try memory first, then DB
  let scan = getScan(id);
  if (!scan) {
    scan = await getScanWithDB(id);
  }

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Still scanning
  if (scan.status === "scanning") {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
    });
  }

  // Error
  if (scan.status === "error") {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      error: scan.error,
    });
  }

  // If not paid, only return summary (teaser) — but show tech stack free (it's the hook)
  if (!scan.paid && scan.result) {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      paid: scan.paid,
      tier: scan.tier,
      url: scan.url,
      platform: scan.platform,
      summary: scan.result.summary,
      preview: scan.result.vulnerabilities.slice(0, 1),
      totalVulnerabilities: scan.result.vulnerabilities.length,
      totalSeoIssues: scan.result.seoIssues.length,
      totalImprovements: scan.result.improvements.length,
      aeoScore: scan.aeo?.score || scan.result.summary.aeoScore || 0,
      performanceScore: scan.performance?.score || 0,
      dependencyRisk: scan.dependencies?.riskScore || null,
      totalCVEs: scan.dependencies?.vulnerabilities.length || 0,
      secretLeaks: scan.secrets?.totalLeaks || 0,
      accessibilityScore: scan.accessibility?.score || null,
      techStack: scan.techStack || null,
    });
  }

  // Paid — full report
  if (scan.paid && scan.result) {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      paid: scan.paid,
      tier: scan.tier,
      url: scan.url,
      platform: scan.platform,
      result: scan.result,
      aeo: scan.aeo || null,
      performance: scan.performance || null,
      dependencies: scan.dependencies || null,
      secrets: scan.secrets || null,
      accessibility: scan.accessibility || null,
      techStack: scan.techStack || null,
    });
  }

  return NextResponse.json({
    id: scan.id,
    status: scan.status,
  });
}

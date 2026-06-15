import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = getScan(id);

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // If not paid, only return summary (teaser)
  if (!scan.paid && scan.result) {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      paid: scan.paid,
      summary: scan.result.summary,
      // Show first vulnerability as teaser
      preview: scan.result.vulnerabilities.slice(0, 1),
      totalVulnerabilities: scan.result.vulnerabilities.length,
      totalSeoIssues: scan.result.seoIssues.length,
      totalImprovements: scan.result.improvements.length,
    });
  }

  // If paid, return full report
  if (scan.paid && scan.result) {
    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      paid: scan.paid,
      result: scan.result,
    });
  }

  // Still scanning or error
  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    error: scan.error,
  });
}

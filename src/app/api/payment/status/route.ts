import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("scanId");

  if (!scanId) {
    return NextResponse.json({ error: "scanId required" }, { status: 400 });
  }

  let scan = getScan(scanId);
  if (!scan) {
    scan = await getScanWithDB(scanId);
  }

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json({
    paid: scan.paid,
    tier: scan.tier,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB, setScan, flushScan } from "@/lib/store";

export const dynamic = "force-dynamic";

// Dev/testing helper: unlock a scan's full report WITHOUT going through payment.
//
// Safety: disabled in production by default. In production it only works if you
// set a DEV_UNLOCK_SECRET env var and pass ?secret=... that matches — so it can
// never be abused by a random visitor.
//
// Usage (local dev):  /api/payment/dev-unlock?scanId=YOUR_SCAN_ID
//        optional:    &tier=deploy   (default) or &tier=fix
function isAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.DEV_UNLOCK_SECRET;
  if (secret && new URL(request.url).searchParams.get("secret") === secret) return true;
  return false;
}

async function unlock(request: NextRequest, scanId: string | null, tierParam: string | null) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }
  if (!scanId) {
    return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
  }

  const existing = getScan(scanId) || (await getScanWithDB(scanId));
  if (!existing) {
    return NextResponse.json({ error: "Scan not found. Run a scan first." }, { status: 404 });
  }

  const tier = tierParam === "fix" ? "fix" : "deploy";
  setScan(scanId, { ...existing, paid: true, tier });
  await flushScan(scanId);

  return null; // signal success
}

// GET → convenient to open straight from the browser; redirects to the report.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get("scanId");
  const err = await unlock(request, scanId, searchParams.get("tier"));
  if (err) return err;
  return NextResponse.redirect(new URL(`/report/${scanId}?paid=true`, request.url));
}

// POST → for programmatic/test use; returns JSON.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const err = await unlock(request, body.scanId ?? null, body.tier ?? null);
  if (err) return err;
  return NextResponse.json({ ok: true, scanId: body.scanId, paid: true });
}

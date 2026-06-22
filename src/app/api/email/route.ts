import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB, updateScan } from "@/lib/store";
import { sendReportReady } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { scanId, email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Fall back to the DB — on serverless the scan was almost certainly created
    // on a different instance, so an in-memory-only lookup 404s spuriously.
    const scan = getScan(scanId) || (await getScanWithDB(scanId));
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    updateScan(scanId, { email });

    if (scan.status === "done" && scan.result?.summary) {
      await sendReportReady(email, scanId, scan.url || "", scan.result.summary);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

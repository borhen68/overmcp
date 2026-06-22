import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/payments";
import { getScan, getScanWithDB, updateScan } from "@/lib/store";

// Maps every tier name the UI can send (both canonical and the pricing-card
// names) to its price and the canonical tier we store. This fixes the bug
// where "deep-scan"/"continuous" silently fell back to the Fix price.
const TIER_CONFIG: Record<string, { price: number; tier: "fix" | "deploy"; description: string }> = {
  fix: { price: 5, tier: "fix", description: "OverMCP — Full Report + Fixed Code + AEO" },
  "quick-fix": { price: 5, tier: "fix", description: "OverMCP — Full Report + Fixed Code + AEO" },
  deploy: { price: 19, tier: "deploy", description: "OverMCP — Full Report + Auto-Fix + Deploy" },
  "deep-scan": { price: 19, tier: "deploy", description: "OverMCP — Deep Scan: CVEs, secrets, accessibility + AI chat" },
  continuous: { price: 19, tier: "deploy", description: "OverMCP — Auto-Fix + Deploy + rescan monitoring" },
  monitor: { price: 19, tier: "deploy", description: "OverMCP — Auto-Fix + Deploy + rescan monitoring" },
};

export async function POST(request: NextRequest) {
  try {
    const { scanId, tier = "fix" } = await request.json();

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
    }

    // Look in memory first, then the DB — on serverless the scan was very
    // likely created on a different instance, so an in-memory-only lookup
    // would 404 here even though the scan exists.
    const scan = getScan(scanId) || (await getScanWithDB(scanId));
    if (!scan) {
      return NextResponse.json({ error: "Scan not found. Try re-running the scan." }, { status: 404 });
    }

    if (scan.paid) {
      return NextResponse.json({ error: "This report is already unlocked." }, { status: 400 });
    }

    if (!process.env.NOWPAYMENTS_API_KEY) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    const config = TIER_CONFIG[tier] || TIER_CONFIG.fix;
    const payment = await createPayment(scanId, config.price);

    if (!payment?.invoice_url) {
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 502 }
      );
    }

    updateScan(scanId, {
      tier: config.tier,
      paymentId: payment.payment_id,
      invoiceUrl: payment.invoice_url,
    });

    return NextResponse.json({
      invoiceUrl: payment.invoice_url,
      paymentId: payment.payment_id,
      amount: config.price,
      tier: config.tier,
      description: config.description,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/payments";
import { getScan, updateScan } from "@/lib/store";

const TIER_PRICES: Record<string, number> = {
  fix: 9,
  deploy: 29,
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  fix: "OverMCP — Full Report + Fixed Code + AEO",
  deploy: "OverMCP — Full Report + Auto-Fix + Deploy + Continuous Monitoring",
};

export async function POST(request: NextRequest) {
  try {
    const { scanId, tier = "fix" } = await request.json();

    const scan = getScan(scanId);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.paid) {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const price = TIER_PRICES[tier] || TIER_PRICES.fix;
    const payment = await createPayment(scanId, price);

    updateScan(scanId, {
      tier: tier as "fix" | "deploy",
      paymentId: payment.payment_id,
      invoiceUrl: payment.invoice_url,
    });

    return NextResponse.json({
      invoiceUrl: payment.invoice_url,
      paymentId: payment.payment_id,
      amount: price,
      tier,
      description: TIER_DESCRIPTIONS[tier] || TIER_DESCRIPTIONS.fix,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

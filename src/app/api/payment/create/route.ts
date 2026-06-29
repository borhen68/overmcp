import { NextRequest, NextResponse } from "next/server";
import { createTransaction } from "@/lib/payments";
import { getScan, getScanWithDB, updateScan } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    const scan = getScan(scanId) || (await getScanWithDB(scanId));
    if (!scan) {
      return NextResponse.json({ error: "Scan not found. Try re-running the scan." }, { status: 404 });
    }

    if (scan.paid) {
      return NextResponse.json({ error: "This report is already unlocked." }, { status: 400 });
    }

    if (!process.env.PADDLE_API_KEY) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Please try again later." },
        { status: 503 }
      );
    }

    const config = TIER_CONFIG[tier] || TIER_CONFIG.fix;
    const transaction = await createTransaction(scanId, config.price, config.description);

    updateScan(scanId, {
      tier: config.tier,
      paymentId: transaction.id,
    });

    return NextResponse.json({
      transactionId: transaction.id,
      amount: config.price,
      tier: config.tier,
      description: config.description,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

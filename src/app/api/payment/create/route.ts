import { NextRequest, NextResponse } from "next/server";
import { createPayment } from "@/lib/payments";
import { getScan, updateScan } from "@/lib/store";

const PRICE_USD = 9;

export async function POST(request: NextRequest) {
  try {
    const { scanId } = await request.json();

    const scan = getScan(scanId);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.paid) {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const payment = await createPayment(scanId, PRICE_USD);

    updateScan(scanId, {
      paymentId: payment.payment_id,
      invoiceUrl: payment.invoice_url,
    });

    return NextResponse.json({
      invoiceUrl: payment.invoice_url,
      paymentId: payment.payment_id,
      amount: PRICE_USD,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

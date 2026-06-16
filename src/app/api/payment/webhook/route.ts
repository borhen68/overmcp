import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { updateScan, getScan, getScanWithDB } from "@/lib/store";
import { sendPaymentConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-nowpayments-sig") || "";

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    if (
      payload.payment_status === "finished" ||
      payload.payment_status === "confirmed"
    ) {
      const scanId = payload.order_id;

      // Make sure scan is loaded
      let scan = getScan(scanId);
      if (!scan) {
        scan = await getScanWithDB(scanId);
      }

      if (scan) {
        updateScan(scanId, {
          paid: true,
          paymentId: String(payload.payment_id),
        });

        if (scan.email) {
          sendPaymentConfirmation(scan.email, scanId, scan.tier).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

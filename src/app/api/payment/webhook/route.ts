import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { updateScan, getScan, getScanWithDB } from "@/lib/store";
import { sendPaymentConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event_type;
    const eventData = payload.event_data;

    // Paddle sends transaction.completed when payment is fully processed
    if (
      eventType === "transaction.completed" ||
      eventType === "transaction.paid"
    ) {
      const scanId = eventData?.custom_data?.scanId;

      if (scanId) {
        let scan = getScan(scanId);
        if (!scan) {
          scan = await getScanWithDB(scanId);
        }

        if (scan) {
          updateScan(scanId, {
            paid: true,
            paymentId: eventData.id,
          });

          if (scan.email) {
            sendPaymentConfirmation(scan.email, scanId, scan.tier).catch(() => {});
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

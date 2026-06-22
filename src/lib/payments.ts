import http from "./http";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

interface CreatePaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  invoice_url?: string;
}

export async function createPayment(
  orderId: string,
  priceUsd: number
): Promise<CreatePaymentResponse> {
  const response = await http.post(
    `${NOWPAYMENTS_API}/invoice`,
    {
      price_amount: priceUsd,
      price_currency: "usd",
      order_id: orderId,
      order_description: "OverMCP - Full Security & SEO Report",
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${orderId}?paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${orderId}?paid=false`,
    },
    {
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

export async function verifyPayment(paymentId: string): Promise<boolean> {
  const response = await http.get(
    `${NOWPAYMENTS_API}/payment/${paymentId}`,
    {
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
      },
    }
  );

  return (
    response.data.payment_status === "finished" ||
    response.data.payment_status === "confirmed"
  );
}

// NOWPayments signs the IPN body over its JSON with keys sorted alphabetically
// (recursively). We must reproduce that exact ordering or the HMAC never
// matches and every webhook is rejected as "Invalid signature".
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {} as Record<string, unknown>);
  }
  return value;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;

  const crypto = require("crypto");
  const sorted = JSON.stringify(sortKeysDeep(JSON.parse(payload)));
  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(sorted);
  const calculatedSignature = hmac.digest("hex");

  // Constant-time compare to avoid leaking the signature via timing.
  const a = Buffer.from(calculatedSignature, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

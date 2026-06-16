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

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET!);
  hmac.update(JSON.stringify(JSON.parse(payload)));
  const calculatedSignature = hmac.digest("hex");
  return calculatedSignature === signature;
}

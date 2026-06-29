import crypto from "crypto";

const PADDLE_API = process.env.PADDLE_SANDBOX === "true"
  ? "https://sandbox-api.paddle.com"
  : "https://api.paddle.com";

interface CreateTransactionResponse {
  id: string;
  status: string;
  checkout_id?: string | null;
}

export async function createTransaction(
  scanId: string,
  priceUsd: number,
  description: string
): Promise<CreateTransactionResponse> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");

  const response = await fetch(`${PADDLE_API}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          quantity: 1,
          price: {
            description,
            name: description,
            type: "one_time",
            unit_price: {
              amount: priceUsd.toFixed(2),
              currency_code: "USD",
            },
            product: {
              name: "OverMCP",
              type: "service",
            },
          },
        },
      ],
      collection_mode: "automatic",
      currency_code: "USD",
      custom_data: { scanId },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Paddle API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getTransaction(
  transactionId: string
): Promise<{ status: string; customData?: { scanId?: string } }> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");

  const response = await fetch(`${PADDLE_API}/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Paddle API error ${response.status}`);
  }

  const data = await response.json();
  return {
    status: data.data.status,
    customData: data.data.custom_data,
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  // Paddle-Signature header format: ts=<timestamp>;h1=<hex_signature>
  const parts = signatureHeader.split(";");
  let ts = "";
  let h1 = "";
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "ts") ts = value;
    if (key === "h1") h1 = value;
  }

  if (!ts || !h1) return false;

  // Build signed payload: timestamp + ":" + raw body
  const signedPayload = `${ts}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(signedPayload);
  const calculatedSignature = hmac.digest("hex");

  // Constant-time compare
  const a = Buffer.from(calculatedSignature, "hex");
  const b = Buffer.from(h1, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

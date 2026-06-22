// GitHub App authentication — the foundation for always-on PR/push scanning.
//
// A GitHub App authenticates in two steps:
//   1. Sign a short-lived RS256 JWT with the app's private key (proves "I am
//      this app").
//   2. Exchange that JWT for an *installation access token* scoped to the one
//      installation (repo set) that fired the webhook.
//
// Dependency-free: uses Node's crypto so we don't add packages or risk
// version drift with octokit's auth subpackages.
import crypto from "crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// PEM keys are often stored in env with literal "\n" — normalize back to real newlines.
function privateKey(): string {
  const key = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!key) throw new Error("GITHUB_APP_PRIVATE_KEY is not set");
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

// Short-lived (10 min) app JWT. `now` is injectable for testing.
export function createAppJwt(now: number = Math.floor(Date.now() / 1000)): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) throw new Error("GITHUB_APP_ID is not set");

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iat: now - 60, // backdate 60s to tolerate clock skew
      exp: now + 9 * 60, // GitHub caps app JWTs at 10 min
      iss: appId,
    })
  );
  const data = `${header}.${payload}`;
  const signature = crypto.createSign("RSA-SHA256").update(data).sign(privateKey());
  return `${data}.${base64url(signature)}`;
}

// Exchange the app JWT for an installation access token.
export async function getInstallationToken(installationId: number | string): Promise<string> {
  const jwt = createAppJwt();
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to get installation token (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

// Verify the X-Hub-Signature-256 header GitHub sends with every webhook.
// Returns false on any mismatch — we must reject unsigned/forged deliveries.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  // Lengths must match before timingSafeEqual, or it throws.
  if (signatureHeader.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isGitHubAppConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_APP_WEBHOOK_SECRET
  );
}

// GitHub App auth tests. Run: npx tsx scripts/test-github-app.ts
// Uses a throwaway RSA keypair so nothing real is needed.
import crypto from "crypto";
import { createAppJwt, verifyWebhookSignature } from "../src/lib/github-app";

let pass = 0, fail = 0;
const c = (label: string, cond: boolean) => { cond ? (pass++, console.log(`  ✅ ${label}`)) : (fail++, console.log(`  ❌ ${label}`)); };

// --- Generate a test keypair and wire it into env exactly like production ---
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();
process.env.GITHUB_APP_ID = "123456";
// store with literal \n to prove our normalization works
process.env.GITHUB_APP_PRIVATE_KEY = pem.replace(/\n/g, "\\n");

console.log("\n=== APP JWT ===");
const NOW = 1_700_000_000;
const jwt = createAppJwt(NOW);
const [h, p, sig] = jwt.split(".");
c("JWT has 3 parts", jwt.split(".").length === 3);

const header = JSON.parse(Buffer.from(h, "base64").toString());
const payload = JSON.parse(Buffer.from(p, "base64").toString());
c("alg is RS256", header.alg === "RS256");
c("iss is app id", payload.iss === "123456");
c("iat backdated 60s", payload.iat === NOW - 60);
c("exp within 10 min", payload.exp <= NOW + 600 && payload.exp > NOW);

// Verify the signature against the public key.
const data = `${h}.${p}`;
const sigBuf = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const valid = crypto.createVerify("RSA-SHA256").update(data).verify(publicKey, sigBuf);
c("signature verifies with public key", valid);

console.log("\n=== WEBHOOK SIGNATURE ===");
process.env.GITHUB_APP_WEBHOOK_SECRET = "supersecret";
const body = JSON.stringify({ action: "opened", number: 7 });
const goodSig = "sha256=" + crypto.createHmac("sha256", "supersecret").update(body).digest("hex");
c("valid signature accepted", verifyWebhookSignature(body, goodSig) === true);
c("tampered body rejected", verifyWebhookSignature(body + "x", goodSig) === false);
c("wrong signature rejected", verifyWebhookSignature(body, "sha256=deadbeef") === false);
c("missing signature rejected", verifyWebhookSignature(body, null) === false);

console.log(`\n=== RESULT: ${pass}/${pass + fail} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

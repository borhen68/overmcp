// Accuracy harness for the secret scanner.
// Run: npx tsx scripts/test-secrets.ts
//
// TRUE POSITIVES must be detected. FALSE POSITIVES must stay silent.
// This is the contract that keeps user trust: no crying wolf.
import { scanSecrets } from "../src/lib/secrets";

interface Case {
  label: string;
  content: string;
  expectType?: string; // a finding of this type must exist
}

// Fake but format-valid secrets (random/non-functional values).
const TRUE_POSITIVES: Case[] = [
  { label: "AWS access key", content: `const k = "AKIA1234567890ABCDEF";`, expectType: "AWS Access Key ID" },
  { label: "GitHub PAT", content: `token: "ghp_aB3dEfGh1jKlMnOpQrStUvWxYz0123456789"`, expectType: "GitHub Token" },
  // Key parts are joined at runtime so the source carries no contiguous,
  // real-format secret literal (which GitHub push protection would block).
  { label: "Stripe secret", content: `STRIPE="${["sk", "live", "51HxYz9aB3dEfGh1jKlMnOpQr"].join("_")}"`, expectType: "Stripe Secret Key" },
  { label: "OpenAI key", content: `const o = "sk-proj-aB3dEfGh1jKlMnOpQrStUvWxYz0123456789ABCD"`, expectType: "OpenAI API Key" },
  { label: "Anthropic key", content: `KEY=sk-ant-api03-${"aB3dEfGh1jKlMnOpQr".repeat(5)}xyz12`, expectType: "Anthropic API Key" },
  { label: "Slack webhook", content: `https://hooks.slack.com/services/T8a2Kd91/B7xQp4Lm/aBcDeFgHiJkLmNoPqRsTuVwX`, expectType: "Slack Webhook" },
  { label: "Private key block", content: `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK`, expectType: "Private Key" },
  { label: "Postgres URL w/ creds", content: `DATABASE_URL="postgres://admin:s3cretPss@db.internal.acme.io:5432/app"`, expectType: "Database Connection URL" },
  { label: "Google OAuth secret", content: `client_secret: "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"`, expectType: "Google OAuth Client Secret" },
  { label: "npm token", content: `//registry.npmjs.org/:_authToken=npm_aB3dEfGh1jKlMnOpQrStUvWxYz0123456789`, expectType: "npm Token" },
  { label: "SendGrid", content: `${["SG", "aB3dEfGh1jKlMnOpQrStUv", "aB3dEfGh1jKlMnOpQrStUvWxYz0123456789ABCDEFG"].join(".")}`, expectType: "SendGrid Key" },
  { label: "Generic high-entropy", content: `const apiKey = "x9K2mQ7vL4pR8tN3wZ6yB1cF5hJ0dG"`, expectType: "Generic API Secret" },
];

// Things that look secret-ish but are NOT — these MUST NOT fire.
const FALSE_POSITIVES: Case[] = [
  { label: "Placeholder Stripe", content: `STRIPE_KEY="sk_live_${"x".repeat(24)}"` },
  { label: "Example AWS in docs", content: `// e.g. AWS key looks like AKIAIOSFODNN7EXAMPLE` },
  { label: "Env var name only", content: `const key = process.env.STRIPE_SECRET_KEY;` },
  { label: "Templated value", content: `apiKey: "\${process.env.API_KEY}"` },
  { label: "Hex color", content: `const color = "#ffffff"; const c2 = "#1a2b3c";` },
  { label: "English sentence config", content: `password: "please change this to a secure value"` },
  { label: "Low-entropy generic", content: `const token = "aaaaaaaaaaaaaaaaaaaaaa"` },
  { label: "Public anon JWT", content: `const anon = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.abcdefghij"` },
  { label: "Random 37-char id (old CF bug)", content: `const buildId = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s";` },
  { label: "Boolean/structural", content: `const apiKey = "true"; const secret = "undefined";` },
  { label: "UUID", content: `const id = "550e8400-e29b-41d4-a716-446655440000"` },
  { label: "Tailwind class string", content: `className="flex items-center justify-between gap-4 rounded-xl"` },
];

function run() {
  let pass = 0;
  let fail = 0;

  console.log("\n=== TRUE POSITIVES (must detect) ===");
  for (const c of TRUE_POSITIVES) {
    const r = scanSecrets([{ name: "test.js", content: c.content }]);
    const found = c.expectType ? r.leaks.some((l) => l.type === c.expectType) : r.totalLeaks > 0;
    if (found) {
      pass++;
      console.log(`  ✅ ${c.label}`);
    } else {
      fail++;
      console.log(`  ❌ ${c.label} — expected "${c.expectType}", got [${r.leaks.map((l) => l.type).join(", ") || "nothing"}]`);
    }
  }

  console.log("\n=== FALSE POSITIVES (must stay silent) ===");
  for (const c of FALSE_POSITIVES) {
    const r = scanSecrets([{ name: "test.js", content: c.content }]);
    if (r.totalLeaks === 0) {
      pass++;
      console.log(`  ✅ ${c.label}`);
    } else {
      fail++;
      console.log(`  ❌ ${c.label} — false alarm: [${r.leaks.map((l) => `${l.type}(${l.confidence})`).join(", ")}]`);
    }
  }

  const total = pass + fail;
  console.log(`\n=== RESULT: ${pass}/${total} passed, ${fail} failed ===\n`);
  if (fail > 0) process.exit(1);
}

run();

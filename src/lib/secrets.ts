export interface SecretLeak {
  type: string;
  file: string;
  line: number;
  snippet: string;
  severity: "critical" | "high" | "medium";
  description: string;
}

export interface SecretsResult {
  totalLeaks: number;
  leaks: SecretLeak[];
  score: number;
}

const SECRET_PATTERNS: { name: string; regex: RegExp; severity: "critical" | "high" | "medium"; desc: string }[] = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g, severity: "critical", desc: "AWS access key ID exposed — attackers can access your AWS resources" },
  { name: "AWS Secret Key", regex: /(?:aws_secret_access_key|AWS_SECRET)['"=:\s]*([A-Za-z0-9/+=]{40})/gi, severity: "critical", desc: "AWS secret key exposed — full account compromise possible" },
  { name: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/g, severity: "critical", desc: "GitHub personal access token exposed — repo access compromised" },
  { name: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/g, severity: "critical", desc: "Stripe live secret key — attackers can process charges and access customer data" },
  { name: "Stripe Publishable Key", regex: /pk_live_[0-9a-zA-Z]{24,}/g, severity: "medium", desc: "Stripe publishable key in source — not critical but should be in env vars" },
  { name: "OpenAI API Key", regex: /sk-[A-Za-z0-9]{20,}/g, severity: "high", desc: "OpenAI API key exposed — attackers can run up your bill" },
  { name: "Supabase Key", regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, severity: "high", desc: "Supabase/JWT token exposed in client code" },
  { name: "Firebase Config", regex: /AIza[0-9A-Za-z_-]{35}/g, severity: "high", desc: "Firebase/Google API key exposed" },
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, severity: "critical", desc: "Private key file exposed in source code" },
  { name: "Database URL", regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+/gi, severity: "critical", desc: "Database connection string with credentials exposed" },
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey|api[_-]?secret)['"=:\s]*['"]([a-zA-Z0-9_-]{20,})['"]/gi, severity: "high", desc: "API key/secret hardcoded in source" },
  { name: "Generic Secret", regex: /(?:secret|password|passwd|token)['"=:\s]*['"]([^\s'"]{8,})['"]/gi, severity: "high", desc: "Secret or password hardcoded in source" },
  { name: ".env Reference", regex: /process\.env\.(?!NODE_ENV|NEXT_PUBLIC)[A-Z_]{3,}/g, severity: "medium", desc: "Server-side env var referenced in client-visible code" },
  { name: "Hardcoded JWT", regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, severity: "high", desc: "Hardcoded JWT token — may grant unauthorized access" },
  { name: "Slack Webhook", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g, severity: "high", desc: "Slack webhook URL exposed — can be used to spam your channels" },
  { name: "SendGrid Key", regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, severity: "critical", desc: "SendGrid API key exposed — attackers can send emails as you" },
  { name: "Twilio Key", regex: /SK[a-f0-9]{32}/g, severity: "high", desc: "Twilio API key exposed" },
  { name: "Mailgun Key", regex: /key-[a-f0-9]{32}/g, severity: "high", desc: "Mailgun API key exposed" },
  { name: "Cloudflare Token", regex: /[a-z0-9]{37}/g, severity: "medium", desc: "Possible Cloudflare API token" },
];

const FALSE_POSITIVE_PATTERNS = [
  /^[a-z]+$/,
  /^[A-Z]+$/,
  /^[0-9]+$/,
  /example|placeholder|your[_-]|test|demo|TODO|CHANGEME|xxx|000/i,
  /node_modules/,
];

export function scanSecrets(files: { name: string; content: string }[]): SecretsResult {
  const leaks: SecretLeak[] = [];

  for (const file of files) {
    if (file.name.includes("node_modules") || file.name.includes(".min.")) continue;

    const lines = file.content.split("\n");

    for (const pattern of SECRET_PATTERNS) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const matches = line.matchAll(pattern.regex);

        for (const match of matches) {
          const value = match[1] || match[0];

          if (FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(value))) continue;
          if (value.length < 8) continue;

          const alreadyFound = leaks.some(
            (l) => l.file === file.name && l.line === lineNum + 1 && l.type === pattern.name
          );
          if (alreadyFound) continue;

          leaks.push({
            type: pattern.name,
            file: file.name,
            line: lineNum + 1,
            snippet: line.trim().substring(0, 100) + (line.trim().length > 100 ? "..." : ""),
            severity: pattern.severity,
            description: pattern.desc,
          });
        }
      }
    }
  }

  const criticalCount = leaks.filter((l) => l.severity === "critical").length;
  const highCount = leaks.filter((l) => l.severity === "high").length;
  const mediumCount = leaks.filter((l) => l.severity === "medium").length;

  const score = Math.max(0, 100 - criticalCount * 30 - highCount * 15 - mediumCount * 5);

  return {
    totalLeaks: leaks.length,
    leaks: leaks.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return order[a.severity] - order[b.severity];
    }),
    score,
  };
}

// Secret detection engine.
//
// Design goal: PRECISION FIRST. A false "your AWS key is leaked!" alarm
// destroys user trust faster than a missed finding, so every rule is either
// (a) anchored to a provider's unique, well-known token format, or
// (b) a generic rule gated behind a Shannon-entropy check + context filters.
// Every finding carries a confidence level so the UI can lead with the
// findings we're sure about.

export type SecretConfidence = "confirmed" | "high" | "medium";

export interface SecretLeak {
  type: string;
  file: string;
  line: number;
  snippet: string;
  severity: "critical" | "high" | "medium";
  description: string;
  confidence: SecretConfidence;
}

export interface SecretsResult {
  totalLeaks: number;
  leaks: SecretLeak[];
  score: number;
}

type Severity = "critical" | "high" | "medium";

interface SecretRule {
  name: string;
  regex: RegExp;
  severity: Severity;
  desc: string;
  // Confidence when the pattern matches and passes all gates.
  confidence: SecretConfidence;
  // Which regex group holds the actual secret value (default 0 = whole match).
  group?: number;
  // Minimum Shannon entropy (bits/char) required of the captured value.
  // Used for loose/generic patterns to reject low-randomness false positives.
  minEntropy?: number;
  // Extra rule-specific validation of the captured value.
  validate?: (value: string, fullLine: string) => boolean;
}

// --- Shannon entropy (bits per character) -----------------------------------
function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq: Record<string, number> = {};
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  const len = s.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// --- Generic false-positive guards ------------------------------------------
// Substring match (no word boundaries) — a value literally containing any of
// these is documentation / a placeholder, never a live secret. Matched
// case-insensitively against the captured value, e.g. AKIAIOSFODNN7EXAMPLE.
const PLACEHOLDER_RE =
  /example|placeholder|change[_-]?me|replace[_-]?me|your[_-]?(key|secret|token|api)|my[_-]?secret|insert[_-]?|dummy|sample|redacted|foobar|lorem|todo|notreal|fake[_-]?key/i;

// universal guards — applied to EVERY rule (even confirmed provider formats).
function looksLikePlaceholder(value: string): boolean {
  if (PLACEHOLDER_RE.test(value)) return true;
  // Redaction / templating markers — never a real live secret.
  if (/[*]{3,}|\.{4,}|…|<[^>]+>|\$\{|\{\{|%[A-Z_]+%/.test(value)) return true;
  // A run of 4+ identical alphanumerics (xxxx, 000000, aaaa) — placeholder/redaction.
  // Restricted to alphanumerics so legit punctuation runs (e.g. "-----" in a
  // PEM header) are not misread as redaction.
  if (/([A-Za-z0-9])\1{3,}/.test(value)) return true;
  return false;
}

// extra guards — only applied to generic / lower-confidence rules, where the
// captured value should look like a random token. Confirmed provider formats
// (PEM headers, connection strings) legitimately contain spaces / structure,
// so we must NOT apply these to them.
function looksLikeNonSecret(value: string): boolean {
  // Looks like a normal sentence / human text rather than a token.
  if (/\s/.test(value.trim()) && /[a-z]+\s+[a-z]+/i.test(value)) return true;
  return looksStructural(value);
}

// Detect "looks like an env var name was pasted instead of a value", a path,
// or a hex color etc. for the generic rules.
function looksStructural(value: string): boolean {
  if (/^[/.~]/.test(value)) return true; // path
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true; // hex color
  if (/^(true|false|null|undefined|none)$/i.test(value)) return true;
  if (/^[A-Z][A-Z0-9_]*$/.test(value) && value.includes("_")) return true; // ENV_VAR_NAME
  return false;
}

// --- Rules ------------------------------------------------------------------
// Ordered roughly by specificity. High-precision provider formats first.
const RULES: SecretRule[] = [
  // ---- Cloud providers ----
  { name: "AWS Access Key ID", regex: /\b((?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA)[0-9A-Z]{16})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "AWS access key ID exposed — attackers can reach your AWS account and resources." },
  { name: "AWS Secret Access Key", regex: /(?:aws_secret_access_key|aws[_-]?secret|secret[_-]?access[_-]?key)["'=:\s]{1,4}([A-Za-z0-9/+]{40})\b/gi, group: 1, severity: "critical", confidence: "high", minEntropy: 4.0, desc: "AWS secret access key exposed — full account compromise possible." },
  { name: "Google API Key", regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g, group: 1, severity: "medium", confidence: "high", desc: "Google/Firebase API key in source. Web API keys are often public by design, but restrict it by referrer/API and never use it for privileged access." },
  { name: "Google OAuth Client Secret", regex: /\b(GOCSPX-[A-Za-z0-9_-]{28})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Google OAuth client secret exposed — attackers can impersonate your app's OAuth flow." },
  { name: "GCP Service Account Key", regex: /"type":\s*"service_account"/g, severity: "critical", confidence: "high", desc: "Google Cloud service account JSON key embedded in source — grants programmatic access to GCP resources." },

  // ---- Source hosts / package registries ----
  { name: "GitHub Token", regex: /\b(gh[pousr]_[A-Za-z0-9]{36})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "GitHub access token exposed — repository and account access compromised." },
  { name: "GitHub Fine-grained PAT", regex: /\b(github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "GitHub fine-grained personal access token exposed." },
  { name: "GitLab PAT", regex: /\b(glpat-[A-Za-z0-9_-]{20})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "GitLab personal access token exposed." },
  { name: "npm Token", regex: /\b(npm_[A-Za-z0-9]{36})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "npm access token exposed — attackers can publish malicious package versions." },
  { name: "PyPI Token", regex: /\b(pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,})/g, group: 1, severity: "high", confidence: "confirmed", desc: "PyPI upload token exposed." },

  // ---- Payments ----
  { name: "Stripe Secret Key", regex: /\b((?:sk|rk)_live_[0-9a-zA-Z]{24,})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "Stripe live secret key — attackers can process charges and read customer/payment data." },
  { name: "Stripe Publishable Key", regex: /\b(pk_live_[0-9a-zA-Z]{24,})\b/g, group: 1, severity: "medium", confidence: "high", desc: "Stripe publishable key in source. It is meant to be public, but confirm it isn't a mislabeled secret key and keep it out of committed config." },
  { name: "Square Access Token", regex: /\b(sq0atp-[A-Za-z0-9_-]{22}|EAAA[A-Za-z0-9_-]{60})\b/g, group: 1, severity: "high", confidence: "high", desc: "Square access token exposed." },
  { name: "PayPal/Braintree Token", regex: /\b(access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Braintree/PayPal production access token exposed." },

  // ---- AI providers ----
  { name: "OpenAI API Key", regex: /\b(sk-(?:proj|svcacct|admin|None)?-?[A-Za-z0-9_-]{20,})\b/g, group: 1, severity: "high", confidence: "high", minEntropy: 3.5, validate: (v) => v.startsWith("sk-") && !v.startsWith("sk_"), desc: "OpenAI API key exposed — attackers can run up your usage bill." },
  { name: "Anthropic API Key", regex: /\b(sk-ant-(?:api03|admin01)-[A-Za-z0-9_-]{80,})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Anthropic (Claude) API key exposed — attackers can run up your usage bill." },
  { name: "Hugging Face Token", regex: /\b(hf_[A-Za-z0-9]{34})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Hugging Face access token exposed." },

  // ---- Messaging / email ----
  { name: "Slack Token", regex: /\b(xox[baprs]-[A-Za-z0-9-]{10,72})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Slack token exposed — workspace access compromised." },
  { name: "Slack Webhook", regex: /(https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9_]+\/B[A-Za-z0-9_]+\/[A-Za-z0-9_]+)/g, group: 1, severity: "high", confidence: "confirmed", desc: "Slack webhook URL exposed — anyone can post messages to your channel." },
  { name: "SendGrid Key", regex: /\b(SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "SendGrid API key exposed — attackers can send email as you." },
  { name: "Mailgun Key", regex: /\b(key-[a-f0-9]{32})\b/g, group: 1, severity: "high", confidence: "high", desc: "Mailgun API key exposed." },
  { name: "Twilio API Key", regex: /\b(SK[a-f0-9]{32})\b/g, group: 1, severity: "high", confidence: "high", desc: "Twilio API key SID exposed." },
  { name: "Discord Bot Token", regex: /\b([MNO][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,})\b/g, group: 1, severity: "high", confidence: "high", desc: "Discord bot token exposed — attackers can control your bot." },
  { name: "Telegram Bot Token", regex: /\b([0-9]{8,10}:AA[A-Za-z0-9_-]{32,})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "Telegram bot token exposed." },

  // ---- Infra / hosting ----
  { name: "DigitalOcean Token", regex: /\b(dop_v1_[a-f0-9]{64})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "DigitalOcean personal access token exposed." },
  { name: "New Relic Key", regex: /\b(NRAK-[A-Z0-9]{27})\b/g, group: 1, severity: "high", confidence: "confirmed", desc: "New Relic API key exposed." },
  { name: "Shopify Token", regex: /\b(shp(?:at|ca|pa|ss)_[a-fA-F0-9]{32})\b/g, group: 1, severity: "critical", confidence: "confirmed", desc: "Shopify access token exposed — store data and admin access at risk." },
  { name: "Notion Token", regex: /\b(secret_[A-Za-z0-9]{43})\b/g, group: 1, severity: "high", confidence: "high", desc: "Notion integration token exposed." },
  { name: "Cloudflare API Token", regex: /(?:cloudflare|cf[_-]?api|x-auth-key)["'=:\s]{1,6}([A-Za-z0-9_-]{37,40})\b/gi, group: 1, severity: "medium", confidence: "medium", minEntropy: 3.5, desc: "Possible Cloudflare API token exposed (found near a Cloudflare auth reference)." },

  // ---- Keys / tokens / connection strings ----
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, severity: "critical", confidence: "confirmed", desc: "Private key block exposed in source code." },
  { name: "Database Connection URL", regex: /\b((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqps?):\/\/[^\s'"<>]+:[^\s'"<>@]+@[^\s'"<>]+)/gi, group: 1, severity: "critical", confidence: "high", desc: "Database connection string with embedded credentials exposed." },
  { name: "JSON Web Token", regex: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g, group: 1, severity: "high", confidence: "medium", validate: isInterestingJwt, desc: "Signed JWT in source. If it is a service-role / privileged token (not a public anon key) it grants unauthorized access." },

  // ---- Generic, entropy-gated catch-all ----
  {
    name: "Generic API Secret",
    regex: /(?:api[_-]?key|api[_-]?secret|client[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key|private[_-]?key|app[_-]?secret)["'\s]{0,3}[:=]\s*["']([^"'\s]{20,80})["']/gi,
    group: 1,
    severity: "high",
    confidence: "medium",
    minEntropy: 3.6,
    validate: (v) => !looksStructural(v) && /[A-Za-z]/.test(v) && /[0-9]/.test(v),
    desc: "High-entropy secret hardcoded in source under a credential-like key name.",
  },
];

// A JWT is only "interesting" if it decodes to a real header/payload and is not
// an obvious public anon key. Supabase service_role tokens are flagged hard.
function isInterestingJwt(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  try {
    const decode = (seg: string) =>
      JSON.parse(Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const header = decode(parts[0]);
    if (!header || typeof header.alg !== "string") return false;
    const payload = decode(parts[1]);
    // Public/anon keys are extremely common and safe; don't cry wolf on them.
    if (payload && payload.role === "anon") return false;
    return true;
  } catch {
    return false;
  }
}

function redactSnippet(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 120) + "…" : trimmed;
}

export function scanSecrets(files: { name: string; content: string }[]): SecretsResult {
  const leaks: SecretLeak[] = [];
  // Track seen (value+type) so the same secret repeated across files/lines
  // doesn't spam the report.
  const seenValues = new Map<string, number>();

  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (lower.includes("node_modules") || lower.includes(".min.") || lower.endsWith(".map.js")) continue;
    // Lockfiles and integrity hashes are full of high-entropy noise, not secrets.
    const isLockOrHashFile = /(package-lock|yarn\.lock|pnpm-lock|\.lock|integrity)/.test(lower);

    const lines = file.content.split("\n");

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      if (line.length > 4000) continue; // skip giant minified/data lines

      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        const matches = line.matchAll(rule.regex);

        for (const match of matches) {
          const value = (rule.group != null ? match[rule.group] : match[0]) || match[0];
          if (!value || value.length < 8) continue;

          // Universal guards.
          if (looksLikePlaceholder(value)) continue;

          // Generic / lower-confidence rules: the value must look like a real
          // random token, and we apply extra scrutiny inside lockfiles.
          const isGeneric = rule.minEntropy != null || rule.confidence === "medium";
          if (isGeneric) {
            if (isLockOrHashFile) continue;
            if (looksLikeNonSecret(value)) continue;
          }

          // Entropy gate.
          if (rule.minEntropy != null && shannonEntropy(value) < rule.minEntropy) continue;

          // Rule-specific validation.
          if (rule.validate && !rule.validate(value, line)) continue;

          // Global value dedup — cap repeats of the identical secret.
          const dedupKey = `${rule.name}:${value}`;
          const count = seenValues.get(dedupKey) || 0;
          if (count >= 3) continue;
          seenValues.set(dedupKey, count + 1);

          // Per-location dedup.
          const already = leaks.some(
            (l) => l.file === file.name && l.line === lineNum + 1 && l.type === rule.name
          );
          if (already) continue;

          leaks.push({
            type: rule.name,
            file: file.name,
            line: lineNum + 1,
            snippet: redactSnippet(line),
            severity: rule.severity,
            description: rule.desc,
            confidence: rule.confidence,
          });
        }
      }
    }
  }

  // Score: weight by severity, but discount lower-confidence findings so a few
  // "medium confidence" hits don't tank the score the way confirmed ones do.
  const weight = (l: SecretLeak) => {
    const base = l.severity === "critical" ? 30 : l.severity === "high" ? 15 : 5;
    const conf = l.confidence === "confirmed" ? 1 : l.confidence === "high" ? 0.85 : 0.5;
    return base * conf;
  };
  const penalty = leaks.reduce((sum, l) => sum + weight(l), 0);
  const score = Math.max(0, Math.round(100 - penalty));

  const order: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  const confOrder: Record<SecretConfidence, number> = { confirmed: 0, high: 1, medium: 2 };

  return {
    totalLeaks: leaks.length,
    leaks: leaks.sort((a, b) => {
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return confOrder[a.confidence] - confOrder[b.confidence];
    }),
    score,
  };
}

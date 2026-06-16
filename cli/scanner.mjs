// OverMCP CLI scanner — zero-dependency, runs anywhere with bare Node.
// Mirrors the secret-detection logic in src/lib/secrets.ts so the CLI can
// catch leaked credentials BEFORE they are committed or deployed.

import fs from "node:fs";
import path from "node:path";

/**
 * @typedef {"critical" | "high" | "medium"} Severity
 * @typedef {{ type: string, file: string, line: number, snippet: string, severity: Severity, description: string }} SecretLeak
 */

/** @type {{ name: string, regex: RegExp, severity: Severity, desc: string, entropy?: boolean }[]} */
const SECRET_PATTERNS = [
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
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey|api[_-]?secret)['"=:\s]*['"]([a-zA-Z0-9_-]{20,})['"]/gi, severity: "high", desc: "API key/secret hardcoded in source", entropy: true },
  { name: "Generic Secret", regex: /(?:secret|password|passwd|token)['"=:\s]*['"]([^\s'"]{8,})['"]/gi, severity: "high", desc: "Secret or password hardcoded in source", entropy: true },
  { name: "Hardcoded JWT", regex: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g, severity: "high", desc: "Hardcoded JWT token — may grant unauthorized access" },
  { name: "Slack Webhook", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g, severity: "high", desc: "Slack webhook URL exposed — can be used to spam your channels" },
  { name: "SendGrid Key", regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, severity: "critical", desc: "SendGrid API key exposed — attackers can send emails as you" },
  { name: "Twilio Key", regex: /SK[a-f0-9]{32}/g, severity: "high", desc: "Twilio API key exposed" },
  { name: "Mailgun Key", regex: /key-[a-f0-9]{32}/g, severity: "high", desc: "Mailgun API key exposed" },
];

const FALSE_POSITIVE_PATTERNS = [
  /^[a-z]+$/,
  /^[A-Z]+$/,
  /^[0-9]+$/,
  /example|placeholder|your[_-]|test|demo|sample|dummy|TODO|CHANGEME|xxx|000|<.*>|\$\{/i,
];

// Files/dirs we never scan.
const DEFAULT_IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".turbo", ".vercel", ".netlify", ".cache", "vendor", ".venv", "__pycache__",
]);

const TEXT_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".env", ".yml", ".yaml",
  ".py", ".rb", ".go", ".rs", ".php", ".java", ".kt", ".swift", ".sh", ".bash",
  ".html", ".vue", ".svelte", ".astro", ".txt", ".md", ".toml", ".ini", ".cfg",
  ".xml", ".properties", ".tf", ".tfvars",
]);

// Shannon entropy — used to suppress low-entropy generic matches (e.g. real words).
function shannonEntropy(str) {
  if (!str) return 0;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  const len = str.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isLikelyFalsePositive(value, useEntropy) {
  if (value.length < 8) return true;
  if (FALSE_POSITIVE_PATTERNS.some((fp) => fp.test(value))) return true;
  // Generic patterns: require enough randomness to look like a real credential.
  if (useEntropy && shannonEntropy(value) < 3.0) return true;
  return false;
}

/**
 * Scan an array of in-memory files for leaked secrets.
 * @param {{ name: string, content: string }[]} files
 * @returns {{ totalLeaks: number, leaks: SecretLeak[], score: number }}
 */
export function scanSecrets(files) {
  /** @type {SecretLeak[]} */
  const leaks = [];

  for (const file of files) {
    if (file.name.includes("node_modules") || file.name.includes(".min.")) continue;
    const lines = file.content.split("\n");

    for (const pattern of SECRET_PATTERNS) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const matches = line.matchAll(pattern.regex);

        for (const match of matches) {
          const value = match[1] || match[0];
          if (isLikelyFalsePositive(value, pattern.entropy)) continue;

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

// Minimal .gitignore-style matcher (supports leading dir names and simple globs).
function buildIgnoreMatcher(rootDir) {
  const patterns = [];
  const giPath = path.join(rootDir, ".gitignore");
  if (fs.existsSync(giPath)) {
    const lines = fs.readFileSync(giPath, "utf8").split("\n");
    for (let raw of lines) {
      const lineTrimmed = raw.trim();
      if (!lineTrimmed || lineTrimmed.startsWith("#")) continue;
      patterns.push(lineTrimmed.replace(/^\//, "").replace(/\/$/, ""));
    }
  }
  return (relPath) => {
    const parts = relPath.split(path.sep);
    return patterns.some((p) => {
      if (p.includes("*")) {
        const re = new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
        return parts.some((seg) => re.test(seg));
      }
      return parts.includes(p) || relPath === p || relPath.startsWith(p + path.sep);
    });
  };
}

/**
 * Walk a directory and collect readable text files (respecting .gitignore).
 * @param {string} rootDir
 * @param {{ includeGitignored?: boolean, maxFileSizeKb?: number }} [opts]
 * @returns {{ name: string, content: string }[]}
 */
export function collectFiles(rootDir, opts = {}) {
  const { includeGitignored = false, maxFileSizeKb = 512 } = opts;
  const isIgnored = includeGitignored ? () => false : buildIgnoreMatcher(rootDir);
  /** @type {{ name: string, content: string }[]} */
  const files = [];

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
        if (isIgnored(rel)) continue;
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const isEnvFile = entry.name.startsWith(".env");
        if (!isEnvFile && !TEXT_EXTENSIONS.has(ext)) continue;
        // Always scan .env files even if gitignored — they are the #1 leak source.
        if (!isEnvFile && isIgnored(rel)) continue;
        try {
          const stat = fs.statSync(full);
          if (stat.size > maxFileSizeKb * 1024) continue;
          files.push({ name: rel, content: fs.readFileSync(full, "utf8") });
        } catch {
          // unreadable / binary — skip
        }
      }
    }
  }

  walk(rootDir);
  return files;
}

export const SEVERITY_RANK = { critical: 3, high: 2, medium: 1 };

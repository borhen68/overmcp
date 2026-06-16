// Centralized environment validation. Used by instrumentation.ts to warn loudly
// at server startup when required configuration is missing or misconfigured.

interface EnvCheck {
  name: string;
  level: "required" | "recommended";
  feature: string;
}

const CHECKS: EnvCheck[] = [
  { name: "TURSO_DATABASE_URL", level: "required", feature: "Database (scans, monitors, payments persistence)" },
  { name: "DEEPSEEK_API_KEY", level: "required", feature: "AI security/SEO analysis + chat" },
  { name: "NEXT_PUBLIC_APP_URL", level: "required", feature: "Links, payment redirects, webhook + email URLs" },
  { name: "TURSO_AUTH_TOKEN", level: "recommended", feature: "Remote Turso auth (required unless using a local file DB)" },
  { name: "RESEND_API_KEY", level: "recommended", feature: "Report + alert emails" },
  { name: "CRON_SECRET", level: "recommended", feature: "Protects the /api/monitor/run cron endpoint" },
  { name: "NOWPAYMENTS_API_KEY", level: "recommended", feature: "Crypto payments" },
  { name: "NOWPAYMENTS_IPN_SECRET", level: "recommended", feature: "Payment webhook signature verification" },
  { name: "GITHUB_CLIENT_ID", level: "recommended", feature: "GitHub OAuth" },
  { name: "GITHUB_CLIENT_SECRET", level: "recommended", feature: "GitHub OAuth" },
];

export interface EnvReport {
  missingRequired: EnvCheck[];
  missingRecommended: EnvCheck[];
  warnings: string[];
}

export function checkEnv(): EnvReport {
  const missingRequired: EnvCheck[] = [];
  const missingRecommended: EnvCheck[] = [];
  const warnings: string[] = [];

  for (const check of CHECKS) {
    const value = process.env[check.name];
    if (!value || value.trim() === "") {
      if (check.level === "required") missingRequired.push(check);
      else missingRecommended.push(check);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && !/^https?:\/\//.test(appUrl)) {
    warnings.push(`NEXT_PUBLIC_APP_URL ("${appUrl}") should start with http:// or https://`);
  }
  if (process.env.NODE_ENV === "production") {
    if (appUrl && appUrl.includes("localhost")) {
      warnings.push("NEXT_PUBLIC_APP_URL points at localhost in production.");
    }
    if (!process.env.CRON_SECRET) {
      warnings.push("CRON_SECRET is not set — /api/monitor/run is publicly callable.");
    }
  }

  return { missingRequired, missingRecommended, warnings };
}

export function logEnvStatus(): void {
  const { missingRequired, missingRecommended, warnings } = checkEnv();

  for (const w of warnings) console.warn(`[env] ⚠ ${w}`);

  if (missingRecommended.length > 0) {
    console.warn(
      "[env] ⚠ Missing recommended vars (some features disabled):\n" +
        missingRecommended.map((c) => `    - ${c.name} → ${c.feature}`).join("\n")
    );
  }

  if (missingRequired.length > 0) {
    console.error(
      "[env] ✗ Missing REQUIRED vars — the app will not work correctly:\n" +
        missingRequired.map((c) => `    - ${c.name} → ${c.feature}`).join("\n")
    );
  } else if (warnings.length === 0 && missingRecommended.length === 0) {
    console.log("[env] ✓ All environment variables present.");
  }
}

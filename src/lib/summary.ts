// Plain-English scan summary.
//
// Turns the raw numbers into something a non-technical "vibe coder" instantly
// understands: a verdict, one human paragraph, and a short prioritized to-do
// list. Pure + deterministic (no API) so it's instant, free, and always works
// — and safe to run on the client from whatever fields the report already has.

export interface SummaryInput {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  totalVulnerabilities?: number;
  secretLeaks?: number;
  totalCVEs?: number;
  performanceScore?: number | null;
  accessibilityScore?: number | null;
  aeoScore?: number | null;
  seoScore?: number | null;
  platform?: string | null;
}

export interface PlainSummary {
  // 0-100 overall safety score (higher = safer).
  score: number;
  // "Critical" | "Needs work" | "Looking good"
  verdict: string;
  tone: "danger" | "warning" | "good";
  headline: string;
  paragraph: string;
  actions: string[];
}

function n(v: number | undefined | null): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

export function buildPlainSummary(input: SummaryInput): PlainSummary {
  const critical = n(input.critical);
  const high = n(input.high);
  const medium = n(input.medium);
  const secrets = n(input.secretLeaks);
  const cves = n(input.totalCVEs);
  const totalVulns = n(input.totalVulnerabilities) || critical + high + medium + n(input.low);

  // Overall safety score — secrets and criticals hurt most.
  let score = 100;
  score -= secrets * 25;
  score -= critical * 20;
  score -= high * 10;
  score -= medium * 3;
  score -= cves * 4;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const dangerous = secrets > 0 || critical > 0;
  const needsWork = high > 0 || cves > 0 || medium > 2;

  let verdict: string;
  let tone: PlainSummary["tone"];
  let headline: string;

  if (dangerous) {
    tone = "danger";
    verdict = "Needs urgent attention";
    headline = secrets > 0
      ? `${secrets} exposed secret${secrets > 1 ? "s" : ""} found — fix these first`
      : `${critical} critical issue${critical > 1 ? "s" : ""} could let attackers in`;
  } else if (needsWork) {
    tone = "warning";
    verdict = "A few things to fix";
    headline = "Your app is mostly okay, but some issues are worth fixing soon";
  } else if (totalVulns > 0) {
    tone = "good";
    verdict = "Looking good";
    headline = "Only minor suggestions — nothing dangerous found";
  } else {
    tone = "good";
    verdict = "Looking good";
    headline = "No security problems detected in what we scanned";
  }

  // Human paragraph.
  const parts: string[] = [];
  if (secrets > 0) {
    parts.push(
      `We found ${secrets} secret${secrets > 1 ? "s" : ""} (like API keys or passwords) sitting in your code where anyone can read them. Treat these as already leaked: rotate them now.`
    );
  }
  if (critical > 0) {
    parts.push(
      `There ${critical === 1 ? "is" : "are"} ${critical} critical security ${critical === 1 ? "hole" : "holes"} an attacker could exploit to break into your app or its data.`
    );
  }
  if (high > 0) {
    parts.push(`${high} high-severity issue${high > 1 ? "s" : ""} should be fixed soon.`);
  }
  if (cves > 0) {
    parts.push(
      `${cves} of your installed packages have known vulnerabilities — updating them usually fixes this.`
    );
  }
  if (medium > 0 && parts.length < 3) {
    parts.push(`${medium} medium issue${medium > 1 ? "s" : ""} are worth cleaning up.`);
  }
  if (parts.length === 0) {
    parts.push(
      "We didn't find leaked secrets, critical vulnerabilities, or known-vulnerable dependencies in the code we scanned. Keep an eye on anything that runs only on your server, since some of that isn't visible from the outside."
    );
  }

  // Prioritized actions.
  const actions: string[] = [];
  if (secrets > 0) actions.push("Rotate every exposed key/secret and move them into environment variables.");
  if (critical > 0) actions.push("Fix the critical vulnerabilities — start at the top of the Vulnerabilities tab.");
  if (cves > 0) actions.push("Update the flagged dependencies to their patched versions.");
  if (high > 0) actions.push("Work through the high-severity findings next.");
  if (medium > 0 && actions.length < 4) actions.push("Tidy up the medium-severity issues when you can.");
  if (actions.length === 0) actions.push("You're in good shape — re-scan after any major change to stay safe.");

  return {
    score,
    verdict,
    tone,
    headline,
    paragraph: parts.join(" "),
    actions: actions.slice(0, 4),
  };
}

import { Resend } from "resend";
import { withTimeout } from "./http";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

type EmailPayload = Parameters<Resend["emails"]["send"]>[0];
function sendEmail(payload: EmailPayload) {
  return withTimeout(getResend().emails.send(payload), 15_000, "email send");
}

export async function sendReportReady(to: string, scanId: string, url: string, summary: {
  critical: number;
  high: number;
  totalIssues: number;
  seoScore: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reportUrl = `${appUrl}/report/${scanId}`;

  await sendEmail({
    from: "OverMCP <reports@overmcp.com>",
    to,
    subject: `🛡️ Your scan is ready — ${summary.critical + summary.high} critical issues found`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4ade80; margin: 0; font-size: 24px;">OverMCP</h1>
          <p style="color: #6b7280; margin-top: 4px;">Security Report Ready</p>
        </div>

        <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #9ca3af; margin: 0 0 8px;">Scanned:</p>
          <p style="color: #fff; font-weight: 600; margin: 0; word-break: break-all;">${url}</p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
          <div style="flex: 1; background: #1a0000; border: 1px solid #3b0000; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 28px; font-weight: 700; color: #f87171; margin: 0;">${summary.critical}</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">Critical</p>
          </div>
          <div style="flex: 1; background: #1a0f00; border: 1px solid #3b2200; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 28px; font-weight: 700; color: #fb923c; margin: 0;">${summary.high}</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">High</p>
          </div>
          <div style="flex: 1; background: #001a0f; border: 1px solid #003b22; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="font-size: 28px; font-weight: 700; color: #4ade80; margin: 0;">${summary.seoScore}/100</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">SEO</p>
          </div>
        </div>

        <a href="${reportUrl}" style="display: block; text-align: center; background: linear-gradient(to right, #22c55e, #059669); color: #fff; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Full Report →
        </a>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">
          Unlock all ${summary.totalIssues} issues with fixed code for just $5 in crypto.
        </p>
      </div>
    `,
  });
}

export async function sendPaymentConfirmation(to: string, scanId: string, tier: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reportUrl = `${appUrl}/report/${scanId}`;

  await sendEmail({
    from: "OverMCP <reports@overmcp.com>",
    to,
    subject: `✅ Payment confirmed — your full report is unlocked`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4ade80; margin: 0; font-size: 24px;">OverMCP</h1>
          <p style="color: #4ade80; margin-top: 8px;">Payment Confirmed ✓</p>
        </div>

        <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <p style="color: #9ca3af; margin: 0 0 8px;">Plan: <strong style="color: #fff;">${tier === "deploy" ? "Fix & Deploy" : "Full Report"}</strong></p>
          <p style="color: #9ca3af; margin: 0;">Your full security report with fixes is now available.</p>
        </div>

        <a href="${reportUrl}" style="display: block; text-align: center; background: linear-gradient(to right, #22c55e, #059669); color: #fff; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Your Report →
        </a>

        ${tier === "deploy" ? `
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 16px;">
          Your fixed version is being deployed. You'll get another email when it's live.
        </p>
        ` : ""}
      </div>
    `,
  });
}

export async function sendMonitorAlert(args: {
  to: string;
  url: string;
  monitorId: string;
  manageToken: string;
  newFindings: string[];
  fixedCount: number;
  score: number;
  frequency: "daily" | "weekly";
  isBaseline: boolean;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const rescanUrl = `${appUrl}/?url=${encodeURIComponent(args.url)}`;
  const unsubscribeUrl = `${appUrl}/api/monitor?id=${args.monitorId}&token=${args.manageToken}&action=disable`;

  const count = args.newFindings.length;
  const subject = args.isBaseline
    ? `🛡️ Monitoring started for ${args.url} — ${count} issue${count === 1 ? "" : "s"} found`
    : `⚠️ ${count} new security issue${count === 1 ? "" : "s"} on ${args.url}`;

  const findingsHtml = args.newFindings
    .slice(0, 20)
    .map(
      (f) =>
        `<li style="color:#e5e7eb;font-size:13px;margin-bottom:6px;line-height:1.4;">${f.replace(/</g, "&lt;")}</li>`
    )
    .join("");

  await sendEmail({
    from: "OverMCP <alerts@overmcp.com>",
    to: args.to,
    subject,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #4ade80; margin: 0; font-size: 24px;">OverMCP</h1>
          <p style="color: #9ca3af; margin-top: 4px;">Continuous Monitoring (${args.frequency})</p>
        </div>

        <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <p style="color: #9ca3af; margin: 0 0 6px;">Site:</p>
          <p style="color: #fff; font-weight: 600; margin: 0 0 16px; word-break: break-all;">${args.url}</p>
          <p style="color: ${count > 0 ? "#f87171" : "#4ade80"}; margin: 0; font-weight: 600;">
            ${args.isBaseline ? `${count} issue${count === 1 ? "" : "s"} detected at baseline` : `${count} new issue${count === 1 ? "" : "s"} detected`}
          </p>
          ${args.fixedCount > 0 ? `<p style="color:#4ade80;margin:6px 0 0;">${args.fixedCount} issue${args.fixedCount === 1 ? "" : "s"} fixed since last check</p>` : ""}
          <p style="color:#9ca3af;margin:8px 0 0;font-size:13px;">Security score: <strong style="color:#fff;">${args.score}/100</strong></p>
        </div>

        ${findingsHtml ? `<ul style="background:#1a0000;border:1px solid #3b0000;border-radius:12px;padding:20px 20px 20px 36px;margin:0 0 20px;">${findingsHtml}</ul>` : ""}

        <a href="${rescanUrl}" style="display: block; text-align: center; background: linear-gradient(to right, #22c55e, #059669); color: #fff; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Run a full scan →
        </a>

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 24px;">
          <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Stop monitoring this site</a>
        </p>
      </div>
    `,
  });
}

export async function sendRescanAlert(to: string, scanId: string, url: string, newIssues: number, fixedIssues: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reportUrl = `${appUrl}/report/${scanId}`;

  await sendEmail({
    from: "OverMCP <alerts@overmcp.com>",
    to,
    subject: newIssues > 0
      ? `⚠️ ${newIssues} new vulnerabilities found on ${url}`
      : `✅ Weekly scan — ${url} is secure`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #4ade80; margin: 0; font-size: 24px;">OverMCP</h1>
          <p style="color: #9ca3af; margin-top: 4px;">Weekly Security Scan</p>
        </div>

        <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #9ca3af; margin: 0 0 4px;">Site: <strong style="color: #fff;">${url}</strong></p>
          ${newIssues > 0
            ? `<p style="color: #f87171; margin: 8px 0 0;">⚠️ ${newIssues} new issue${newIssues > 1 ? "s" : ""} detected</p>`
            : `<p style="color: #4ade80; margin: 8px 0 0;">✅ No new vulnerabilities found</p>`
          }
          ${fixedIssues > 0 ? `<p style="color: #4ade80; margin: 4px 0 0;">${fixedIssues} issue${fixedIssues > 1 ? "s" : ""} fixed since last scan</p>` : ""}
        </div>

        <a href="${reportUrl}" style="display: block; text-align: center; background: linear-gradient(to right, #22c55e, #059669); color: #fff; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Latest Report →
        </a>
      </div>
    `,
  });
}

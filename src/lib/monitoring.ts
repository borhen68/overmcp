import { randomUUID } from "crypto";
import db from "./db";
import { crawlSite } from "./crawler";
import { scanSecrets } from "./secrets";
import { scanDependencies } from "./dependencies";

export type MonitorFrequency = "daily" | "weekly";

export interface Monitor {
  id: string;
  url: string;
  email: string;
  webhookUrl: string | null;
  frequency: MonitorFrequency;
  manageToken: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
  lastScore: number | null;
  lastFingerprint: string[];
  consecutiveFailures: number;
}

export interface MonitorRunResult {
  monitorId: string;
  url: string;
  ran: boolean;
  error?: string;
  score?: number;
  newFindings?: string[];
  fixedCount?: number;
  isBaseline?: boolean;
  alerted?: boolean;
}

const FREQUENCY_MS: Record<MonitorFrequency, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

let monitoringDbReady = false;

async function ensureMonitoringDB() {
  if (monitoringDbReady) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      email TEXT NOT NULL,
      webhook_url TEXT,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      manage_token TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_run_at TEXT,
      next_run_at TEXT NOT NULL,
      last_score INTEGER,
      last_fingerprint TEXT NOT NULL DEFAULT '[]',
      consecutive_failures INTEGER NOT NULL DEFAULT 0
    )
  `);
  monitoringDbReady = true;
}

type MonitorRow = Record<string, unknown>;

function rowToMonitor(row: MonitorRow): Monitor {
  return {
    id: row.id as string,
    url: row.url as string,
    email: row.email as string,
    webhookUrl: (row.webhook_url as string | null) || null,
    frequency: (row.frequency as MonitorFrequency) || "weekly",
    manageToken: row.manage_token as string,
    enabled: row.enabled === 1 || row.enabled === true,
    createdAt: row.created_at as string,
    lastRunAt: (row.last_run_at as string | null) || null,
    nextRunAt: row.next_run_at as string,
    lastScore: row.last_score === null || row.last_score === undefined ? null : Number(row.last_score),
    lastFingerprint: row.last_fingerprint ? JSON.parse(row.last_fingerprint as string) : [],
    consecutiveFailures: Number(row.consecutive_failures || 0),
  };
}

export async function createMonitor(input: {
  url: string;
  email: string;
  webhookUrl?: string | null;
  frequency?: MonitorFrequency;
}): Promise<Monitor> {
  await ensureMonitoringDB();

  const normalizedUrl = input.url.trim().replace(/\/+$/, "");
  const frequency: MonitorFrequency = input.frequency === "daily" ? "daily" : "weekly";

  // Prevent duplicate monitors for the same url+email.
  const existing = await db.execute({
    sql: `SELECT * FROM monitors WHERE url = ? AND email = ? LIMIT 1`,
    args: [normalizedUrl, input.email],
  });
  if (existing.rows.length > 0) {
    return rowToMonitor(existing.rows[0] as MonitorRow);
  }

  const now = new Date();
  const monitor: Monitor = {
    id: randomUUID(),
    url: normalizedUrl,
    email: input.email.trim(),
    webhookUrl: input.webhookUrl?.trim() || null,
    frequency,
    manageToken: randomUUID(),
    enabled: true,
    createdAt: now.toISOString(),
    lastRunAt: null,
    // First run as soon as the cron picks it up.
    nextRunAt: now.toISOString(),
    lastScore: null,
    lastFingerprint: [],
    consecutiveFailures: 0,
  };

  await db.execute({
    sql: `INSERT INTO monitors
      (id, url, email, webhook_url, frequency, manage_token, enabled, created_at, last_run_at, next_run_at, last_score, last_fingerprint, consecutive_failures)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, NULL, ?, NULL, '[]', 0)`,
    args: [
      monitor.id, monitor.url, monitor.email, monitor.webhookUrl, monitor.frequency,
      monitor.manageToken, monitor.createdAt, monitor.nextRunAt,
    ],
  });

  return monitor;
}

export async function getMonitor(id: string): Promise<Monitor | null> {
  await ensureMonitoringDB();
  const res = await db.execute({ sql: `SELECT * FROM monitors WHERE id = ?`, args: [id] });
  if (res.rows.length === 0) return null;
  return rowToMonitor(res.rows[0] as MonitorRow);
}

export async function listMonitorsByEmail(email: string): Promise<Monitor[]> {
  await ensureMonitoringDB();
  const res = await db.execute({
    sql: `SELECT * FROM monitors WHERE email = ? ORDER BY created_at DESC`,
    args: [email],
  });
  return res.rows.map((r) => rowToMonitor(r as MonitorRow));
}

export async function listDueMonitors(limit = 25): Promise<Monitor[]> {
  await ensureMonitoringDB();
  const res = await db.execute({
    sql: `SELECT * FROM monitors WHERE enabled = 1 AND next_run_at <= ? ORDER BY next_run_at ASC LIMIT ?`,
    args: [new Date().toISOString(), limit],
  });
  return res.rows.map((r) => rowToMonitor(r as MonitorRow));
}

export async function setMonitorEnabled(id: string, token: string, enabled: boolean): Promise<boolean> {
  await ensureMonitoringDB();
  const monitor = await getMonitor(id);
  if (!monitor || monitor.manageToken !== token) return false;
  await db.execute({
    sql: `UPDATE monitors SET enabled = ? WHERE id = ?`,
    args: [enabled ? 1 : 0, id],
  });
  return true;
}

export async function deleteMonitor(id: string, token: string): Promise<boolean> {
  await ensureMonitoringDB();
  const monitor = await getMonitor(id);
  if (!monitor || monitor.manageToken !== token) return false;
  await db.execute({ sql: `DELETE FROM monitors WHERE id = ?`, args: [id] });
  return true;
}

// Build a stable, comparable set of security-relevant finding keys.
function buildFingerprint(
  secrets: ReturnType<typeof scanSecrets>,
  deps: Awaited<ReturnType<typeof scanDependencies>>
): { keys: string[]; labels: Map<string, string> } {
  const keys: string[] = [];
  const labels = new Map<string, string>();

  for (const leak of secrets.leaks) {
    const key = `secret:${leak.type}:${leak.file}:${leak.line}`;
    keys.push(key);
    labels.set(key, `${leak.severity.toUpperCase()} — ${leak.type} in ${leak.file}:${leak.line}`);
  }
  if (deps) {
    for (const vuln of deps.vulnerabilities) {
      const key = `dep:${vuln.package}:${vuln.cve}`;
      keys.push(key);
      labels.set(key, `${vuln.severity.toUpperCase()} — ${vuln.package}@${vuln.version} (${vuln.cve})`);
    }
  }
  return { keys: keys.sort(), labels };
}

async function persistRun(
  monitor: Monitor,
  updates: { score: number | null; fingerprint: string[]; failed: boolean }
) {
  const now = new Date();
  const next = new Date(now.getTime() + FREQUENCY_MS[monitor.frequency]);
  await db.execute({
    sql: `UPDATE monitors
      SET last_run_at = ?, next_run_at = ?, last_score = ?, last_fingerprint = ?, consecutive_failures = ?
      WHERE id = ?`,
    args: [
      now.toISOString(),
      next.toISOString(),
      updates.score,
      JSON.stringify(updates.fingerprint),
      updates.failed ? monitor.consecutiveFailures + 1 : 0,
      monitor.id,
    ],
  });
}

/**
 * Run a single monitor: re-scan the site, diff against the last snapshot,
 * persist the new state, and alert (email + webhook) when NEW issues appear.
 */
export async function runMonitor(
  monitor: Monitor,
  notifiers: {
    sendEmail: (args: {
      to: string; url: string; monitorId: string; manageToken: string;
      newFindings: string[]; fixedCount: number; score: number; frequency: MonitorFrequency; isBaseline: boolean;
    }) => Promise<void>;
  }
): Promise<MonitorRunResult> {
  await ensureMonitoringDB();

  let crawl;
  try {
    crawl = await crawlSite(monitor.url);
  } catch (e) {
    await persistRun(monitor, { score: monitor.lastScore, fingerprint: monitor.lastFingerprint, failed: true });
    return { monitorId: monitor.id, url: monitor.url, ran: false, error: e instanceof Error ? e.message : "crawl failed" };
  }

  if (!crawl || crawl.files.length === 0) {
    await persistRun(monitor, { score: monitor.lastScore, fingerprint: monitor.lastFingerprint, failed: true });
    return { monitorId: monitor.id, url: monitor.url, ran: false, error: "no files found" };
  }

  const files = crawl.files.map((f) => ({ name: f.name, content: f.content }));
  const secrets = scanSecrets(files);
  const deps = await scanDependencies(files).catch(() => null);

  const { keys: currentKeys, labels } = buildFingerprint(secrets, deps);
  const previous = new Set(monitor.lastFingerprint);
  const isBaseline = monitor.lastRunAt === null;

  const newKeys = currentKeys.filter((k) => !previous.has(k));
  const fixedCount = monitor.lastFingerprint.filter((k) => !currentKeys.includes(k)).length;

  // Combined security score (lower of secrets score and dependency risk score).
  const depScore = deps ? deps.riskScore : 100;
  const score = Math.min(secrets.score, depScore);

  await persistRun(monitor, { score, fingerprint: currentKeys, failed: false });

  // Alert when new issues appear, or on the very first run if any exist (baseline).
  const findingsToReport = isBaseline ? currentKeys : newKeys;
  const shouldAlert = findingsToReport.length > 0;
  let alerted = false;

  if (shouldAlert) {
    const labeled = findingsToReport.map((k) => labels.get(k) || k);
    try {
      await notifiers.sendEmail({
        to: monitor.email,
        url: monitor.url,
        monitorId: monitor.id,
        manageToken: monitor.manageToken,
        newFindings: labeled,
        fixedCount,
        score,
        frequency: monitor.frequency,
        isBaseline,
      });
    } catch {
      // email failure should not break the cron run
    }
    if (monitor.webhookUrl) {
      await postWebhook(monitor.webhookUrl, monitor.url, labeled, score, isBaseline).catch(() => {});
    }
    alerted = true;
  }

  return {
    monitorId: monitor.id,
    url: monitor.url,
    ran: true,
    score,
    newFindings: isBaseline ? [] : newKeys,
    fixedCount,
    isBaseline,
    alerted,
  };
}

async function postWebhook(
  webhookUrl: string,
  url: string,
  findings: string[],
  score: number,
  isBaseline: boolean
): Promise<void> {
  const title = isBaseline
    ? `🛡️ OverMCP now monitoring ${url} — ${findings.length} issue(s) found (score ${score}/100)`
    : `⚠️ OverMCP: ${findings.length} new security issue(s) on ${url} (score ${score}/100)`;
  const body = [title, ...findings.slice(0, 15).map((f) => `• ${f}`)].join("\n");

  // Slack uses { text }, Discord uses { content } — send both; each ignores the other.
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: body, content: body }),
  });
}

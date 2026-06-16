import { VulnerabilityResult } from "./deepseek";
import { AEOResult } from "./aeo";
import { PerformanceResult } from "./performance";
import { CVEResult } from "./dependencies";
import { SecretsResult } from "./secrets";
import { AccessibilityResult } from "./accessibility";
import { TechStackResult } from "./techstack";
import { createScan, updateScanDB, getScanById, initDB } from "./db";

export interface ScanRecord {
  id: string;
  createdAt: string;
  status: "scanning" | "done" | "error";
  paid: boolean;
  tier: "free" | "fix" | "deploy";
  paymentId?: string;
  invoiceUrl?: string;
  email?: string;
  url?: string;
  platform?: string;
  files: { name: string; content: string }[];
  result?: VulnerabilityResult;
  aeo?: AEOResult;
  performance?: PerformanceResult;
  dependencies?: CVEResult;
  secrets?: SecretsResult;
  accessibility?: AccessibilityResult;
  techStack?: TechStackResult;
  error?: string;
}

const scans = new Map<string, ScanRecord>();
let dbReady = false;

async function ensureDB() {
  if (!dbReady) {
    try {
      await initDB();
      dbReady = true;
    } catch {
      // DB not available, continue with in-memory only
    }
  }
}

export function getScan(id: string): ScanRecord | undefined {
  return scans.get(id);
}

export async function getScanWithDB(id: string): Promise<ScanRecord | undefined> {
  const cached = scans.get(id);
  if (cached) return cached;

  await ensureDB();
  if (!dbReady) return undefined;

  try {
    const row = await getScanById(id);
    if (!row) return undefined;

    const record: ScanRecord = {
      id: row.id,
      createdAt: row.createdAt,
      status: row.status as ScanRecord["status"],
      paid: row.paid,
      tier: row.tier as ScanRecord["tier"],
      paymentId: row.paymentId || undefined,
      invoiceUrl: row.invoiceUrl || undefined,
      email: row.email || undefined,
      url: row.url || undefined,
      platform: row.platform || undefined,
      files: row.files || [],
      result: row.result || undefined,
      aeo: row.aeo || undefined,
      performance: row.performance || undefined,
      dependencies: row.dependencies || undefined,
      error: row.error || undefined,
    };
    scans.set(id, record);
    return record;
  } catch {
    return undefined;
  }
}

export function setScan(id: string, record: ScanRecord): void {
  scans.set(id, record);

  ensureDB().then(() => {
    if (!dbReady) return;
    createScan({ id, url: record.url, platform: record.platform, email: record.email }).catch(() => {});
  });
}

export function updateScan(
  id: string,
  updates: Partial<ScanRecord>
): ScanRecord | undefined {
  const existing = scans.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  scans.set(id, updated);

  ensureDB().then(() => {
    if (!dbReady) return;
    const dbUpdates: Record<string, string | number | null | boolean> = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paid !== undefined) dbUpdates.paid = updates.paid;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    if (updates.paymentId !== undefined) dbUpdates.payment_id = updates.paymentId;
    if (updates.invoiceUrl !== undefined) dbUpdates.invoice_url = updates.invoiceUrl;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.files !== undefined) dbUpdates.files = JSON.stringify(updates.files);
    if (updates.result !== undefined) dbUpdates.result = JSON.stringify(updates.result);
    if (updates.aeo !== undefined) dbUpdates.aeo = JSON.stringify(updates.aeo);
    if (updates.performance !== undefined) dbUpdates.performance = JSON.stringify(updates.performance);
    if (updates.dependencies !== undefined) dbUpdates.dependencies = JSON.stringify(updates.dependencies);
    if (updates.error !== undefined) dbUpdates.error = updates.error;

    updateScanDB(id, dbUpdates as Parameters<typeof updateScanDB>[1]).catch(() => {});
  });

  return updated;
}

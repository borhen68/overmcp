import { VulnerabilityResult } from "./deepseek";
import { AEOResult } from "./aeo";
import { PerformanceResult } from "./performance";
import { CVEResult } from "./dependencies";
import { SecretsResult } from "./secrets";
import { AccessibilityResult } from "./accessibility";
import { TechStackResult } from "./techstack";
import { createScan, updateScanDB, getScanById, initDB, upsertScan } from "./db";

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
  progress?: string;
  error?: string;
}

const scans = new Map<string, ScanRecord>();
let dbReady = false;

async function ensureDB() {
  if (!dbReady) {
    try {
      await initDB();
      dbReady = true;
    } catch (e) {
      // DB not available, continue with in-memory only. Log it — on serverless
      // this is the difference between a scan persisting and silently vanishing
      // between the POST and the poll (which shows up as a 404).
      console.error("[db] initDB failed — scans will not persist across instances:", e);
    }
  }
}

export function getScan(id: string): ScanRecord | undefined {
  return scans.get(id);
}

export async function getScanWithDB(id: string): Promise<ScanRecord | undefined> {
  const cached = scans.get(id);
  // Return cached records EXCEPT while still scanning — a stale cached
  // "scanning" record would freeze the progress indicator (and, on a cold
  // poller instance, could hide the eventual done/error). Re-read those.
  if (cached && cached.status !== "scanning") return cached;

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
      secrets: row.secrets || undefined,
      accessibility: row.accessibility || undefined,
      techStack: row.techStack || undefined,
      progress: row.progress || undefined,
      error: row.error || undefined,
    };
    // Don't cache in-progress scans — we want each poll to see fresh progress.
    if (record.status !== "scanning") scans.set(id, record);
    return record;
  } catch (e) {
    console.error(`[db] getScanById(${id}) failed:`, e);
    return undefined;
  }
}

export function setScan(id: string, record: ScanRecord): void {
  scans.set(id, record);

  ensureDB().then(() => {
    if (!dbReady) return;
    createScan({ id, url: record.url, platform: record.platform, email: record.email })
      .catch((e) => console.error(`[db] createScan(${id}) failed:`, e));
  });
}

// Awaited persistence of the full in-memory record. Must be awaited inside
// background tasks (e.g. within `after()`) so results survive on serverless,
// where the function may freeze the moment the awaited work resolves.
export async function flushScan(id: string): Promise<void> {
  const record = scans.get(id);
  if (!record) return;
  await ensureDB();
  if (!dbReady) return;
  try {
    await upsertScan(record);
  } catch (e) {
    console.error(`[db] flushScan(${id}) failed — record stays in-memory only:`, e);
  }
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
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.error !== undefined) dbUpdates.error = updates.error;

    updateScanDB(id, dbUpdates as Parameters<typeof updateScanDB>[1])
      .catch((e) => console.error(`[db] updateScanDB(${id}) failed:`, e));
  });

  return updated;
}

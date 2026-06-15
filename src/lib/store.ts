import { VulnerabilityResult } from "./deepseek";

export interface ScanRecord {
  id: string;
  createdAt: string;
  status: "scanning" | "done" | "error";
  paid: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  files: { name: string; content: string }[];
  result?: VulnerabilityResult;
  error?: string;
}

// In-memory store — replace with a database for production
const scans = new Map<string, ScanRecord>();

export function getScan(id: string): ScanRecord | undefined {
  return scans.get(id);
}

export function setScan(id: string, record: ScanRecord): void {
  scans.set(id, record);
}

export function updateScan(
  id: string,
  updates: Partial<ScanRecord>
): ScanRecord | undefined {
  const existing = scans.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  scans.set(id, updated);
  return updated;
}

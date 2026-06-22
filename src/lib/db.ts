import { createClient, type Client } from "@libsql/client/web";

let _db: Client | null = null;
function getDb(): Client {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL || "libsql://localhost",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return _db;
}

const db = new Proxy({} as Client, {
  get(_, prop) {
    const client = getDb();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

export async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scanning',
      paid INTEGER NOT NULL DEFAULT 0,
      tier TEXT DEFAULT 'free',
      payment_id TEXT,
      invoice_url TEXT,
      email TEXT,
      url TEXT,
      platform TEXT,
      files TEXT,
      result TEXT,
      aeo TEXT,
      performance TEXT,
      dependencies TEXT,
      secrets TEXT,
      accessibility TEXT,
      tech_stack TEXT,
      progress TEXT,
      error TEXT
    )
  `);

  // Idempotent migration for databases created before these columns existed.
  for (const col of ["secrets", "accessibility", "tech_stack", "progress"]) {
    try {
      await db.execute(`ALTER TABLE scans ADD COLUMN ${col} TEXT`);
    } catch {
      // Column already exists — ignore.
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      created_at TEXT NOT NULL,
      platform_tokens TEXT DEFAULT '{}',
      total_scans INTEGER DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      ip TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL
    )
  `);
}

export async function createScan(scan: {
  id: string;
  url?: string;
  platform?: string;
  email?: string;
}) {
  await db.execute({
    sql: `INSERT INTO scans (id, created_at, status, url, platform, email) VALUES (?, ?, 'scanning', ?, ?, ?)`,
    args: [scan.id, new Date().toISOString(), scan.url || null, scan.platform || null, scan.email || null],
  });
}

export async function updateScanDB(
  id: string,
  updates: {
    status?: string;
    paid?: boolean;
    tier?: string;
    payment_id?: string;
    invoice_url?: string;
    email?: string;
    files?: string;
    result?: string;
    aeo?: string;
    performance?: string;
    dependencies?: string;
    progress?: string;
    error?: string;
  }
) {
  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  if (updates.status !== undefined) { setClauses.push("status = ?"); args.push(updates.status); }
  if (updates.paid !== undefined) { setClauses.push("paid = ?"); args.push(updates.paid ? 1 : 0); }
  if (updates.tier !== undefined) { setClauses.push("tier = ?"); args.push(updates.tier); }
  if (updates.payment_id !== undefined) { setClauses.push("payment_id = ?"); args.push(updates.payment_id); }
  if (updates.invoice_url !== undefined) { setClauses.push("invoice_url = ?"); args.push(updates.invoice_url); }
  if (updates.email !== undefined) { setClauses.push("email = ?"); args.push(updates.email); }
  if (updates.files !== undefined) { setClauses.push("files = ?"); args.push(updates.files); }
  if (updates.result !== undefined) { setClauses.push("result = ?"); args.push(updates.result); }
  if (updates.aeo !== undefined) { setClauses.push("aeo = ?"); args.push(updates.aeo); }
  if (updates.performance !== undefined) { setClauses.push("performance = ?"); args.push(updates.performance); }
  if (updates.dependencies !== undefined) { setClauses.push("dependencies = ?"); args.push(updates.dependencies); }
  if (updates.progress !== undefined) { setClauses.push("progress = ?"); args.push(updates.progress); }
  if (updates.error !== undefined) { setClauses.push("error = ?"); args.push(updates.error); }

  if (setClauses.length === 0) return;

  args.push(id);
  await db.execute({
    sql: `UPDATE scans SET ${setClauses.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function getScanById(id: string) {
  const result = await db.execute({
    sql: `SELECT * FROM scans WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  const parse = (v: unknown) => {
    if (typeof v !== "string" || v.length === 0) return null;
    try { return JSON.parse(v); } catch { return null; }
  };

  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    status: row.status as string,
    paid: row.paid === 1,
    tier: (row.tier as string) || "free",
    paymentId: row.payment_id as string | null,
    invoiceUrl: row.invoice_url as string | null,
    email: row.email as string | null,
    url: row.url as string | null,
    platform: row.platform as string | null,
    files: parse(row.files) || [],
    result: parse(row.result),
    aeo: parse(row.aeo),
    performance: parse(row.performance),
    dependencies: parse(row.dependencies),
    secrets: parse(row.secrets),
    accessibility: parse(row.accessibility),
    techStack: parse(row.tech_stack),
    progress: (row.progress as string | null) || undefined,
    error: row.error as string | null,
  };
}

// Awaited full upsert — the single source of truth for serverless persistence.
export async function upsertScan(scan: {
  id: string;
  createdAt: string;
  status: string;
  paid: boolean;
  tier: string;
  paymentId?: string | null;
  invoiceUrl?: string | null;
  email?: string | null;
  url?: string | null;
  platform?: string | null;
  files?: unknown;
  result?: unknown;
  aeo?: unknown;
  performance?: unknown;
  dependencies?: unknown;
  secrets?: unknown;
  accessibility?: unknown;
  techStack?: unknown;
  progress?: string | null;
  error?: string | null;
}) {
  const j = (v: unknown) => (v === undefined || v === null ? null : JSON.stringify(v));
  await db.execute({
    sql: `INSERT INTO scans (
        id, created_at, status, paid, tier, payment_id, invoice_url, email, url, platform,
        files, result, aeo, performance, dependencies, secrets, accessibility, tech_stack, progress, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        paid = excluded.paid,
        tier = excluded.tier,
        payment_id = excluded.payment_id,
        invoice_url = excluded.invoice_url,
        email = excluded.email,
        url = excluded.url,
        platform = excluded.platform,
        files = excluded.files,
        result = excluded.result,
        aeo = excluded.aeo,
        performance = excluded.performance,
        dependencies = excluded.dependencies,
        secrets = excluded.secrets,
        accessibility = excluded.accessibility,
        tech_stack = excluded.tech_stack,
        progress = excluded.progress,
        error = excluded.error`,
    args: [
      scan.id,
      scan.createdAt,
      scan.status,
      scan.paid ? 1 : 0,
      scan.tier,
      scan.paymentId ?? null,
      scan.invoiceUrl ?? null,
      scan.email ?? null,
      scan.url ?? null,
      scan.platform ?? null,
      j(scan.files),
      j(scan.result),
      j(scan.aeo),
      j(scan.performance),
      j(scan.dependencies),
      j(scan.secrets),
      j(scan.accessibility),
      j(scan.techStack),
      scan.progress ?? null,
      scan.error ?? null,
    ],
  });
}

export async function getRecentScans(limit = 20) {
  const result = await db.execute({
    sql: `SELECT id, created_at, status, paid, tier, url, platform, email FROM scans ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    status: row.status as string,
    paid: row.paid === 1,
    tier: (row.tier as string) || "free",
    url: row.url as string | null,
    platform: row.platform as string | null,
    email: row.email as string | null,
  }));
}

export async function hasPaidScan(email: string, tier = "deploy"): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT 1 FROM scans WHERE email = ? AND paid = 1 AND tier = ? LIMIT 1`,
    args: [email, tier],
  });
  return result.rows.length > 0;
}

export async function checkRateLimit(ip: string, maxRequests = 5, windowMinutes = 60): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000).toISOString();

  const result = await db.execute({
    sql: `SELECT count, window_start FROM rate_limits WHERE ip = ?`,
    args: [ip],
  });

  if (result.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO rate_limits (ip, count, window_start) VALUES (?, 1, ?)`,
      args: [ip, now.toISOString()],
    });
    return true;
  }

  const row = result.rows[0];
  const storedWindowStart = row.window_start as string;

  if (storedWindowStart < windowStart) {
    await db.execute({
      sql: `UPDATE rate_limits SET count = 1, window_start = ? WHERE ip = ?`,
      args: [now.toISOString(), ip],
    });
    return true;
  }

  const count = row.count as number;
  if (count >= maxRequests) {
    return false;
  }

  await db.execute({
    sql: `UPDATE rate_limits SET count = count + 1 WHERE ip = ?`,
    args: [ip],
  });
  return true;
}

export default db;

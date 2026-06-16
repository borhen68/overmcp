import { NextRequest, NextResponse } from "next/server";
import { listDueMonitors, runMonitor } from "@/lib/monitoring";
import { sendMonitorAlert } from "@/lib/email";

export const dynamic = "force-dynamic";
// Re-scanning multiple sites can take a while.
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, allow (useful for local dev).
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Fallback: ?secret= query param for cron providers that can't set headers.
  const qp = request.nextUrl.searchParams.get("secret");
  return qp === secret;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 25;

  const due = await listDueMonitors(limit);

  const results = [];
  for (const monitor of due) {
    const result = await runMonitor(monitor, {
      sendEmail: (a) => sendMonitorAlert(a),
    });
    results.push(result);
  }

  const alerted = results.filter((r) => r.alerted).length;
  return NextResponse.json({
    checked: results.length,
    alerted,
    results,
    ranAt: new Date().toISOString(),
  });
}

// Vercel Cron issues GET requests.
export async function GET(request: NextRequest) {
  return handle(request);
}

// Allow manual triggering / other cron providers via POST.
export async function POST(request: NextRequest) {
  return handle(request);
}

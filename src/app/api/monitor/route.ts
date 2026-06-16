import { NextRequest, NextResponse } from "next/server";
import {
  createMonitor,
  listMonitorsByEmail,
  getMonitor,
  setMonitorEnabled,
  deleteMonitor,
  type MonitorFrequency,
} from "@/lib/monitoring";
import { rateLimit } from "@/lib/rate-limit";
import { hasPaidScan } from "@/lib/db";

export const dynamic = "force-dynamic";

// Continuous monitoring is part of the $29 Deploy plan.
const MONITORING_TIER = "deploy";

function publicMonitor(m: {
  id: string; url: string; email: string; frequency: string; enabled: boolean;
  createdAt: string; lastRunAt: string | null; nextRunAt: string; lastScore: number | null;
}) {
  return {
    id: m.id,
    url: m.url,
    email: m.email,
    frequency: m.frequency,
    enabled: m.enabled,
    createdAt: m.createdAt,
    lastRunAt: m.lastRunAt,
    nextRunAt: m.nextRunAt,
    lastScore: m.lastScore,
  };
}

// Create a monitor.
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const { allowed } = rateLimit(`monitor:${ip}`, 10, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const body = await request.json();
    const url: string = (body.url || "").toString();
    const email: string = (body.email || "").toString();
    const webhookUrl: string | undefined = body.webhookUrl ? body.webhookUrl.toString() : undefined;
    const frequency: MonitorFrequency = body.frequency === "daily" ? "daily" : "weekly";

    const cleanedUrl = url.trim().replace(/^https?:\/\//, "");
    if (!cleanedUrl || cleanedUrl.length < 4 || !cleanedUrl.includes(".")) {
      return NextResponse.json({ error: "Enter a valid URL (e.g. myapp.vercel.app)" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (webhookUrl && !/^https:\/\//.test(webhookUrl.trim())) {
      return NextResponse.json({ error: "Webhook URL must start with https://" }, { status: 400 });
    }

    // Gate: continuous monitoring requires the $29 Deploy plan.
    const entitled = await hasPaidScan(email.trim(), MONITORING_TIER);
    if (!entitled) {
      return NextResponse.json(
        {
          error: "Continuous monitoring is part of the $29 Deploy plan.",
          requiresPlan: true,
          tier: MONITORING_TIER,
          price: 29,
        },
        { status: 402 }
      );
    }

    const monitor = await createMonitor({ url, email, webhookUrl, frequency });
    return NextResponse.json({ monitor: publicMonitor(monitor) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// List monitors by email, or one-click disable via signed link (action=disable).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    const token = searchParams.get("token");
    const action = searchParams.get("action");
    const email = searchParams.get("email");

    if (id && token && action === "disable") {
      const ok = await setMonitorEnabled(id, token, false);
      const html = ok
        ? `<div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#111;">
             <h2>Monitoring stopped ✓</h2><p>You will no longer receive alerts for this site.</p></div>`
        : `<div style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;color:#111;">
             <h2>Invalid or expired link</h2></div>`;
      return new NextResponse(html, {
        status: ok ? 200 : 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (id && token) {
      const monitor = await getMonitor(id);
      if (!monitor || monitor.manageToken !== token) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ monitor: publicMonitor(monitor) });
    }

    if (email) {
      const monitors = await listMonitorsByEmail(email.trim());
      return NextResponse.json({ monitors: monitors.map(publicMonitor) });
    }

    return NextResponse.json({ error: "Provide email, or id and token" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete a monitor (requires id + manage token).
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    const token = searchParams.get("token");
    if (!id || !token) {
      return NextResponse.json({ error: "id and token required" }, { status: 400 });
    }
    const ok = await deleteMonitor(id, token);
    if (!ok) return NextResponse.json({ error: "Not found or invalid token" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

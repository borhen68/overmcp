import { NextRequest, NextResponse } from "next/server";
import { getRecentScans, initDB } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDB();
    const scans = await getRecentScans(50);
    return NextResponse.json({ scans });
  } catch {
    return NextResponse.json({ scans: [] });
  }
}

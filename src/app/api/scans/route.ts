import { NextResponse } from "next/server";
import { getRecentScans, initDB } from "@/lib/db";

export async function GET() {
  try {
    await initDB();
    const scans = await getRecentScans(50);
    return NextResponse.json({ scans });
  } catch {
    return NextResponse.json({ scans: [] });
  }
}

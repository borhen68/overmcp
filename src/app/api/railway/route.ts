import { NextRequest, NextResponse } from "next/server";
import { listRailwayProjects, redeployRailway } from "@/lib/railway";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-railway-token") || process.env.RAILWAY_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Railway token required" }, { status: 401 });
  }

  try {
    const projects = await listRailwayProjects(token);
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-railway-token") || process.env.RAILWAY_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Railway token required" }, { status: 401 });
  }

  try {
    const { serviceId, environmentId } = await request.json();

    if (!serviceId || !environmentId) {
      return NextResponse.json({ error: "serviceId and environmentId required" }, { status: 400 });
    }

    const success = await redeployRailway(token, serviceId, environmentId);
    return NextResponse.json({ success });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Railway redeploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

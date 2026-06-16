import { NextRequest, NextResponse } from "next/server";
import { listVercelProjects } from "@/lib/vercel";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("vercel_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const projects = await listVercelProjects(token);
    return NextResponse.json(projects);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

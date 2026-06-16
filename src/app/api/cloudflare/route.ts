import { NextRequest, NextResponse } from "next/server";
import { listCFPagesProjects, deployCFPages } from "@/lib/cloudflare";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-cf-token") || process.env.CF_API_TOKEN;
  const accountId = request.headers.get("x-cf-account") || process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    return NextResponse.json({ error: "Cloudflare token and account ID required" }, { status: 401 });
  }

  try {
    const projects = await listCFPagesProjects(accountId, token);
    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list projects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-cf-token") || process.env.CF_API_TOKEN;
  const accountId = request.headers.get("x-cf-account") || process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    return NextResponse.json({ error: "Cloudflare token and account ID required" }, { status: 401 });
  }

  try {
    const { projectName, files } = await request.json();

    if (!projectName || !files) {
      return NextResponse.json({ error: "projectName and files required" }, { status: 400 });
    }

    const url = await deployCFPages(accountId, projectName, token, files);
    return NextResponse.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cloudflare deploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

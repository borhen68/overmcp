import { NextRequest, NextResponse } from "next/server";
import { listNetlifySites, getDeployFiles, getFileContent, deployToNetlify } from "@/lib/netlify";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-netlify-token") || process.env.NETLIFY_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Netlify token required" }, { status: 401 });
  }

  try {
    const sites = await listNetlifySites(token);
    return NextResponse.json({ sites });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list sites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-netlify-token") || process.env.NETLIFY_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Netlify token required" }, { status: 401 });
  }

  try {
    const { action, siteId, deployId, files } = await request.json();

    if (action === "files") {
      if (!deployId) {
        return NextResponse.json({ error: "deployId required" }, { status: 400 });
      }
      const deployFiles = await getDeployFiles(token, deployId);

      const contents = await Promise.all(
        deployFiles.map(async (f) => {
          const content = await getFileContent(token, siteId, f.path).catch(() => "");
          return { name: f.path, content };
        })
      );

      return NextResponse.json({ files: contents.filter((f) => f.content) });
    }

    if (action === "deploy") {
      if (!siteId || !files) {
        return NextResponse.json({ error: "siteId and files required" }, { status: 400 });
      }
      const url = await deployToNetlify(token, siteId, files);
      return NextResponse.json({ url });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Netlify operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

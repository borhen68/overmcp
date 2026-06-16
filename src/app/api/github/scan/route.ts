import { NextRequest, NextResponse } from "next/server";
import { fetchRepoFiles } from "@/lib/github";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { setScan, updateScan } from "@/lib/store";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("gh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    const scanId = randomUUID();

    setScan(scanId, {
      id: scanId,
      createdAt: new Date().toISOString(),
      status: "scanning",
      paid: false,
      tier: "free",
      files: [],
    });

    // Run in background
    (async () => {
      try {
        const files = await fetchRepoFiles(token, owner, repo);
        const analysisFiles = files.map((f) => ({
          name: f.path,
          content: f.content,
        }));

        updateScan(scanId, { files: analysisFiles });

        const result = await analyzeMultipleFiles(analysisFiles);
        updateScan(scanId, { status: "done", result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Scan failed";
        updateScan(scanId, { status: "error", error: message });
      }
    })();

    return NextResponse.json({ scanId, status: "scanning" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

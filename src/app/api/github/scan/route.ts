import { NextRequest, NextResponse, after } from "next/server";
import { fetchRepoFiles } from "@/lib/github";
import { runDeepAnalysis } from "@/lib/analyze";
import { setScan, updateScan, flushScan } from "@/lib/store";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

    await flushScan(scanId);

    after(async () => {
      try {
        updateScan(scanId, { progress: "Reading your repository…" });
        const files = await fetchRepoFiles(token, owner, repo);

        if (files.length === 0) {
          updateScan(scanId, {
            status: "error",
            error: "No scannable source files found in this repository.",
          });
          return;
        }

        const analysisFiles = files.map((f) => ({ name: f.path, content: f.content }));
        updateScan(scanId, {
          files: analysisFiles,
          progress: `Found ${analysisFiles.length} files — prioritizing high-risk code…`,
        });

        const a = await runDeepAnalysis(analysisFiles, "unknown", (m) =>
          updateScan(scanId, { progress: m })
        );

        updateScan(scanId, {
          status: "done",
          result: a.result,
          ...(a.dependencies ? { dependencies: a.dependencies } : {}),
          ...(a.performance ? { performance: a.performance } : {}),
          secrets: a.secrets,
          accessibility: a.accessibility,
          techStack: a.techStack,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Scan failed";
        updateScan(scanId, { status: "error", error: message });
      } finally {
        await flushScan(scanId);
      }
    });

    return NextResponse.json({ scanId, status: "scanning" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

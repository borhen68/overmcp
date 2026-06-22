import { NextRequest, NextResponse, after } from "next/server";
import { getLatestDeployment, getDeploymentFiles } from "@/lib/vercel";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { setScan, updateScan, flushScan } from "@/lib/store";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("vercel_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { projectId, projectName } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
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
        const deploymentId = await getLatestDeployment(token, projectId);
        if (!deploymentId) {
          updateScan(scanId, { status: "error", error: "No deployment found" });
          return;
        }

        const files = await getDeploymentFiles(token, deploymentId);
        if (files.length === 0) {
          updateScan(scanId, { status: "error", error: "No scannable files found" });
          return;
        }

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
      } finally {
        await flushScan(scanId);
      }
    });

    return NextResponse.json({
      scanId,
      status: "scanning",
      platform: "vercel",
      projectName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

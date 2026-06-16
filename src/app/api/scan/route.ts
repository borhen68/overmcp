import { NextRequest, NextResponse } from "next/server";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { setScan, updateScan } from "@/lib/store";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files } = body as { files: { name: string; content: string }[] };

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 files per scan" },
        { status: 400 }
      );
    }

    const totalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    if (totalSize > 500000) {
      return NextResponse.json(
        { error: "Total file size exceeds 500KB limit" },
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
      files,
    });

    // Run analysis in background
    analyzeMultipleFiles(files)
      .then((result) => {
        updateScan(scanId, { status: "done", result });
      })
      .catch((error) => {
        updateScan(scanId, {
          status: "error",
          error: error.message || "Analysis failed",
        });
      });

    return NextResponse.json({ scanId, status: "scanning" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

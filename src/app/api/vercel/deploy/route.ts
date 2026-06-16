import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/store";
import { deployFixedFiles } from "@/lib/vercel";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("vercel_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { scanId, projectName } = await request.json();

    const scan = getScan(scanId);
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (!scan.paid) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }

    if (!scan.result) {
      return NextResponse.json({ error: "No results available" }, { status: 400 });
    }

    // Build the full fixed file set:
    // Start with original files, apply fixes on top
    const fileMap = new Map<string, string>();
    for (const file of scan.files) {
      fileMap.set(file.name, file.content);
    }

    // Apply vulnerability fixes
    for (const vuln of scan.result.vulnerabilities) {
      if (vuln.fixedCode && vuln.file) {
        fileMap.set(vuln.file, vuln.fixedCode);
      }
    }

    const fixedFiles = Array.from(fileMap.entries()).map(([path, content]) => ({
      path,
      content,
    }));

    const deployUrl = await deployFixedFiles(token, projectName, fixedFiles);

    return NextResponse.json({ deployUrl, fixedFiles: fixedFiles.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Deploy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

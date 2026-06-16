import { NextRequest, NextResponse } from "next/server";
import { createFixPR } from "@/lib/github";
import { getScan } from "@/lib/store";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("gh_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { scanId, owner, repo } = await request.json();

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

    // Build fixed files from vulnerabilities that have fixedCode
    const fixes: { path: string; content: string }[] = [];
    const fileContents = new Map<string, string>();

    // Load original file contents
    for (const file of scan.files) {
      fileContents.set(file.name, file.content);
    }

    // Apply fixes - for files that have fixedCode, use it
    for (const vuln of scan.result.vulnerabilities) {
      if (vuln.fixedCode && vuln.file) {
        const existing = fixes.find((f) => f.path === vuln.file);
        if (!existing) {
          fixes.push({ path: vuln.file, content: vuln.fixedCode });
        }
      }
    }

    if (fixes.length === 0) {
      return NextResponse.json(
        { error: "No auto-fixable vulnerabilities found" },
        { status: 400 }
      );
    }

    const prUrl = await createFixPR(token, owner, repo, fixes);

    return NextResponse.json({ prUrl, fixedFiles: fixes.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create PR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createFixPR } from "@/lib/github";
import { getScan } from "@/lib/store";
import { generateFileFix } from "@/lib/deepseek";
import { validateReplacement } from "@/lib/fix-verify";

export const maxDuration = 60;

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

    // Original file contents keyed by path.
    const fileContents = new Map<string, string>();
    for (const file of scan.files) fileContents.set(file.name, file.content);

    // Group fixable vulnerabilities by file so each file is regenerated ONCE
    // with all of its issues addressed together.
    const byFile = new Map<string, typeof scan.result.vulnerabilities>();
    for (const vuln of scan.result.vulnerabilities) {
      if (!vuln.file || !fileContents.has(vuln.file)) continue;
      const list = byFile.get(vuln.file) || [];
      list.push(vuln);
      byFile.set(vuln.file, list);
    }

    if (byFile.size === 0) {
      return NextResponse.json(
        { error: "No fixable vulnerabilities mapped to known files." },
        { status: 400 }
      );
    }

    const fixes: { path: string; content: string; summary: string }[] = [];
    const skipped: { path: string; reason: string }[] = [];

    // Regenerate + verify each file. We cap concurrency implicitly by awaiting
    // sequentially-ish via Promise.all over a bounded set (<=20 files).
    await Promise.all(
      Array.from(byFile.entries()).map(async ([path, vulns]) => {
        const original = fileContents.get(path)!;
        try {
          const fix = await generateFileFix(
            path,
            original,
            vulns.map((v) => ({
              severity: v.severity,
              type: v.type,
              line: v.line,
              description: v.description,
              fix: v.fix,
            }))
          );

          if (!fix.changed) {
            skipped.push({ path, reason: "Model could not safely fix this file." });
            return;
          }

          // SAFETY GATE — never commit a fix that fails validation.
          const verdict = validateReplacement(original, fix.fixedContent, path);
          if (!verdict.safe) {
            skipped.push({ path, reason: verdict.reason || "Failed safety validation." });
            return;
          }

          // No-op guard: if nothing actually changed, don't add noise.
          const cleaned = fix.fixedContent.trim();
          if (cleaned === original.trim()) {
            skipped.push({ path, reason: "No effective change produced." });
            return;
          }

          fixes.push({ path, content: cleaned, summary: fix.summary });
        } catch (e: unknown) {
          skipped.push({ path, reason: e instanceof Error ? e.message : "Fix generation failed." });
        }
      })
    );

    if (fixes.length === 0) {
      return NextResponse.json(
        {
          error: "No fixes passed safety verification — nothing was changed.",
          skipped,
        },
        { status: 422 }
      );
    }

    const prUrl = await createFixPR(
      token,
      owner,
      repo,
      fixes.map((f) => ({ path: f.path, content: f.content })),
      fixes.map((f) => ({ path: f.path, summary: f.summary }))
    );

    return NextResponse.json({
      prUrl,
      fixedFiles: fixes.length,
      changes: fixes.map((f) => ({ path: f.path, summary: f.summary })),
      skipped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create PR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

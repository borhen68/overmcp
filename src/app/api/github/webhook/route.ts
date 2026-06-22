import { NextRequest, NextResponse, after } from "next/server";
import { getInstallationToken, verifyWebhookSignature, isGitHubAppConfigured } from "@/lib/github-app";
import { getOctokit } from "@/lib/github";
import { runDeepAnalysis } from "@/lib/analyze";
import { buildPlainSummary } from "@/lib/summary";
import { setScan, flushScan } from "@/lib/store";
import { randomUUID } from "crypto";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const COMMENT_MARKER = "<!-- overmcp-scan -->";
const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|rb|go|rs|php|vue|svelte|astro|sql|prisma|graphql|env|ya?ml|json)$/i;
const MAX_FILES = 30;
const MAX_FILE_SIZE = 120_000;

export async function POST(request: NextRequest) {
  // GitHub App not set up yet — acknowledge so GitHub doesn't keep retrying.
  if (!isGitHubAppConfigured()) {
    return NextResponse.json({ ok: true, note: "GitHub App not configured" });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") || "";
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // We act on opened/updated/reopened pull requests.
  if (event === "pull_request") {
    const action = payload.action as string;
    if (!["opened", "synchronize", "reopened", "ready_for_review"].includes(action)) {
      return NextResponse.json({ ok: true, skipped: action });
    }

    const installationId = (payload.installation as { id: number })?.id;
    const repo = payload.repository as { name: string; owner: { login: string }; full_name: string };
    const pr = payload.pull_request as { number: number; head: { sha: string } };
    if (!installationId || !repo || !pr) {
      return NextResponse.json({ ok: true, note: "missing fields" });
    }

    // Heavy work runs in the background so we ack the webhook fast (<10s).
    after(() => scanPullRequest(installationId, repo.owner.login, repo.name, pr.number).catch((e) => {
      console.error("PR scan failed:", e instanceof Error ? e.message : e);
    }));

    return NextResponse.json({ ok: true, scanning: `${repo.full_name}#${pr.number}` });
  }

  // Other events (push, installation, etc.) are acknowledged but not acted on yet.
  return NextResponse.json({ ok: true, event });
}

async function scanPullRequest(installationId: number, owner: string, repo: string, prNumber: number) {
  const token = await getInstallationToken(installationId);
  const octokit = getOctokit(token);

  // 1. List the files changed in the PR.
  const { data: changed } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const scannable = changed
    .filter((f) => f.status !== "removed" && CODE_EXT.test(f.filename))
    .slice(0, MAX_FILES);

  if (scannable.length === 0) {
    await upsertComment(octokit, owner, repo, prNumber,
      `${COMMENT_MARKER}\n🛡️ **OverMCP** — no scannable code changes in this PR.`);
    return;
  }

  // 2. Fetch each changed file's content at the PR head.
  const files: { name: string; content: string }[] = [];
  await Promise.all(
    scannable.map(async (f) => {
      try {
        if ((f as { sha?: string }).sha) {
          const { data: blob } = await octokit.rest.git.getBlob({ owner, repo, file_sha: (f as { sha: string }).sha });
          if (blob.size && blob.size > MAX_FILE_SIZE) return;
          const content = Buffer.from(blob.content, "base64").toString("utf-8");
          files.push({ name: f.filename, content });
        }
      } catch {
        // skip unreadable file
      }
    })
  );

  if (files.length === 0) return;

  // 3. Run the full deep analysis, scoped to just the changed files (fast + relevant).
  const analysis = await runDeepAnalysis(files);

  // 4. Persist as a scan so the comment can link to the full report.
  const scanId = randomUUID();
  setScan(scanId, {
    id: scanId,
    createdAt: new Date().toISOString(),
    status: "done",
    paid: false,
    tier: "free",
    url: `github.com/${owner}/${repo} #${prNumber}`,
    files,
    result: analysis.result,
    ...(analysis.dependencies ? { dependencies: analysis.dependencies } : {}),
    ...(analysis.performance ? { performance: analysis.performance } : {}),
    secrets: analysis.secrets,
    accessibility: analysis.accessibility,
    techStack: analysis.techStack,
  });
  await flushScan(scanId);

  // 5. Build and post/update the PR comment.
  const body = buildComment(analysis, files.length, scanId);
  await upsertComment(octokit, owner, repo, prNumber, body);
}

interface AnalysisLike {
  result: { vulnerabilities: { severity: string; type: string; file: string; line: number; verified?: boolean }[] };
  secrets: { totalLeaks: number; leaks: { type: string; file: string; line: number; severity: string }[] };
  dependencies: { vulnerabilities: { package: string; severity: string }[] } | null;
}

function buildComment(a: AnalysisLike, fileCount: number, scanId: string): string {
  const vulns = a.result.vulnerabilities || [];
  const leaks = a.secrets?.leaks || [];
  const cves = a.dependencies?.vulnerabilities || [];

  const sev = (s: string) => vulns.filter((v) => v.severity === s).length;
  const summary = buildPlainSummary({
    critical: sev("critical"),
    high: sev("high"),
    medium: sev("medium"),
    low: sev("low"),
    secretLeaks: a.secrets?.totalLeaks || 0,
    totalCVEs: cves.length,
  });

  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://overmcp.com"}/report/${scanId}`;
  const total = vulns.length + leaks.length + cves.length;

  if (total === 0) {
    return [
      COMMENT_MARKER,
      `## 🛡️ OverMCP — no security issues found`,
      ``,
      `Scanned **${fileCount}** changed file${fileCount > 1 ? "s" : ""} in this PR. Nothing dangerous detected. ✅`,
      ``,
      `<sub>Automated by [OverMCP](${reportUrl}) — secure your vibe-coded app.</sub>`,
    ].join("\n");
  }

  const lines: string[] = [
    COMMENT_MARKER,
    `## 🛡️ OverMCP found ${total} issue${total > 1 ? "s" : ""} in this PR`,
    ``,
    `> ${summary.headline}`,
    ``,
    `**Score: ${summary.score}/100** · scanned ${fileCount} changed file${fileCount > 1 ? "s" : ""}`,
    ``,
  ];

  if (leaks.length > 0) {
    lines.push(`### 🔑 Exposed secrets (fix immediately)`);
    for (const l of leaks.slice(0, 8)) {
      lines.push(`- **${l.type}** — \`${l.file}:${l.line}\``);
    }
    lines.push(``);
  }

  if (vulns.length > 0) {
    lines.push(`### Vulnerabilities`);
    const ranked = [...vulns].sort((x, y) => sevRank(x.severity) - sevRank(y.severity)).slice(0, 12);
    for (const v of ranked) {
      const badge = v.severity.toUpperCase();
      const check = v.verified ? " ✓verified" : "";
      lines.push(`- **[${badge}]** ${v.type} — \`${v.file}:${v.line}\`${check}`);
    }
    if (vulns.length > 12) lines.push(`- _…and ${vulns.length - 12} more_`);
    lines.push(``);
  }

  if (cves.length > 0) {
    lines.push(`### 📦 Vulnerable dependencies`);
    for (const c of cves.slice(0, 6)) lines.push(`- **${c.package}** (${c.severity})`);
    lines.push(``);
  }

  lines.push(`👉 **[View the full report & one-click fixes →](${reportUrl})**`);
  lines.push(``);
  lines.push(`<sub>Automated by [OverMCP](${process.env.NEXT_PUBLIC_APP_URL || "https://overmcp.com"}). We only comment — we never push to your branch or merge.</sub>`);
  return lines.join("\n");
}

function sevRank(s: string): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 4;
}

// Update our existing comment if present (avoids spamming a new comment on
// every push), otherwise create one.
async function upsertComment(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
) {
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });
    const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));
    if (existing) {
      await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      return;
    }
  } catch {
    // fall through to create
  }
  await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
}

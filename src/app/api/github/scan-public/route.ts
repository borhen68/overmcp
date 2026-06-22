import { NextRequest, NextResponse, after } from "next/server";
import { runDeepAnalysis } from "@/lib/analyze";
import { riskScore } from "@/lib/github";
import { setScan, updateScan, flushScan } from "@/lib/store";
import { randomUUID } from "crypto";
import axios from "axios";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CODE_EXTENSIONS = [
  ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".vue",
  ".svelte", ".php", ".rb", ".go", ".rs", ".json", ".yaml", ".yml",
  ".env", ".sql", ".prisma", ".graphql", ".mjs", ".cjs", ".astro",
];

const IGNORE_PATHS = [
  "node_modules", ".next", "dist", "build", ".git/",
  "vendor", "__pycache__", ".vercel", "coverage", "package-lock",
  "/test/", "/tests/", ".test.", ".spec.", "__tests__", "/public/",
];

// Match the authenticated scan's depth — the no-login path should be just as
// powerful so anyone can get a real audit without connecting GitHub.
const MAX_FILES = 45;
const MAX_FILE_SIZE = 120_000;

interface TreeItem {
  path: string;
  type: string;
  size?: number;
}

async function fetchPublicRepoFiles(owner: string, repo: string) {
  const ghHeaders: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  // An unauthenticated token is optional but lifts rate limits if present.
  if (process.env.GITHUB_PUBLIC_TOKEN) ghHeaders.Authorization = `Bearer ${process.env.GITHUB_PUBLIC_TOKEN}`;

  // 1. Resolve default branch (needed for raw.githubusercontent.com URLs).
  const { data: repoMeta } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: ghHeaders, timeout: 10000 }
  );
  const branch: string = repoMeta.default_branch || "HEAD";

  // 2. One recursive tree call lists the whole repo.
  const { data: treeData } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: ghHeaders, timeout: 15000 }
  );

  const tree = (treeData.tree as TreeItem[]) || [];

  // 3. Filter to scannable code, then rank by risk (api/auth/db/payments first).
  const prioritized = tree
    .filter((item) => {
      if (item.type !== "blob" || !item.path) return false;
      if ((item.size || 0) > MAX_FILE_SIZE) return false;
      if (IGNORE_PATHS.some((p) => item.path.includes(p))) return false;
      const ext = "." + (item.path.split(".").pop()?.toLowerCase() || "");
      const isEnv = /(^|\/)\.env/.test(item.path.toLowerCase());
      return CODE_EXTENSIONS.includes(ext) || isEnv;
    })
    .sort((a, b) => riskScore(b.path) - riskScore(a.path))
    .slice(0, MAX_FILES);

  // 4. Fetch contents via raw.githubusercontent.com — NOT the API — so we
  //    don't burn the 60/hour unauthenticated API rate limit on file reads.
  const files: { name: string; content: string }[] = [];
  const batchSize = 12;
  for (let i = 0; i < prioritized.length; i += batchSize) {
    const batch = prioritized.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const { data } = await axios.get(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
          { timeout: 10000, responseType: "text", maxContentLength: MAX_FILE_SIZE, transformResponse: (r) => r }
        );
        const content = typeof data === "string" ? data : String(data);
        return { name: file.path, content };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.content) files.push(r.value);
    }
  }

  return files;
}

export async function POST(request: NextRequest) {
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
        updateScan(scanId, { progress: "Reading the repository…" });
        const files = await fetchPublicRepoFiles(owner, repo);

        if (files.length === 0) {
          updateScan(scanId, {
            status: "error",
            error: "No scannable files found. Is the repo public?",
          });
          return;
        }

        updateScan(scanId, {
          files,
          progress: `Found ${files.length} files — prioritizing high-risk code…`,
        });

        const a = await runDeepAnalysis(files, "unknown", (m) =>
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
        const isNotFound = message.includes("404") || message.includes("Not Found");
        updateScan(scanId, {
          status: "error",
          error: isNotFound
            ? "Repository not found. Make sure it's public and the URL is correct."
            : message,
        });
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

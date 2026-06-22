import { Octokit } from "octokit";

export interface RepoFile {
  name: string;
  path: string;
  content: string;
}

export function getOctokit(accessToken: string) {
  return new Octokit({
    auth: accessToken,
    request: {
      // Hard 20s timeout so GitHub API calls can't hang a request.
      fetch: (url: string | URL | Request, options?: RequestInit) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(20_000) }),
    },
  });
}

const CODE_EXTENSIONS = [
  ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".vue",
  ".svelte", ".php", ".rb", ".go", ".rs", ".json", ".yaml", ".yml",
  ".env", ".sql", ".prisma", ".graphql", ".mjs", ".cjs", ".astro",
];

const IGNORE_PATHS = [
  "node_modules", ".next", "dist", "build", ".git/",
  "vendor", "__pycache__", ".vercel", "coverage", "/test/", "/tests/",
  ".test.", ".spec.", "__tests__", "/public/", "/.storybook/",
];

// How many files we pull for analysis. The OLD limit was 20 — far too shallow
// for a real app. We now fetch many more, but PRIORITIZED so the highest-risk
// server code is always included even if we hit the cap.
const MAX_FILES = 60;
const MAX_FILE_SIZE = 120_000;

// Risk score for a path — higher = scan sooner. This is what makes the deep
// scan actually find the dangerous stuff: API routes, auth, DB, payments and
// secrets get pulled first; styling/markup last.
export function riskScore(path: string): number {
  const p = path.toLowerCase();
  let score = 0;
  // Secrets / config — almost always where leaks live.
  if (/(^|\/)\.env/.test(p)) score += 100;
  if (/(^|\/)(package\.json|requirements\.txt|pyproject\.toml|gemfile)$/.test(p)) score += 40;
  if (/(config|settings|secrets?)\./.test(p)) score += 25;
  // Server-side attack surface.
  if (/\/api\//.test(p) || /\/route\.[tj]sx?$/.test(p)) score += 60;
  if (/(auth|login|signup|session|jwt|token|password|oauth)/.test(p)) score += 55;
  if (/(middleware|guard|permission|role|authoriz)/.test(p)) score += 45;
  if (/(payment|stripe|billing|checkout|webhook|invoice)/.test(p)) score += 50;
  if (/(\bdb\b|database|prisma|drizzle|mongoose|sql|query|repository|model)/.test(p)) score += 40;
  if (/(upload|file|storage|s3|bucket)/.test(p)) score += 30;
  if (/(admin|dashboard|account|user)/.test(p)) score += 25;
  if (/(server|action|controller|service|handler|lib\/|utils?\/)/.test(p)) score += 20;
  // Source code generally beats markup/styles.
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|rs|php)$/.test(p)) score += 12;
  if (/\.(sql|prisma|graphql)$/.test(p)) score += 18;
  if (/\.(json|ya?ml)$/.test(p)) score += 6;
  if (/\.(html|css)$/.test(p)) score += 2;
  // Shallower paths tend to be more important entry points.
  score += Math.max(0, 6 - p.split("/").length);
  return score;
}

export async function fetchRepoFiles(
  accessToken: string,
  owner: string,
  repo: string
): Promise<RepoFile[]> {
  const octokit = getOctokit(accessToken);

  // 1. Resolve default branch.
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // 2. One recursive tree call lists the WHOLE repo (vs. walking dir by dir).
  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: "true",
  });

  // 3. Filter to scannable code blobs, then rank by risk.
  const candidates = (tree.tree || [])
    .filter((item) => item.type === "blob" && item.path)
    .filter((item) => {
      const path = item.path!;
      if (IGNORE_PATHS.some((p) => path.includes(p))) return false;
      const ext = "." + (path.split(".").pop()?.toLowerCase() || "");
      const isEnv = /(^|\/)\.env/.test(path.toLowerCase());
      if (!CODE_EXTENSIONS.includes(ext) && !isEnv) return false;
      if ((item.size || 0) > MAX_FILE_SIZE) return false;
      return true;
    })
    .sort((a, b) => riskScore(b.path!) - riskScore(a.path!))
    .slice(0, MAX_FILES);

  // 4. Fetch blob contents in bounded batches.
  const files: RepoFile[] = [];
  const batchSize = 12;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const { data: blob } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: item.sha!,
        });
        const content = Buffer.from(blob.content, "base64").toString("utf-8");
        const name = item.path!.split("/").pop() || item.path!;
        return { name, path: item.path!, content } as RepoFile;
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") files.push(r.value);
    }
  }

  return files;
}

export async function createFixPR(
  accessToken: string,
  owner: string,
  repo: string,
  fixes: { path: string; content: string }[],
  summaries: { path: string; summary: string }[] = []
): Promise<string> {
  const octokit = getOctokit(accessToken);

  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = ref.object.sha;

  const branchName = `overmcp/fixes-${Date.now()}`;
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseSha,
  });

  for (const fix of fixes) {
    let existingSha: string | undefined;
    try {
      const { data: existing } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: fix.path,
        ref: branchName,
      });
      if ("sha" in existing) existingSha = existing.sha;
    } catch {
      // file doesn't exist yet
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fix.path,
      message: `fix: security patch for ${fix.path}`,
      content: Buffer.from(fix.content).toString("base64"),
      branch: branchName,
      ...(existingSha ? { sha: existingSha } : {}),
    });
  }

  const summaryFor = (path: string) =>
    summaries.find((s) => s.path === path)?.summary || "Security fix applied.";

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: "🛡️ OverMCP: Verified security fixes",
    body: `## Security fixes applied by OverMCP

This PR was generated by [OverMCP](${process.env.NEXT_PUBLIC_APP_URL}) to fix security vulnerabilities in your codebase.

Each changed file was **regenerated in full** (not patched with a snippet) and passed automated safety checks — structure preserved, brackets balanced, no truncation — before being included here.

### Files changed
${fixes.map((f) => `- \`${f.path}\` — ${summaryFor(f.path)}`).join("\n")}

> ⚠️ **Review before merging.** These fixes are automated. Read the diff and run your tests/build to confirm everything still works for your app.

---
*Automated by OverMCP — Secure your vibe-coded apps*`,
    head: branchName,
    base: defaultBranch,
  });

  return pr.html_url;
}

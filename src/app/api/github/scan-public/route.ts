import { NextRequest, NextResponse } from "next/server";
import { analyzeMultipleFiles } from "@/lib/deepseek";
import { setScan, updateScan } from "@/lib/store";
import { randomUUID } from "crypto";
import axios from "axios";

const CODE_EXTENSIONS = [
  ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".vue",
  ".svelte", ".php", ".rb", ".go", ".rs", ".json", ".yaml", ".yml",
  ".env", ".sql", ".prisma", ".graphql", ".mjs", ".cjs",
];

const IGNORE_PATHS = [
  "node_modules", ".next", "dist", "build", ".git",
  "vendor", "__pycache__", ".vercel", "coverage", "package-lock",
];

interface TreeItem {
  path: string;
  type: string;
  size?: number;
  url?: string;
}

async function fetchPublicRepoFiles(owner: string, repo: string) {
  // Get the full file tree
  const { data } = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );

  const files: { name: string; content: string }[] = [];
  const tree = (data.tree as TreeItem[]) || [];

  // Filter to code files
  const codeFiles = tree.filter((item) => {
    if (item.type !== "blob") return false;
    if ((item.size || 0) > 100000) return false;
    if (IGNORE_PATHS.some((p) => item.path.includes(p))) return false;
    const ext = "." + (item.path.split(".").pop()?.toLowerCase() || "");
    return CODE_EXTENSIONS.includes(ext);
  });

  // Take top 20 most relevant files (prioritize src/, app/, pages/, components/)
  const prioritized = codeFiles.sort((a, b) => {
    const priority = (path: string) => {
      if (path.includes("src/") || path.includes("app/")) return 0;
      if (path.includes("pages/") || path.includes("components/")) return 1;
      if (path.includes("lib/") || path.includes("utils/")) return 2;
      return 3;
    };
    return priority(a.path) - priority(b.path);
  }).slice(0, 20);

  // Fetch file contents
  for (const file of prioritized) {
    try {
      const { data: fileData } = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        { headers: { Accept: "application/vnd.github.v3+json" } }
      );
      if (fileData.content) {
        const content = Buffer.from(fileData.content, "base64").toString("utf-8");
        files.push({ name: file.path, content });
      }
    } catch {
      // skip files we can't read
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

    // Run in background
    (async () => {
      try {
        const files = await fetchPublicRepoFiles(owner, repo);

        if (files.length === 0) {
          updateScan(scanId, {
            status: "error",
            error: "No scannable files found. Is the repo public?",
          });
          return;
        }

        updateScan(scanId, { files });

        const result = await analyzeMultipleFiles(files);
        updateScan(scanId, { status: "done", result });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Scan failed";
        const isNotFound = message.includes("404") || message.includes("Not Found");
        updateScan(scanId, {
          status: "error",
          error: isNotFound
            ? "Repository not found. Make sure it's public and the URL is correct."
            : message,
        });
      }
    })();

    return NextResponse.json({ scanId, status: "scanning" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

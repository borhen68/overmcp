import http from "./http";

const VERCEL_API = "https://api.vercel.com";

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: {
    type: string;
    repo: string;
    org: string;
  };
  latestDeployments?: { id: string; url: string; readyState: string }[];
}

export interface VercelFile {
  name: string;
  path: string;
  content: string;
}

export async function listVercelProjects(token: string): Promise<VercelProject[]> {
  const { data } = await http.get(`${VERCEL_API}/v9/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.projects.map((p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    framework: p.framework || null,
    link: p.link || undefined,
  }));
}

export async function getLatestDeployment(
  token: string,
  projectId: string
): Promise<string | null> {
  const { data } = await http.get(
    `${VERCEL_API}/v6/deployments?projectId=${projectId}&limit=1&state=READY`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (data.deployments && data.deployments.length > 0) {
    return data.deployments[0].uid;
  }
  return null;
}

export async function getDeploymentFiles(
  token: string,
  deploymentId: string
): Promise<VercelFile[]> {
  const { data } = await http.get(
    `${VERCEL_API}/v6/deployments/${deploymentId}/files`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const files: VercelFile[] = [];
  const CODE_EXTENSIONS = [
    ".js", ".ts", ".tsx", ".jsx", ".py", ".html", ".css", ".vue",
    ".svelte", ".php", ".json", ".yaml", ".yml", ".env", ".sql",
    ".prisma", ".graphql", ".mjs", ".cjs",
  ];

  const IGNORE_PATHS = [
    "node_modules", ".next", ".vercel", "dist", "build",
    ".git", "__pycache__", "coverage", ".cache",
  ];

  async function traverseFiles(items: Record<string, unknown>[], basePath: string) {
    for (const item of items) {
      if (files.length >= 20) break;

      const name = item.name as string;
      const fullPath = basePath ? `${basePath}/${name}` : name;

      if (IGNORE_PATHS.some((p) => fullPath.includes(p))) continue;

      if (item.type === "directory") {
        const children = item.children as Record<string, unknown>[] | undefined;
        if (children) {
          await traverseFiles(children, fullPath);
        }
      } else if (item.type === "file") {
        const ext = "." + (name.split(".").pop()?.toLowerCase() || "");
        if (!CODE_EXTENSIONS.includes(ext)) continue;

        try {
          const { data: fileData } = await http.get(
            `${VERCEL_API}/v7/deployments/${deploymentId}/files/${item.uid}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (typeof fileData === "string" && fileData.length <= 100000) {
            files.push({ name, path: fullPath, content: fileData });
          }
        } catch {
          // skip files we can't read
        }
      }
    }
  }

  await traverseFiles(data as Record<string, unknown>[], "");
  return files;
}

export async function deployFixedFiles(
  token: string,
  projectName: string,
  files: { path: string; content: string }[]
): Promise<string> {
  const filePayload = files.map((f) => ({
    file: f.path,
    data: f.content,
  }));

  const { data } = await http.post(
    `${VERCEL_API}/v13/deployments`,
    {
      name: projectName,
      files: filePayload,
      projectSettings: {
        framework: null,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return `https://${data.url}`;
}

export async function redeployFromGit(
  token: string,
  deploymentId: string
): Promise<string> {
  const { data } = await http.post(
    `${VERCEL_API}/v13/deployments`,
    {
      deploymentId,
      meta: { overmcp: "fixed" },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return `https://${data.url}`;
}

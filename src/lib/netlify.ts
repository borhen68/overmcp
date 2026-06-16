import http from "./http";

const NETLIFY_API = "https://api.netlify.com/api/v1";

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  build_settings?: {
    repo_url?: string;
  };
  published_deploy?: {
    id: string;
  };
}

export async function listNetlifySites(token: string): Promise<NetlifySite[]> {
  const { data } = await http.get(`${NETLIFY_API}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return data.map((s: Record<string, unknown>) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    ssl_url: s.ssl_url,
    build_settings: s.build_settings,
    published_deploy: s.published_deploy,
  }));
}

export async function getDeployFiles(
  token: string,
  deployId: string
): Promise<{ name: string; path: string; id: string; size: number }[]> {
  const { data } = await http.get(
    `${NETLIFY_API}/deploys/${deployId}/files`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const CODE_EXTENSIONS = [
    ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".json",
    ".mjs", ".cjs", ".vue", ".svelte",
  ];

  const IGNORE = ["node_modules", ".next", "dist", "_next/static/chunks/webpack"];

  return (data as Record<string, unknown>[])
    .filter((f) => {
      const path = f.path as string;
      if (IGNORE.some((p) => path.includes(p))) return false;
      const ext = "." + (path.split(".").pop()?.toLowerCase() || "");
      return CODE_EXTENSIONS.includes(ext) && (f.size as number) < 100000;
    })
    .slice(0, 20)
    .map((f) => ({
      name: (f.path as string).split("/").pop() || "",
      path: f.path as string,
      id: f.id as string,
      size: f.size as number,
    }));
}

export async function getFileContent(
  token: string,
  siteId: string,
  filePath: string
): Promise<string> {
  const { data } = await http.get(
    `${NETLIFY_API}/sites/${siteId}/files${filePath}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "text",
    }
  );
  return data;
}

export async function deployToNetlify(
  token: string,
  siteId: string,
  files: { path: string; content: string }[]
): Promise<string> {
  // Create a deploy with file digests
  const crypto = require("crypto");
  const fileDigests: Record<string, string> = {};

  for (const file of files) {
    const sha1 = crypto.createHash("sha1").update(file.content).digest("hex");
    fileDigests[file.path] = sha1;
  }

  const { data: deploy } = await http.post(
    `${NETLIFY_API}/sites/${siteId}/deploys`,
    { files: fileDigests },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Upload required files
  const required = deploy.required || [];
  for (const file of files) {
    const sha1 = crypto.createHash("sha1").update(file.content).digest("hex");
    if (required.includes(sha1)) {
      await http.put(
        `${NETLIFY_API}/deploys/${deploy.id}/files${file.path}`,
        file.content,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/octet-stream",
          },
        }
      );
    }
  }

  return deploy.ssl_url || deploy.url || `https://${deploy.subdomain}.netlify.app`;
}

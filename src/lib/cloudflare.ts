import http from "./http";

const CF_API = "https://api.cloudflare.com/client/v4";

export interface CFProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  production_branch: string;
}

export async function listCFPagesProjects(
  accountId: string,
  apiToken: string
): Promise<CFProject[]> {
  const { data } = await http.get(
    `${CF_API}/accounts/${accountId}/pages/projects`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );

  return (data.result || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    subdomain: p.subdomain,
    domains: p.domains || [],
    production_branch: (p.production_branch as string) || "main",
  }));
}

export async function getLatestCFDeployment(
  accountId: string,
  projectName: string,
  apiToken: string
): Promise<string | null> {
  const { data } = await http.get(
    `${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );

  const deployments = data.result || [];
  if (deployments.length === 0) return null;
  return deployments[0].id;
}

export async function deployCFPages(
  accountId: string,
  projectName: string,
  apiToken: string,
  files: { path: string; content: string }[]
): Promise<string> {
  // Cloudflare Pages Direct Upload
  const FormData = (await import("form-data")).default;
  const form = new FormData();

  for (const file of files) {
    form.append(file.path, Buffer.from(file.content), {
      filename: file.path,
      contentType: "application/octet-stream",
    });
  }

  const { data } = await http.post(
    `${CF_API}/accounts/${accountId}/pages/projects/${projectName}/deployments`,
    form,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        ...form.getHeaders(),
      },
    }
  );

  return data.result?.url || `https://${projectName}.pages.dev`;
}

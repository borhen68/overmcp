import axios from "axios";

export interface CVEResult {
  totalDependencies: number;
  vulnerableDependencies: number;
  vulnerabilities: {
    package: string;
    version: string;
    severity: "critical" | "high" | "medium" | "low";
    cve: string;
    title: string;
    fixedIn?: string;
    url?: string;
  }[];
  outdated: {
    package: string;
    current: string;
    latest: string;
    behind: string;
  }[];
  riskScore: number;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function scanDependencies(
  files: { name: string; content: string }[]
): Promise<CVEResult | null> {
  // Find package.json
  const pkgFile = files.find(
    (f) => f.name === "package.json" || f.name.endsWith("/package.json")
  );

  let allDeps: Record<string, string> = {};

  if (pkgFile) {
    try {
      const pkg: PackageJson = JSON.parse(pkgFile.content);
      allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
    } catch {
      // invalid JSON, try import detection
    }
  }

  // If no package.json, detect deps from import statements in JS/TS files
  if (Object.keys(allDeps).length === 0) {
    const importRegex = /(?:import|require)\s*\(?['"]([^./][^'"]*)['"]\)?/g;
    const detectedPackages = new Set<string>();

    for (const file of files) {
      if (!file.name.match(/\.(js|ts|tsx|jsx|mjs)$/)) continue;
      const matches = file.content.matchAll(importRegex);
      for (const match of matches) {
        let pkg = match[1];
        // Handle scoped packages: @scope/name
        if (pkg.startsWith("@")) {
          const parts = pkg.split("/");
          pkg = parts.slice(0, 2).join("/");
        } else {
          pkg = pkg.split("/")[0];
        }
        // Skip Node.js builtins
        const builtins = ["fs", "path", "crypto", "http", "https", "url", "os", "child_process", "stream", "util", "events", "buffer", "querystring", "net", "tls", "dns"];
        if (!builtins.includes(pkg)) {
          detectedPackages.add(pkg);
        }
      }
    }

    if (detectedPackages.size === 0) return null;

    for (const pkg of detectedPackages) {
      allDeps[pkg] = "latest";
    }
  }

  const depNames = Object.keys(allDeps);
  if (depNames.length === 0) return null;

  const vulnerabilities: CVEResult["vulnerabilities"] = [];
  const outdated: CVEResult["outdated"] = [];

  // Check each dependency against the OSV.dev API (free, no key needed)
  const batchSize = 10;
  for (let i = 0; i < depNames.length; i += batchSize) {
    const batch = depNames.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (name) => {
        const rawVersion = allDeps[name].replace(/[\^~>=<]/g, "").split(" ")[0];

        // Get actual version from registry if we only have "latest"
        let version = rawVersion;
        if (version === "latest" || version === "*") {
          try {
            const { data: reg } = await axios.get(`https://registry.npmjs.org/${name}/latest`, { timeout: 5000 });
            version = reg.version;
          } catch {
            return; // can't determine version, skip
          }
        }

        try {
          // Check for vulnerabilities via OSV.dev
          const { data } = await axios.post(
            "https://api.osv.dev/v1/query",
            {
              package: { name, ecosystem: "npm" },
              version,
            },
            { timeout: 5000 }
          );

          if (data.vulns && data.vulns.length > 0) {
            for (const vuln of data.vulns.slice(0, 3)) {
              const severity = getSeverity(vuln);
              vulnerabilities.push({
                package: name,
                version,
                severity,
                cve: vuln.aliases?.[0] || vuln.id,
                title: vuln.summary || vuln.details?.slice(0, 100) || "Known vulnerability",
                fixedIn: getFixedVersion(vuln),
                url: `https://osv.dev/vulnerability/${vuln.id}`,
              });
            }
          }
        } catch {
          // skip failed lookups
        }

        // Check for outdated packages via registry (skip if version is unknown)
        if (rawVersion !== "latest" && rawVersion !== "*") {
          try {
            const { data: registryData } = await axios.get(
              `https://registry.npmjs.org/${name}/latest`,
              { timeout: 5000 }
            );

            const latestVersion = registryData.version;
            if (latestVersion && latestVersion !== version) {
              const currentParts = version.split(".").map(Number);
              const latestParts = latestVersion.split(".").map(Number);

              if (latestParts[0] > currentParts[0]) {
                outdated.push({
                  package: name,
                  current: version,
                  latest: latestVersion,
                  behind: `${latestParts[0] - currentParts[0]} major version(s)`,
                });
              }
            }
          } catch {
            // skip
          }
        }
      })
    );
  }

  // Calculate risk score
  const criticals = vulnerabilities.filter((v) => v.severity === "critical").length;
  const highs = vulnerabilities.filter((v) => v.severity === "high").length;
  const mediums = vulnerabilities.filter((v) => v.severity === "medium").length;
  const riskScore = Math.max(0, 100 - criticals * 25 - highs * 15 - mediums * 5 - outdated.length * 2);

  return {
    totalDependencies: depNames.length,
    vulnerableDependencies: new Set(vulnerabilities.map((v) => v.package)).size,
    vulnerabilities: vulnerabilities.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    }),
    outdated: outdated.slice(0, 10),
    riskScore,
  };
}

function getSeverity(vuln: Record<string, unknown>): "critical" | "high" | "medium" | "low" {
  const severity = (vuln.database_specific as Record<string, unknown>)?.severity as string;
  if (severity) {
    const s = severity.toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high") return "high";
    if (s === "medium" || s === "moderate") return "medium";
    return "low";
  }
  return "medium";
}

function getFixedVersion(vuln: Record<string, unknown>): string | undefined {
  const affected = vuln.affected as Record<string, unknown>[] | undefined;
  if (!affected || affected.length === 0) return undefined;
  const ranges = affected[0].ranges as Record<string, unknown>[] | undefined;
  if (!ranges || ranges.length === 0) return undefined;
  const events = ranges[0].events as Record<string, string>[] | undefined;
  if (!events) return undefined;
  const fixed = events.find((e) => e.fixed);
  return fixed?.fixed;
}

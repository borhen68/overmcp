// Shared "deep analysis" pipeline used by every source-code scan path
// (authenticated repo scan, public repo scan). Keeping it in one place means
// the no-login public scan is exactly as powerful as the authenticated one.
import { analyzeFilesInChunks, verifyVulnerabilities, VulnerabilityResult } from "./deepseek";
import { scanDependencies, CVEResult } from "./dependencies";
import { scanSecrets, SecretsResult } from "./secrets";
import { analyzeAccessibility, AccessibilityResult } from "./accessibility";
import { analyzePerformance, PerformanceResult } from "./performance";
import { detectTechStack, TechStackResult } from "./techstack";

export interface DeepAnalysis {
  result: VulnerabilityResult;
  dependencies: CVEResult | null;
  performance: PerformanceResult | null;
  secrets: SecretsResult;
  accessibility: AccessibilityResult;
  techStack: TechStackResult;
}

export async function runDeepAnalysis(
  files: { name: string; content: string }[],
  platform = "unknown",
  onProgress?: (message: string) => void
): Promise<DeepAnalysis> {
  const report = (m: string) => { try { onProgress?.(m); } catch { /* progress is best-effort */ } };

  // Instant local analyzers first (no API cost) so users see findings fast.
  const secrets = scanSecrets(files);
  const accessibility = analyzeAccessibility(files);
  const techStack = detectTechStack(files, platform);

  report(`Auditing ${files.length} file${files.length > 1 ? "s" : ""} for vulnerabilities…`);

  // AI audit (chunked) + CVE + performance run in parallel.
  const [rawResult, dependencies, performance] = await Promise.all([
    analyzeFilesInChunks(files),
    scanDependencies(files).catch(() => null),
    analyzePerformance(files).catch(() => null),
  ]);

  // Second-pass adversarial verification drops unprovable findings.
  const found = rawResult.vulnerabilities?.length || 0;
  report(found > 0 ? `Verifying ${found} finding${found > 1 ? "s" : ""} to remove false positives…` : "Finalizing report…");
  const result = await verifyVulnerabilities(files, rawResult).catch(() => rawResult);

  return { result, dependencies, performance, secrets, accessibility, techStack };
}

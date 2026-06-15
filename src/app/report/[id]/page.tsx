"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface ScanData {
  id: string;
  status: "scanning" | "done" | "error";
  paid: boolean;
  summary?: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    seoScore: number;
  };
  preview?: {
    severity: string;
    type: string;
    file: string;
    description: string;
  }[];
  totalVulnerabilities?: number;
  totalSeoIssues?: number;
  totalImprovements?: number;
  result?: {
    summary: {
      totalIssues: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      seoScore: number;
    };
    vulnerabilities: {
      severity: string;
      type: string;
      file: string;
      line?: number;
      description: string;
      fix: string;
      fixedCode?: string;
    }[];
    seoIssues: {
      issue: string;
      recommendation: string;
      impact: string;
    }[];
    improvements: {
      category: string;
      suggestion: string;
      priority: string;
    }[];
  };
  error?: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const justPaid = searchParams.get("paid") === "true";

  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const res = await fetch(`/api/scan/${id}`);
        const json = await res.json();
        setData(json);

        if (json.status === "scanning") {
          setTimeout(fetchScan, 2000);
        }
      } catch {
        setData({
          id,
          status: "error",
          paid: false,
          error: "Failed to fetch scan",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
  }, [id, justPaid]);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id }),
      });
      const json = await res.json();
      if (json.invoiceUrl) {
        window.location.href = json.invoiceUrl;
      }
    } catch {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "scanning") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="animate-pulse text-6xl mb-6">🔍</div>
          <h2 className="text-2xl font-bold mb-3">Scanning your code...</h2>
          <p className="text-gray-400">
            Our AI is analyzing your files for vulnerabilities, security issues,
            and SEO improvements. This usually takes 15-30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold mb-3">Scan Failed</h2>
          <p className="text-red-400">{data.error}</p>
        </div>
      </div>
    );
  }

  const summary = data.result?.summary || data.summary;

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
          >
            VibeSecure
          </a>
          <span className="text-sm text-gray-400">Scan Report</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400">
                {summary.critical}
              </p>
              <p className="text-sm text-gray-400">Critical</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-orange-400">
                {summary.high}
              </p>
              <p className="text-sm text-gray-400">High</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">
                {summary.medium}
              </p>
              <p className="text-sm text-gray-400">Medium</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">
                {summary.low}
              </p>
              <p className="text-sm text-gray-400">Low</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">
                {summary.seoScore}/100
              </p>
              <p className="text-sm text-gray-400">SEO Score</p>
            </div>
          </div>
        )}

        {/* Paywall or full report */}
        {!data.paid ? (
          <div className="text-center py-12">
            {/* Teaser */}
            {data.preview && data.preview.length > 0 && (
              <div className="mb-8 max-w-xl mx-auto">
                <p className="text-sm text-gray-400 mb-3">Preview (1 of {data.totalVulnerabilities} issues):</p>
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-left">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mb-2 ${
                      severityColors[data.preview[0].severity]
                    }`}
                  >
                    {data.preview[0].severity.toUpperCase()}
                  </span>
                  <p className="font-medium">{data.preview[0].type}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {data.preview[0].description}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-8 max-w-lg mx-auto">
              <h3 className="text-2xl font-bold mb-3">Unlock Full Report</h3>
              <p className="text-gray-400 mb-6">
                Get detailed fixes for all {data.totalVulnerabilities}{" "}
                vulnerabilities, {data.totalSeoIssues} SEO issues, and{" "}
                {data.totalImprovements} improvements with copy-paste code.
              </p>
              <ul className="text-left text-sm text-gray-300 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Fixed code for every vulnerability
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> SEO recommendations with examples
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Performance & accessibility tips
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Pay with any cryptocurrency
                </li>
              </ul>
              <button
                onClick={handlePayment}
                disabled={paying}
                className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {paying ? "Redirecting..." : "Unlock for $9 — Pay with Crypto"}
              </button>
            </div>
          </div>
        ) : (
          /* Full report */
          <div className="space-y-12">
            {/* Vulnerabilities */}
            {data.result?.vulnerabilities &&
              data.result.vulnerabilities.length > 0 && (
                <section>
                  <h3 className="text-2xl font-bold mb-6">
                    🛡️ Security Vulnerabilities
                  </h3>
                  <div className="space-y-4">
                    {data.result.vulnerabilities.map((vuln, i) => (
                      <div
                        key={i}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium border mr-2 ${
                                severityColors[vuln.severity]
                              }`}
                            >
                              {vuln.severity.toUpperCase()}
                            </span>
                            <span className="font-semibold">{vuln.type}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {vuln.file}
                            {vuln.line ? `:${vuln.line}` : ""}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{vuln.description}</p>
                        <div className="bg-gray-800 rounded-lg p-4 mb-3">
                          <p className="text-sm font-medium text-green-400 mb-1">
                            Fix:
                          </p>
                          <p className="text-sm text-gray-300">{vuln.fix}</p>
                        </div>
                        {vuln.fixedCode && (
                          <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto">
                            <p className="text-xs text-gray-500 mb-2">
                              Fixed code:
                            </p>
                            <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">
                              {vuln.fixedCode}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {/* SEO Issues */}
            {data.result?.seoIssues && data.result.seoIssues.length > 0 && (
              <section>
                <h3 className="text-2xl font-bold mb-6">📈 SEO Issues</h3>
                <div className="space-y-3">
                  {data.result.seoIssues.map((issue, i) => (
                    <div
                      key={i}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium border ${
                            severityColors[issue.impact] || severityColors.medium
                          }`}
                        >
                          {issue.impact.toUpperCase()}
                        </span>
                        <span className="font-medium">{issue.issue}</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {issue.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Improvements */}
            {data.result?.improvements &&
              data.result.improvements.length > 0 && (
                <section>
                  <h3 className="text-2xl font-bold mb-6">
                    🔧 Code Improvements
                  </h3>
                  <div className="space-y-3">
                    {data.result.improvements.map((imp, i) => (
                      <div
                        key={i}
                        className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                            {imp.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${
                              severityColors[imp.priority] ||
                              severityColors.medium
                            }`}
                          >
                            {imp.priority}
                          </span>
                        </div>
                        <p className="text-gray-300">{imp.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
          </div>
        )}
      </main>
    </div>
  );
}

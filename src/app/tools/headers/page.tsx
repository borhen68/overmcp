"use client";

import Link from "next/link";
import { useState } from "react";

interface HeaderResult {
  name: string;
  present: boolean;
  value?: string;
}

interface ScanResult {
  headers: HeaderResult[];
  grade: string;
  url: string;
}

function getGradeColor(grade: string) {
  if (grade === "A") return "text-green-400";
  if (grade === "B") return "text-lime-400";
  if (grade === "C") return "text-yellow-400";
  if (grade === "D") return "text-orange-400";
  return "text-red-400";
}

export default function HeadersCheckerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tools/headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to check headers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gradient">OverMCP</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">Scan</Link>
            <Link href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Security <span className="text-gradient">Headers</span> Checker
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Check any website for missing HTTP security headers. Get a letter grade instantly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 mb-8">
          <label htmlFor="url-input" className="block text-sm font-medium text-gray-300 mb-2">
            Website URL
          </label>
          <div className="flex gap-3">
            <input
              id="url-input"
              type="url"
              required
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking..." : "Check"}
            </button>
          </div>
        </form>

        {error && (
          <div className="card p-4 border-red-500/30 bg-red-500/5 mb-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-400">Results for</p>
                <p className="text-white font-mono text-sm truncate max-w-md">{result.url}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1">Grade</p>
                <span className={`text-4xl font-black ${getGradeColor(result.grade)}`}>
                  {result.grade}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {result.headers.map((header) => (
                <div
                  key={header.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        header.present ? "bg-green-400" : "bg-red-400"
                      }`}
                    />
                    <span className="text-sm font-mono text-gray-200">{header.name}</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      header.present ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {header.present ? "Present" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/tools/ssl" className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20">SSL Checker</Link>
          <Link href="/tools/leak" className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20">Secret Leak Scanner</Link>
        </div>

        <div className="mt-12 text-center card p-8">
          <h2 className="text-xl font-bold mb-2">Want a full security scan?</h2>
          <p className="text-gray-400 text-sm mb-4">
            Get OWASP Top 10 audit, SEO optimization, dependency CVE checks, and auto-fix with one click.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors"
          >
            Run Full Scan &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}

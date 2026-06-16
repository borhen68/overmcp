"use client";

import Link from "next/link";
import { useState } from "react";

interface SSLResult {
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  protocol: string;
}

export default function SSLCheckerPage() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SSLResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tools/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to check SSL certificate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getDaysColor(days: number) {
    if (days < 0) return "text-red-400";
    if (days < 30) return "text-red-400";
    if (days < 60) return "text-yellow-400";
    return "text-green-400";
  }

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70">
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
            <span className="text-gradient">SSL</span> Certificate Checker
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Check any domain's SSL/TLS certificate. See issuer, expiry, and protocol version.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 mb-8">
          <label htmlFor="domain-input" className="block text-sm font-medium text-gray-300 mb-2">
            Domain
          </label>
          <div className="flex gap-3">
            <input
              id="domain-input"
              type="text"
              required
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
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
            <div className="flex items-center gap-3 mb-6">
              <span
                className={`w-3 h-3 rounded-full ${result.valid ? "bg-green-400" : "bg-red-400"}`}
              />
              <span className={`text-lg font-bold ${result.valid ? "text-green-400" : "text-red-400"}`}>
                {result.valid ? "Valid Certificate" : "Invalid Certificate"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issuer</p>
                <p className="text-sm text-white font-mono">{result.issuer}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm text-white font-mono">{result.subject}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Valid From</p>
                <p className="text-sm text-white">{new Date(result.validFrom).toLocaleDateString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Expires</p>
                <p className="text-sm text-white">{new Date(result.validTo).toLocaleDateString()}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Days Remaining</p>
                <p className={`text-2xl font-black ${getDaysColor(result.daysRemaining)}`}>
                  {result.daysRemaining}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Protocol</p>
                <p className="text-sm text-white font-mono">{result.protocol}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16 text-center card p-8">
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

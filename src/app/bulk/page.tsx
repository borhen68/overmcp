"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ScanResult {
  url: string;
  scanId: string;
  status?: string;
}

export default function BulkScanPage() {
  const [urls, setUrls] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResults([]);

    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 3 && u.includes("."));

    if (urlList.length === 0) {
      setError("Enter at least one URL");
      return;
    }

    if (urlList.length > 10) {
      setError("Maximum 10 URLs per bulk scan");
      return;
    }

    setScanning(true);

    try {
      const res = await fetch("/api/bulk-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: urlList.map((u) => (u.startsWith("http") ? u : `https://${u}`)),
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.scans || []);
      }
    } catch {
      setError("Bulk scan failed");
    }

    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-grid">
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">VS</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">OverMCP</span>
          </a>
          <span className="text-sm text-gray-500">Bulk Scan</span>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-3xl font-bold mb-2">Bulk Scan</h1>
          <p className="text-gray-400 mb-8">
            Paste up to 10 URLs (one per line). Perfect for agencies managing multiple client sites.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={"myapp.vercel.app\nclient-site.netlify.app\nanother-project.com"}
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-sm resize-none"
            />

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={scanning || !urls.trim()}
              className="mt-4 w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-amber-500/20"
            >
              {scanning ? "Starting scans..." : `Scan ${urls.split("\n").filter((u) => u.trim().length > 3).length || 0} sites`}
            </button>
          </form>

          {results.length > 0 && (
            <div className="mt-10 space-y-3">
              <h3 className="font-semibold text-gray-300 mb-4">Scans Started</h3>
              {results.map((r, i) => (
                <motion.a
                  key={i}
                  href={`/report/${r.scanId}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="block glass rounded-xl p-4 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{r.url}</span>
                    <span className="text-xs text-green-400 font-medium shrink-0 ml-4">
                      Scanning →
                    </span>
                  </div>
                </motion.a>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

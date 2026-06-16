"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ScanItem {
  id: string;
  createdAt: string;
  status: string;
  paid: boolean;
  tier: string;
  url: string | null;
  platform: string | null;
}

export default function DashboardPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetch("/api/scans")
      .then((res) => res.json())
      .then((data) => {
        if (data.scans) setScans(data.scans);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true);

    try {
      const isGitHub = url.includes("github.com");
      const endpoint = isGitHub ? "/api/github/scan-public" : "/api/scan-url";
      const body = isGitHub
        ? { url }
        : { url: url.startsWith("http") ? url : `https://${url}` };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.scanId) {
        window.location.href = `/report/${data.scanId}`;
      }
    } catch {
      setScanning(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "done") return "text-green-400";
    if (status === "error") return "text-red-400";
    return "text-yellow-400";
  };

  const statusLabel = (status: string) => {
    if (status === "done") return "Complete";
    if (status === "error") return "Failed";
    return "Scanning...";
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent"
          >
            OverMCP
          </a>
          <span className="text-sm text-gray-500">Dashboard</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400 mb-8">Scan a new site or view your past scans.</p>

          {/* Quick scan */}
          <form onSubmit={handleScan} className="flex gap-3 mb-12">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any URL or GitHub repo..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={scanning || !url.trim()}
              className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-green-500/20"
            >
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </form>

          {/* Recent scans */}
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Recent Scans</h2>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-16 glass rounded-2xl">
              <p className="text-gray-500 mb-2">No scans yet</p>
              <p className="text-gray-600 text-sm">Paste a URL above to start your first scan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scans.map((scan, i) => (
                <motion.a
                  key={scan.id}
                  href={`/report/${scan.id}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="block glass rounded-xl p-5 hover:bg-white/[0.04] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium truncate">
                          {scan.url || "Unknown URL"}
                        </span>
                        {scan.platform && (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-gray-500 shrink-0">
                            {scan.platform}
                          </span>
                        )}
                        {scan.paid && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 shrink-0">
                            {scan.tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(scan.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${statusColor(scan.status)}`}>
                        {statusLabel(scan.status)}
                      </span>
                      <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
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

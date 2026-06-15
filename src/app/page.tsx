"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = useCallback(async (fileList: FileList) => {
    const parsed: { name: string; content: string }[] = [];
    for (let i = 0; i < fileList.length && i < 20; i++) {
      const file = fileList[i];
      if (file.size > 100000) continue;
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowedExts = [
        "js", "ts", "tsx", "jsx", "py", "html", "css", "vue",
        "svelte", "php", "rb", "go", "rs", "json", "yaml", "yml",
        "env", "sql", "prisma", "graphql",
      ];
      if (!ext || !allowedExts.includes(ext)) continue;
      const content = await file.text();
      parsed.push({ name: file.name, content });
    }
    setFiles((prev) => [...prev, ...parsed].slice(0, 20));
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please upload at least one file");
      return;
    }
    setScanning(true);
    setError("");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/report/${data.scanId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message);
      setScanning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            VibeSecure
          </h1>
          <span className="text-sm text-gray-400">
            Pay with crypto
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 w-full">
        {/* Hero text */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Your vibe-coded app is
            <span className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
              {" "}probably insecure
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Built with Cursor, Bolt, v0, or Lovable? We&apos;ll find the vulnerabilities,
            fix them, and improve your SEO — all in seconds.
          </p>
        </div>

        {/* Upload area */}
        <div className="max-w-2xl mx-auto">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging
                ? "border-green-400 bg-green-400/5"
                : "border-gray-700 hover:border-gray-500"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              className="hidden"
              accept=".js,.ts,.tsx,.jsx,.py,.html,.css,.vue,.svelte,.php,.rb,.go,.rs,.json,.yaml,.yml,.env,.sql,.prisma,.graphql"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="text-4xl mb-4">🔒</div>
            <p className="text-lg font-medium mb-2">
              Drop your source files here
            </p>
            <p className="text-sm text-gray-400">
              Supports JS, TS, Python, HTML, CSS, PHP, Go, Rust, SQL & more
              (max 20 files, 100KB each)
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  {files.length} file{files.length > 1 ? "s" : ""} ready
                </p>
                <button
                  onClick={() => setFiles([])}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg px-3 py-2 text-sm text-gray-300 truncate"
                  >
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={scanning || files.length === 0}
            className="mt-8 w-full py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20"
          >
            {scanning ? "Scanning..." : "Scan for Vulnerabilities — Free"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Free scan shows summary. Full report with fixes: $9 in crypto.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">🛡️</div>
            <h3 className="font-semibold text-lg mb-2">Security Audit</h3>
            <p className="text-gray-400 text-sm">
              OWASP Top 10 scanning. Find XSS, SQLi, exposed secrets, broken
              auth, and more.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">🔧</div>
            <h3 className="font-semibold text-lg mb-2">Auto-Fix Code</h3>
            <p className="text-gray-400 text-sm">
              Get fixed code snippets for every vulnerability. Copy-paste
              security.
            </p>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="text-2xl mb-3">📈</div>
            <h3 className="font-semibold text-lg mb-2">SEO Boost</h3>
            <p className="text-gray-400 text-sm">
              Meta tags, structure, performance, and accessibility improvements
              included.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-500">
        VibeSecure — Secure your AI-built apps. Pay with any cryptocurrency.
      </footer>
    </div>
  );
}

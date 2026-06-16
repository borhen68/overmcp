"use client";

import Link from "next/link";
import { useState } from "react";

export default function BadgePage() {
  const [scanInput, setScanInput] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);

  function extractScanId(input: string): string {
    // If it looks like a URL, extract the last path segment or the id param
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      // Check for /report/[id] pattern
      const segments = url.pathname.split("/").filter(Boolean);
      const reportIdx = segments.indexOf("report");
      if (reportIdx !== -1 && segments[reportIdx + 1]) {
        return segments[reportIdx + 1];
      }
      // Check for ?id= param
      const idParam = url.searchParams.get("id");
      if (idParam) return idParam;
      // Fallback to last segment
      return segments[segments.length - 1] || trimmed;
    } catch {
      // Not a URL, treat as raw ID
      return trimmed;
    }
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const id = extractScanId(scanInput);
    setScanId(id);
  }

  const badgeUrl = scanId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/badge/${scanId}`
    : null;

  const htmlEmbed = badgeUrl
    ? `<a href="${typeof window !== "undefined" ? window.location.origin : ""}/report/${scanId}"><img src="${badgeUrl}" alt="Secured by OverMCP" /></a>`
    : "";

  const markdownEmbed = badgeUrl
    ? `[![Secured by OverMCP](${badgeUrl})](${typeof window !== "undefined" ? window.location.origin : ""}/report/${scanId})`
    : "";

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
            <Link href="/badge" className="text-sm text-white font-medium">Badge</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Trust <span className="text-gradient">Badge</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Show your users that your app is secure. Embed a live security badge that updates with every scan.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="mb-12">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Enter your scan ID or report URL"
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors whitespace-nowrap"
            >
              Generate Badge
            </button>
          </div>
        </form>

        {scanId && badgeUrl && (
          <div className="space-y-8">
            {/* Preview */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Preview</h2>
              <div className="flex items-center justify-center p-6 rounded-lg bg-white/5 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeUrl} alt="Secured by OverMCP badge" />
              </div>
            </div>

            {/* HTML Embed */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">HTML Embed</h2>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm text-green-400 overflow-x-auto">
                  <code>{htmlEmbed}</code>
                </pre>
                <CopyButton text={htmlEmbed} />
              </div>
            </div>

            {/* Markdown Embed */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Markdown</h2>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm text-green-400 overflow-x-auto">
                  <code>{markdownEmbed}</code>
                </pre>
                <CopyButton text={markdownEmbed} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

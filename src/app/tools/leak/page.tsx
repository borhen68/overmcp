"use client";

import Link from "next/link";
import { useState } from "react";

interface LeakMatch {
  type: string;
  value: string;
  line: number;
}

const PATTERNS: { type: string; regex: RegExp }[] = [
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { type: "AWS Secret Key", regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/g },
  { type: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/g },
  { type: "Stripe Publishable Key", regex: /pk_live_[0-9a-zA-Z]{24,}/g },
  { type: "OpenAI API Key", regex: /sk-[A-Za-z0-9]{20,}/g },
  { type: "Firebase Config", regex: /AIzaSy[A-Za-z0-9_-]{33}/g },
  { type: "Generic API Key", regex: /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]([A-Za-z0-9_\-]{16,})['"]?/gi },
  { type: "JWT Token", regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/g },
  { type: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { type: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { type: "Slack Token", regex: /xox[baprs]-[0-9]{10,}-[A-Za-z0-9-]+/g },
];

function scanForLeaks(code: string): LeakMatch[] {
  const matches: LeakMatch[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    for (const pattern of PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        matches.push({
          type: pattern.type,
          value: match[0].length > 60 ? match[0].slice(0, 60) + "..." : match[0],
          line: idx + 1,
        });
      }
    }
  });

  return matches;
}

export default function LeakScannerPage() {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<LeakMatch[] | null>(null);

  function handleScan() {
    const leaks = scanForLeaks(code);
    setResults(leaks);
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
            Secret <span className="text-gradient">Leak</span> Scanner
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Paste your code below to detect leaked secrets. Runs entirely in your browser — nothing is sent to a server.
          </p>
        </div>

        <div className="card p-6 mb-8">
          <label htmlFor="code-input" className="block text-sm font-medium text-gray-300 mb-2">
            Paste your code
          </label>
          <textarea
            id="code-input"
            rows={12}
            placeholder={`// Paste code here to scan for leaked secrets...\nconst apiKey = "sk_live_abc123...";`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-y"
          />
          <button
            onClick={handleScan}
            disabled={!code.trim()}
            className="mt-4 w-full px-6 py-3 rounded-lg bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Scan for Secrets
          </button>
        </div>

        {results !== null && (
          <div className="card p-6">
            {results.length === 0 ? (
              <div className="text-center py-6">
                <span className="inline-block w-3 h-3 rounded-full bg-green-400 mb-3" />
                <p className="text-green-400 font-bold text-lg">No secrets detected</p>
                <p className="text-gray-400 text-sm mt-1">Your code looks clean. No known secret patterns found.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="text-red-400 font-bold">
                    {results.length} secret{results.length > 1 ? "s" : ""} detected
                  </span>
                </div>
                <div className="space-y-3">
                  {results.map((leak, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-red-500/5 border border-red-500/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          {leak.type}
                        </span>
                        <span className="text-xs text-gray-500">Line {leak.line}</span>
                      </div>
                      <p className="text-sm font-mono text-red-300 mt-1 break-all">{leak.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/tools/headers" className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20">Headers Checker</Link>
          <Link href="/tools/ssl" className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20">SSL Checker</Link>
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

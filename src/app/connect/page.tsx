"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ConnectPage() {
  const router = useRouter();
  const [vercelToken, setVercelToken] = useState("");
  const [netlifyToken, setNetlifyToken] = useState("");
  const [cfToken, setCfToken] = useState("");
  const [cfAccount, setCfAccount] = useState("");
  const [railwayToken, setRailwayToken] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handleVercelConnect = async () => {
    if (!vercelToken.trim()) return;
    setSaving("vercel");
    setError("");

    try {
      const res = await fetch("/api/vercel/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: vercelToken }),
      });

      if (res.ok) {
        router.push("/connect/vercel");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid token");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(null);
  };

  const handleNetlifyConnect = async () => {
    if (!netlifyToken.trim()) return;
    setSaving("netlify");
    setError("");

    try {
      const res = await fetch("/api/netlify", {
        headers: { "x-netlify-token": netlifyToken },
      });

      if (res.ok) {
        setSuccess("netlify");
        localStorage.setItem("netlify_token", netlifyToken);
      } else {
        setError("Invalid Netlify token");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(null);
  };

  const handleCFConnect = async () => {
    if (!cfToken.trim() || !cfAccount.trim()) return;
    setSaving("cloudflare");
    setError("");

    try {
      const res = await fetch("/api/cloudflare", {
        headers: { "x-cf-token": cfToken, "x-cf-account": cfAccount },
      });

      if (res.ok) {
        setSuccess("cloudflare");
        localStorage.setItem("cf_token", cfToken);
        localStorage.setItem("cf_account", cfAccount);
      } else {
        setError("Invalid Cloudflare credentials");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(null);
  };

  const handleRailwayConnect = async () => {
    if (!railwayToken.trim()) return;
    setSaving("railway");
    setError("");

    try {
      const res = await fetch("/api/railway", {
        headers: { "x-railway-token": railwayToken },
      });

      if (res.ok) {
        setSuccess("railway");
        localStorage.setItem("railway_token", railwayToken);
      } else {
        setError("Invalid Railway token");
      }
    } catch {
      setError("Connection failed");
    }
    setSaving(null);
  };

  const handleGitHubConnect = () => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
    if (appName && appName !== "your-app-slug") {
      // Install the GitHub App → enables always-on PR/push scanning.
      window.location.href = `https://github.com/apps/${appName}/installations/new`;
    } else {
      // App not configured yet — fall back to manual repo scanning.
      router.push("/dashboard");
    }
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
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-2">Connect Your Platform</h2>
          <p className="text-gray-400 mb-10">
            We&apos;ll scan your deployed code, fix vulnerabilities, and redeploy the secured version.
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Vercel */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-strong rounded-2xl p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5">
                <span className="text-black font-bold text-xl">▲</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Vercel</h3>
                <p className="text-sm text-gray-400">Scan, fix & redeploy in one click</p>
              </div>
              <span className="ml-auto px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                Recommended
              </span>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                placeholder="Paste your Vercel access token"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
              <p className="text-xs text-gray-600">
                Create at{" "}
                <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-green-400/80 hover:text-green-400 transition-colors">
                  vercel.com/account/tokens
                </a>
              </p>
              <button
                onClick={handleVercelConnect}
                disabled={!vercelToken.trim() || saving === "vercel"}
                className="w-full py-3.5 rounded-xl font-medium bg-white text-black hover:bg-gray-100 disabled:opacity-40 transition-all"
              >
                {saving === "vercel" ? "Verifying..." : "Connect Vercel"}
              </button>
            </div>
          </motion.div>

          {/* GitHub */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-strong rounded-2xl p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">GitHub</h3>
                <p className="text-sm text-gray-400">Always-on scanning on every pull request</p>
              </div>
            </div>
            <button
              onClick={handleGitHubConnect}
              className="w-full py-3.5 rounded-xl font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              Install GitHub App
            </button>

            {/* Permissions transparency — exactly what we do and don't do */}
            <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-xs">
              <p className="font-semibold text-gray-300 mb-2">What we access</p>
              <ul className="space-y-2 text-gray-400">
                {["Read your repository code, to scan it for vulnerabilities", "Open a pull request with fixes — on a new branch only"].map((t) => (
                  <li key={t} className="flex gap-2 items-start">
                    <svg className="w-4 h-4 text-emerald-400 mt-px shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="font-semibold text-gray-300 mt-3 mb-2">What we never do</p>
              <ul className="space-y-2 text-gray-400">
                {["Push to your default branch or merge anything", "Deploy or change your live app", "Sell your code or train AI on it"].map((t) => (
                  <li key={t} className="flex gap-2 items-start">
                    <svg className="w-4 h-4 text-rose-400 mt-px shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-gray-500">You review and merge every change. Want to try first? <Link href="/" className="text-amber-400/80 hover:text-amber-400">Scan a public repo free</Link> — no connection needed.</p>
            </div>
          </motion.div>

          {/* Netlify */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="glass-strong rounded-2xl p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-teal-900 rounded-xl flex items-center justify-center">
                <span className="text-teal-300 font-bold text-xl">N</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Netlify</h3>
                <p className="text-sm text-gray-400">Scan deployed sites & push fixed builds</p>
              </div>
              {success === "netlify" && (
                <span className="ml-auto px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={netlifyToken}
                onChange={(e) => setNetlifyToken(e.target.value)}
                placeholder="Netlify personal access token"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-all"
              />
              <p className="text-xs text-gray-600">
                Create at{" "}
                <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-teal-400/80 hover:text-teal-400 transition-colors">
                  app.netlify.com/user/applications
                </a>
              </p>
              <button
                onClick={handleNetlifyConnect}
                disabled={!netlifyToken.trim() || saving === "netlify"}
                className="w-full py-3.5 rounded-xl font-medium bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-40 transition-all"
              >
                {saving === "netlify" ? "Verifying..." : success === "netlify" ? "Connected" : "Connect Netlify"}
              </button>
            </div>
          </motion.div>

          {/* Cloudflare */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-strong rounded-2xl p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-orange-900 rounded-xl flex items-center justify-center">
                <span className="text-orange-300 font-bold text-lg">CF</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Cloudflare Pages</h3>
                <p className="text-sm text-gray-400">Scan & deploy to Cloudflare Pages</p>
              </div>
              {success === "cloudflare" && (
                <span className="ml-auto px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={cfToken}
                onChange={(e) => setCfToken(e.target.value)}
                placeholder="Cloudflare API token"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
              />
              <input
                type="text"
                value={cfAccount}
                onChange={(e) => setCfAccount(e.target.value)}
                placeholder="Account ID (from dashboard URL)"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
              />
              <button
                onClick={handleCFConnect}
                disabled={!cfToken.trim() || !cfAccount.trim() || saving === "cloudflare"}
                className="w-full py-3.5 rounded-xl font-medium bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-40 transition-all"
              >
                {saving === "cloudflare" ? "Verifying..." : success === "cloudflare" ? "Connected" : "Connect Cloudflare"}
              </button>
            </div>
          </motion.div>

          {/* Railway */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="glass-strong rounded-2xl p-7"
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-purple-900 rounded-xl flex items-center justify-center">
                <span className="text-purple-300 font-bold text-lg">RW</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Railway</h3>
                <p className="text-sm text-gray-400">Scan & redeploy Railway services</p>
              </div>
              {success === "railway" && (
                <span className="ml-auto px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 rounded-full">
                  Connected
                </span>
              )}
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={railwayToken}
                onChange={(e) => setRailwayToken(e.target.value)}
                placeholder="Railway API token"
                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
              />
              <p className="text-xs text-gray-600">
                Create at{" "}
                <a href="https://railway.app/account/tokens" target="_blank" rel="noopener noreferrer" className="text-purple-400/80 hover:text-purple-400 transition-colors">
                  railway.app/account/tokens
                </a>
              </p>
              <button
                onClick={handleRailwayConnect}
                disabled={!railwayToken.trim() || saving === "railway"}
                className="w-full py-3.5 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-all"
              >
                {saving === "railway" ? "Verifying..." : success === "railway" ? "Connected" : "Connect Railway"}
              </button>
            </div>
          </motion.div>

          {/* Quick scan note */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="glass rounded-2xl p-6 text-center"
          >
            <p className="text-gray-400 text-sm">
              Don&apos;t want to connect? Just{" "}
              <a href="/" className="text-green-400 hover:text-green-300 font-medium transition-colors">
                paste your site URL
              </a>{" "}
              on the homepage — we&apos;ll crawl it and scan the deployed code directly.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

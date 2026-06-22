"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Logo from "../components/Logo";

interface MonitorItem {
  id: string;
  url: string;
  email: string;
  frequency: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
  lastScore: number | null;
}

export default function MonitorPage() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [locked, setLocked] = useState(false);

  const [lookupEmail, setLookupEmail] = useState("");
  const [monitors, setMonitors] = useState<MonitorItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const createMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLocked(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          email,
          frequency,
          webhookUrl: webhookUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402 || data.requiresPlan) {
        setLocked(true);
        setMessage({ type: "err", text: data.error || "Continuous monitoring is part of the $19 Deploy plan." });
      } else if (!res.ok) {
        setMessage({ type: "err", text: data.error || "Something went wrong" });
      } else {
        setMessage({
          type: "ok",
          text: `Now monitoring ${data.monitor.url} (${data.monitor.frequency}). Your first report is on its way.`,
        });
        setUrl("");
        setWebhookUrl("");
        if (lookupEmail === email) loadMonitors(email);
      }
    } catch {
      setMessage({ type: "err", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const loadMonitors = async (e?: string) => {
    const target = (typeof e === "string" ? e : lookupEmail).trim();
    if (!target) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/monitor?email=${encodeURIComponent(target)}`);
      const data = await res.json();
      setMonitors(data.monitors || []);
    } catch {
      setMonitors([]);
    } finally {
      setLoadingList(false);
    }
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return "text-gray-500";
    if (score >= 80) return "text-green-400";
    if (score >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

  return (
    <div className="relative min-h-screen bg-grid noise text-white">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#0c0a09]/70">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <a href="/" aria-label="OverMCP home">
            <Logo markClass="w-8 h-8" textClass="text-lg" />
          </a>
        </div>
      </header>
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Continuous Monitoring</h1>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
              Deploy plan · $19
            </span>
          </div>
          <p className="text-gray-400 mt-2">
            We re-scan your live site on a schedule and email you the moment a new secret leak or
            vulnerable dependency appears. Set it once and forget it. Included with the $19 Deploy plan.
          </p>
        </motion.div>

        <motion.form
          onSubmit={createMonitor}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-400 mb-1">Site URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="myapp.vercel.app"
              className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email for alerts</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Slack / Discord webhook <span className="text-gray-600">(optional)</span>
            </label>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Frequency</label>
            <div className="flex gap-3">
              {(["weekly", "daily"] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 rounded-xl px-4 py-3 border capitalize transition ${
                    frequency === f
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-neutral-800 text-gray-400 hover:border-neutral-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-green-400" : "text-red-400"}`}>
              {message.text}
            </p>
          )}

          {locked && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm">
              <p className="text-gray-300">
                This email isn&apos;t on the <strong className="text-green-400">$19 Deploy plan</strong> yet.
                Run a scan and unlock the Deploy plan to enable continuous monitoring.
              </p>
              <a
                href="/"
                className="inline-block mt-3 text-green-400 font-semibold hover:underline"
              >
                Get the Deploy plan →
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl px-4 py-3 disabled:opacity-50"
          >
            {submitting ? "Setting up…" : "Start monitoring"}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-12"
        >
          <h2 className="text-xl font-semibold">Manage your monitors</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your email to see everything you&apos;re monitoring.</p>
          <div className="flex gap-3 mt-4">
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => loadMonitors()}
              className="px-5 rounded-xl border border-neutral-800 text-gray-300 hover:border-neutral-700"
            >
              {loadingList ? "…" : "Load"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {monitors.map((m) => (
              <div
                key={m.id}
                className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.url}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {m.frequency} · last run {fmt(m.lastRunAt)} · next {fmt(m.nextRunAt)}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`text-lg font-bold ${scoreColor(m.lastScore)}`}>
                    {m.lastScore === null ? "—" : `${m.lastScore}`}
                  </p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide">
                    {m.enabled ? "active" : "paused"}
                  </p>
                </div>
              </div>
            ))}
            {!loadingList && lookupEmail && monitors.length === 0 && (
              <p className="text-gray-500 text-sm">No monitors found for that email.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

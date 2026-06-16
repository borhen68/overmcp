"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../../components/Logo";
import AttackSimulation from "../../components/AttackSimulation";

interface ScanData {
  id: string;
  url?: string;
  status: "scanning" | "done" | "error";
  paid: boolean;
  tier?: string;
  summary?: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    seoScore: number;
    aeoScore: number;
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
  aeoScore?: number;
  performanceScore?: number;
  dependencyRisk?: number | null;
  totalCVEs?: number;
  aeo?: {
    score: number;
    issues: {
      category: string;
      issue: string;
      fix: string;
      impact: string;
      fixedCode?: string;
    }[];
    recommendations: {
      title: string;
      description: string;
      priority: string;
      code?: string;
    }[];
    generatedFiles: {
      filename: string;
      content: string;
      purpose: string;
    }[];
  };
  result?: {
    summary: {
      totalIssues: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      seoScore: number;
      aeoScore: number;
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
  performance?: {
    score: number;
    issues: {
      category: string;
      issue: string;
      impact: string;
      fix: string;
      fixedCode?: string;
      metric?: string;
    }[];
    coreWebVitals: {
      lcp: { status: string; issues: string[] };
      fid: { status: string; issues: string[] };
      cls: { status: string; issues: string[] };
      ttfb: { status: string; issues: string[] };
    };
    bundleAnalysis: {
      estimatedSize: string;
      heavyDependencies: string[];
      suggestions: string[];
    };
  };
  dependencies?: {
    totalDependencies: number;
    vulnerableDependencies: number;
    vulnerabilities: {
      package: string;
      version: string;
      severity: string;
      cve: string;
      title: string;
      fixedIn?: string;
      url?: string;
    }[];
    outdated: {
      package: string;
      current: string;
      latest: string;
      behind: string;
    }[];
    riskScore: number;
  };
  secrets?: {
    totalLeaks: number;
    leaks: {
      type: string;
      file: string;
      line: number;
      snippet: string;
      severity: string;
      description: string;
    }[];
    score: number;
  };
  accessibility?: {
    score: number;
    totalIssues: number;
    issues: {
      rule: string;
      severity: string;
      element: string;
      description: string;
      fix: string;
      wcag: string;
    }[];
    summary: { critical: number; serious: number; moderate: number; minor: number };
  };
  techStack?: {
    stack: {
      name: string;
      category: string;
      version?: string;
      confidence: number;
    }[];
    summary: string;
  };
  secretLeaks?: number;
  accessibilityScore?: number | null;
  error?: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<boolean>(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, (duration * 1000) / steps);
    return () => clearInterval(interval);
  }, [value, duration]);

  return <>{count}</>;
}

function RiskGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const progress = ((100 - score) / 100) * circumference;
  const color = score > 70 ? "#f87171" : score > 40 ? "#fb923c" : score > 15 ? "#facc15" : "#34d399";

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <motion.path
          d={`M 10 ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 10}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-black" style={{ color }}>{score}%</span>
        <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">risk level</span>
      </div>
    </div>
  );
}

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const justPaid = searchParams.get("paid") === "true";

  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [activeTab, setActiveTab] = useState("vulnerabilities");
  const [showAttackSim, setShowAttackSim] = useState(false);
  const repoParam = searchParams.get("repo");
  const platform = searchParams.get("platform");
  const projectName = searchParams.get("project");

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
        setData({ id, status: "error", paid: false, error: "Failed to fetch scan" });
      } finally {
        setLoading(false);
      }
    };
    fetchScan();
  }, [id, justPaid]);

  const handlePayment = async (tier: string = "fix") => {
    setPaying(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id, tier }),
      });
      const json = await res.json();
      if (json.invoiceUrl) window.location.href = json.invoiceUrl;
    } catch {
      setPaying(false);
    }
  };

  const handleCreatePR = async () => {
    if (!repoParam) return;
    setCreatingPR(true);
    try {
      const [owner, repo] = repoParam.split("/");
      const res = await fetch("/api/github/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id, owner, repo }),
      });
      const json = await res.json();
      if (json.prUrl) setPrUrl(json.prUrl);
    } finally {
      setCreatingPR(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) return;
    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId: id, email }),
    });
    setEmailSubmitted(true);
  };

  const handleChat = async () => {
    if (!chatMessage.trim() || chatLoading) return;
    const msg = chatMessage.trim();
    setChatMessage("");
    setChatHistory((h) => [...h, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id, message: msg }),
      });
      const json = await res.json();
      setChatHistory((h) => [...h, { role: "assistant", content: json.reply || json.error }]);
    } catch {
      setChatHistory((h) => [...h, { role: "assistant", content: "Failed to get response." }]);
    }
    setChatLoading(false);
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const res = await fetch("/api/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id }),
      });
      const json = await res.json();
      if (json.scanId) window.location.href = `/report/${json.scanId}`;
    } catch {
      setRescanning(false);
    }
  };

  const handleVercelDeploy = async () => {
    if (!projectName) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/vercel/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: id, projectName }),
      });
      const json = await res.json();
      if (json.deployUrl) setDeployUrl(json.deployUrl);
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="fixed inset-0 spotlight pointer-events-none" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center relative z-10">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center">
            <svg className="animate-spin h-7 w-7 text-green-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">Loading report...</p>
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "scanning") {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="fixed inset-0 spotlight pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md relative z-10">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center glow-green">
            <svg className="animate-spin h-8 w-8 text-green-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Deep scanning your code...</h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Running 9 security modules in parallel. This takes 15-30 seconds.
          </p>
          <div className="text-left glass rounded-xl p-5 space-y-4">
            {[
              { label: "Crawling & extracting source code", icon: "🌐", delay: 0 },
              { label: "Vulnerability & injection detection", icon: "🛡️", delay: 0.1 },
              { label: "Secret & API key leak scan", icon: "🔑", delay: 0.2 },
              { label: "SEO + AI visibility audit", icon: "✨", delay: 0.3 },
              { label: "Performance & bundle analysis", icon: "⚡", delay: 0.4 },
              { label: "Dependency CVE scan", icon: "📦", delay: 0.5 },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay }}
                className="flex items-center gap-3"
              >
                <span className="text-sm">{step.icon}</span>
                <span className="text-sm text-gray-400 flex-1">{step.label}</span>
                <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-6">Don&apos;t close this tab — results appear automatically.</p>
        </motion.div>
      </div>
    );
  }

  if (data.status === "error") {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="fixed inset-0 spotlight pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center glow-red">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Scan Failed</h2>
          <p className="text-red-400/80">{data.error}</p>
          <a href="/" className="inline-block mt-6 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all">
            Try Again
          </a>
        </motion.div>
      </div>
    );
  }

  const summary = data.result?.summary || data.summary;
  const totalIssues = data.totalVulnerabilities ?? (summary ? summary.critical + summary.high + summary.medium + summary.low : 0);
  const leaks = data.secretLeaks ?? data.secrets?.totalLeaks ?? 0;
  const riskPercent = Math.min(100, Math.round(
    ((summary?.critical ?? 0) * 25 + (summary?.high ?? 0) * 15 + (summary?.medium ?? 0) * 8 + (summary?.low ?? 0) * 3 + leaks * 30) / 1.2
  ));

  const verdict = (() => {
    if (leaks > 0 || (summary?.critical ?? 0) > 0)
      return { label: "Critical Risk", tone: "#f87171", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", emoji: "🚨" };
    if ((summary?.high ?? 0) > 0)
      return { label: "High Risk", tone: "#fb923c", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", emoji: "⚠️" };
    if ((summary?.medium ?? 0) > 0)
      return { label: "Needs Attention", tone: "#facc15", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", emoji: "🔶" };
    if (totalIssues > 0)
      return { label: "Minor Issues", tone: "#60a5fa", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", emoji: "💡" };
    return { label: "Looks Healthy", tone: "#34d399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.25)", emoji: "✅" };
  })();

  // --- UNPAID REPORT (CONVERSION-FOCUSED) ---
  if (!data.paid) {
    return (
      <div className="relative min-h-screen bg-grid noise">
        <div className="fixed inset-0 aurora pointer-events-none" />
        <div className="fixed inset-0 spotlight pointer-events-none" />

        <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="/" aria-label="Home">
              <Logo markClass="w-8 h-8" textClass="text-lg" />
            </a>
            <div className="flex items-center gap-3">
              <PulsingDot color={verdict.tone} />
              <span className="text-sm font-medium" style={{ color: verdict.tone }}>{verdict.label}</span>
            </div>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
          {/* === HERO: Risk Gauge + Verdict === */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div className="flex justify-center mb-6">
              <RiskGauge score={riskPercent} size={200} />
            </div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl md:text-4xl font-black tracking-tight mb-3"
            >
              {leaks > 0 ? (
                <>Your secrets are <span className="text-red-400">exposed</span></>
              ) : totalIssues > 10 ? (
                <>Your app has <span style={{ color: verdict.tone }}>{totalIssues} vulnerabilities</span></>
              ) : totalIssues > 0 ? (
                <>We found <span style={{ color: verdict.tone }}>{totalIssues} security issues</span></>
              ) : (
                <>Your app looks <span className="text-green-400">healthy</span></>
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-400 max-w-lg mx-auto leading-relaxed"
            >
              {leaks > 0
                ? `We found ${leaks} API key${leaks > 1 ? "s" : ""} exposed in your client-side code that anyone can steal by viewing source.`
                : `Our 9-module scan detected ${totalIssues} issue${totalIssues !== 1 ? "s" : ""} that could compromise your users' data and your app's reputation.`}
            </motion.p>
          </motion.div>

          {/* === SEVERITY BREAKDOWN — Animated bars === */}
          {summary && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-strong rounded-2xl p-6 mb-8"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Critical", value: summary.critical, color: "#f87171", bg: "rgba(239,68,68,0.1)" },
                  { label: "High", value: summary.high, color: "#fb923c", bg: "rgba(249,115,22,0.1)" },
                  { label: "Medium", value: summary.medium, color: "#facc15", bg: "rgba(234,179,8,0.1)" },
                  { label: "Low", value: summary.low, color: "#60a5fa", bg: "rgba(59,130,246,0.1)" },
                ].map((s, i) => (
                  <div key={i} className="text-center p-4 rounded-xl" style={{ background: s.bg }}>
                    <p className="text-3xl font-black" style={{ color: s.color }}>
                      <AnimatedCounter value={s.value} />
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "SEO Score", value: `${summary.seoScore}/100`, color: summary.seoScore > 70 ? "#34d399" : "#facc15" },
                  { label: "AI Visibility", value: `${summary.aeoScore || 0}/100`, color: "#c084fc" },
                  { label: "Performance", value: `${data.performanceScore || data.performance?.score || "—"}/100`, color: "#fb923c" },
                  { label: "Secret Leaks", value: `${leaks}`, color: leaks > 0 ? "#f87171" : "#34d399" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <div>
                      <p className="text-sm font-semibold text-white">{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* === SECRET LEAKS ALERT — Maximum urgency === */}
          {leaks > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden rounded-2xl p-6 mb-8 border border-red-500/30"
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-red-300 text-lg flex items-center gap-2">
                    <PulsingDot color="#f87171" />
                    {leaks} exposed secret{leaks > 1 ? "s" : ""} — publicly visible right now
                  </h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    Anyone can view-source your site and steal these API keys. This is an active security breach.
                    Unlock the report to see exactly which keys are exposed, where in your code, and get rotation instructions.
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-xs text-red-400/80">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Exposed since deployment
                    </div>
                    <div className="flex items-center gap-2 text-xs text-red-400/80">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Visible to anyone
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* === VULNERABILITY PREVIEW — Teaser with blur === */}
          {data.preview && data.preview.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Top findings</h3>
                <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  Showing 1 of {data.totalVulnerabilities}
                </span>
              </div>

              {/* First finding — fully visible */}
              <div className="glass-strong rounded-xl p-5 mb-3 border-l-2" style={{ borderLeftColor: verdict.tone }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border ${severityColors[data.preview[0].severity]}`}>
                    {data.preview[0].severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-600 font-mono">{data.preview[0].file}</span>
                </div>
                <p className="font-semibold text-white">{data.preview[0].type}</p>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{data.preview[0].description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Fix available — unlock to see
                </div>
              </div>

              {/* Blurred remaining findings */}
              {(data.totalVulnerabilities ?? 0) > 1 && (
                <div className="relative">
                  <div className="space-y-3 blur-[8px] select-none pointer-events-none opacity-60" aria-hidden="true">
                    {Array.from({ length: Math.min(5, (data.totalVulnerabilities ?? 1) - 1) }).map((_, i) => (
                      <div key={i} className="glass rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-5 w-16 rounded bg-white/10" />
                          <div className="h-4 w-32 rounded bg-white/5" />
                        </div>
                        <div className="h-4 w-3/4 rounded bg-white/8 mb-1.5" />
                        <div className="h-4 w-2/3 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="glass-strong rounded-2xl px-8 py-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" />
                        </svg>
                      </div>
                      <p className="font-bold text-white text-lg">
                        {(data.totalVulnerabilities ?? 1) - 1} more vulnerabilities
                      </p>
                      <p className="text-sm text-gray-400 mt-1">with fixes, code snippets & line numbers</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* === ATTACK SIMULATION CTA === */}
          {(totalIssues > 0 || leaks > 0) && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mb-8"
            >
              <button
                onClick={() => setShowAttackSim(true)}
                className="w-full group relative overflow-hidden rounded-2xl p-6 border border-red-500/20 text-left transition-all hover:border-red-500/40"
                style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(249,115,22,0.03) 100%)" }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-colors" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-lg group-hover:text-red-100 transition-colors">
                      See how you&apos;d get hacked
                    </h4>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Watch a live simulation of your site being exploited — using your actual scan data
                    </p>
                  </div>
                  <div className="shrink-0">
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Attack Simulation Modal */}
          {showAttackSim && (
            <AttackSimulation
              url={data.url || `https://${id}.example.com`}
              vulnerabilities={data.preview?.map(p => ({ ...p, line: undefined })) || []}
              secrets={data.secrets?.leaks?.map(l => ({ type: l.type, file: l.file, snippet: l.snippet, severity: l.severity })) || []}
              onClose={() => setShowAttackSim(false)}
              onUnlock={() => { setShowAttackSim(false); handlePayment("fix"); }}
            />
          )}

          {/* === WHAT YOU GET — Value proposition === */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="glass-strong rounded-2xl p-8 mb-8"
          >
            <h3 className="text-xl font-bold text-center mb-6">What&apos;s in the full report</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: "🛡️", title: "Every vulnerability", desc: "Exact file, line number, and copy-paste fix for each issue" },
                { icon: "🔑", title: "Secret rotation guide", desc: "Step-by-step instructions to rotate leaked keys safely" },
                { icon: "🤖", title: "AI visibility boost", desc: "Ready-to-deploy llms.txt, schema.org, and AEO files" },
                { icon: "⚡", title: "Performance fixes", desc: "Bundle analysis, Core Web Vitals, and speed optimizations" },
                { icon: "📦", title: "CVE alerts", desc: "Known vulnerabilities in your dependencies with upgrade paths" },
                { icon: "🔧", title: "Auto-fix PR", desc: "One-click PR on GitHub with all security fixes applied" },
              ].map((f, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02]">
                  <span className="text-xl">{f.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-white">{f.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* === EMAIL CAPTURE === */}
          {!emailSubmitted ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="glass rounded-xl p-5 mb-10"
            >
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">Get a free summary emailed to you</p>
                  <p className="text-xs text-gray-500 mt-0.5">Plus security tips for your stack. No spam, ever.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                    placeholder="you@email.com"
                    className="flex-1 sm:w-56 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 text-sm"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!email.includes("@")}
                    className="px-5 py-2.5 rounded-lg font-medium text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-40 transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-sm text-green-400 mb-10 flex items-center gap-2 justify-center">
              <span>✓</span> Sent — check your inbox.
            </p>
          )}

          {/* === PRICING CARDS === */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            id="pricing"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">
                Fix it before someone exploits it
              </h2>
              <p className="text-gray-400 mt-3 max-w-md mx-auto">
                One-time payment. Instant access. No subscription, no account needed.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Fix tier */}
              <div className="glass-strong rounded-2xl p-7 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <h4 className="font-bold text-xl mb-1">Fix</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">$9</span>
                  <span className="text-sm text-gray-500">in crypto</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">See everything. Fix it yourself.</p>
                <ul className="text-sm text-gray-300 space-y-3 mb-8 flex-1">
                  {[
                    `All ${data.totalVulnerabilities || totalIssues} vulnerabilities detailed`,
                    "File, line number & fixed code",
                    "SEO + AI visibility action plan",
                    "Ready-to-deploy llms.txt & schema",
                    "Auto-fix PR on GitHub",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePayment("fix")}
                  disabled={paying}
                  className="w-full py-4 rounded-xl font-bold text-white bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 disabled:opacity-50 transition-all"
                >
                  {paying ? "Redirecting..." : "Get Full Report — $9"}
                </button>
              </div>

              {/* Deploy tier — highlighted */}
              <div className="relative rounded-2xl p-7 pt-9 flex flex-col" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.02) 100%)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 rounded-t-2xl" />
                <div className="absolute top-2 right-5 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full text-[11px] font-bold text-white shadow-lg shadow-emerald-500/30 uppercase tracking-wide">
                  Most Popular
                </div>
                <h4 className="font-bold text-xl mb-1">Deploy</h4>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black text-green-400">$29</span>
                  <span className="text-sm text-gray-500">in crypto</span>
                </div>
                <p className="text-sm text-gray-500 mb-6">We fix and deploy it for you.</p>
                <ul className="text-sm text-gray-300 space-y-3 mb-8 flex-1">
                  {[
                    "Everything in Fix, plus:",
                    "Auto-deploy fixed version live",
                    "llms.txt + schema deployed",
                    "AI visibility boost applied",
                    "Free rescan in 7 days",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePayment("deploy")}
                  disabled={paying}
                  className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {paying ? "Redirecting..." : "Fix & Deploy — $29"}
                </button>
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-8 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                BTC, ETH, USDT & 100+ coins
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                Instant access after payment
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" /></svg>
                No account required
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                9 security modules
              </span>
            </div>
          </motion.div>

          {/* Tech stack badge row */}
          {data.techStack && data.techStack.stack.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-12 pt-8 border-t border-white/5 text-center"
            >
              <p className="text-xs text-gray-600 mb-3 uppercase tracking-wider font-medium">Detected stack</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {data.techStack.stack.slice(0, 8).map((tech, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/8 text-gray-400">
                    {tech.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </main>
      </div>
    );
  }

  // --- PAID REPORT (FULL, TABBED) ---
  const tabs = [
    { id: "vulnerabilities", label: "Vulnerabilities", count: data.result?.vulnerabilities?.length || 0, icon: "🛡️" },
    { id: "performance", label: "Performance", count: data.performance?.issues?.length || 0, icon: "⚡" },
    { id: "seo", label: "SEO", count: data.result?.seoIssues?.length || 0, icon: "📈" },
    { id: "aeo", label: "AI Visibility", count: data.aeo?.issues?.length || 0, icon: "🤖" },
    { id: "dependencies", label: "Dependencies", count: data.dependencies?.vulnerabilities?.length || 0, icon: "📦" },
    { id: "secrets", label: "Secrets", count: data.secrets?.totalLeaks || 0, icon: "🔑" },
    { id: "accessibility", label: "A11y", count: data.accessibility?.totalIssues || 0, icon: "♿" },
  ].filter(t => t.count > 0);

  return (
    <div className="relative min-h-screen bg-grid noise">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" aria-label="Home">
            <Logo markClass="w-8 h-8" textClass="text-lg" />
          </a>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-medium px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
              Full Report
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Summary bar */}
        {summary && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass-strong rounded-2xl p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: verdict.bg, border: `1px solid ${verdict.border}` }}>
                  <span className="text-3xl">{verdict.emoji}</span>
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold mb-1" style={{ background: verdict.bg, color: verdict.tone, border: `1px solid ${verdict.border}` }}>
                    {verdict.label}
                  </span>
                  <p className="text-xl font-bold">{totalIssues} issues found</p>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: "Critical", value: summary.critical, color: "#f87171" },
                  { label: "High", value: summary.high, color: "#fb923c" },
                  { label: "Medium", value: summary.medium, color: "#facc15" },
                  { label: "Low", value: summary.low, color: "#60a5fa" },
                  { label: "SEO", value: summary.seoScore, color: "#34d399" },
                  { label: "AEO", value: summary.aeoScore || 0, color: "#c084fc" },
                ].map((m, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[10px] text-gray-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <a
            href={`/api/export?id=${id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </a>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Ask AI
          </button>
          {repoParam && !prUrl && (
            <button
              onClick={handleCreatePR}
              disabled={creatingPR}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-3.1a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
              </svg>
              {creatingPR ? "Creating..." : "Auto-Fix PR"}
            </button>
          )}
          {prUrl && (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
              View PR on GitHub
            </a>
          )}
          {platform === "vercel" && projectName && !deployUrl && (
            <button
              onClick={handleVercelDeploy}
              disabled={deploying}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {deploying ? "Deploying..." : "Deploy Fixed Version"}
            </button>
          )}
          {deployUrl && (
            <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
              View Deployment
            </a>
          )}
          {data.tier === "deploy" && (
            <button
              onClick={handleRescan}
              disabled={rescanning}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {rescanning ? "Rescanning..." : "Rescan"}
            </button>
          )}
          <button
            onClick={() => {
              const embed = `<a href="${window.location.origin}/report/${id}"><img src="${window.location.origin}/api/badge?id=${id}" alt="Secured by VibeSecure" /></a>`;
              navigator.clipboard.writeText(embed);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Badge
          </button>
        </div>

        {/* AI Chat */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2 text-purple-400">AI Security Assistant</h4>
                  <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white text-xl">&times;</button>
                </div>
                <div className="p-5 max-h-80 overflow-y-auto space-y-4">
                  {chatHistory.length === 0 && (
                    <p className="text-gray-500 text-sm">Ask anything about your vulnerabilities, how to fix them, or what to prioritize.</p>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                        msg.role === "user" ? "bg-green-500/10 border border-green-500/20 text-green-100" : "bg-white/5 border border-white/10 text-gray-300"
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleChat()}
                      placeholder="Which vulnerability should I fix first?"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50"
                    />
                    <button
                      onClick={handleChat}
                      disabled={chatLoading || !chatMessage.trim()}
                      className="px-4 py-3 rounded-xl bg-purple-500 text-white font-medium text-sm disabled:opacity-40 hover:bg-purple-400 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab navigation */}
        {tabs.length > 0 && (
          <div className="flex gap-1 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-white/10 border border-white/15 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                    activeTab === tab.id ? "bg-white/10" : "bg-white/5"
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        <div className="space-y-4">
          {/* Vulnerabilities */}
          {activeTab === "vulnerabilities" && data.result?.vulnerabilities && data.result.vulnerabilities.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {data.result.vulnerabilities.map((vuln, i) => (
                <div key={i} className="glass-strong rounded-xl p-6 border-l-2" style={{ borderLeftColor: vuln.severity === "critical" ? "#f87171" : vuln.severity === "high" ? "#fb923c" : vuln.severity === "medium" ? "#facc15" : "#60a5fa" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${severityColors[vuln.severity]}`}>
                        {vuln.severity.toUpperCase()}
                      </span>
                      <span className="font-semibold">{vuln.type}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{vuln.file}{vuln.line ? `:${vuln.line}` : ""}</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">{vuln.description}</p>
                  <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-4 mb-3">
                    <p className="text-xs font-semibold text-green-400 mb-1 uppercase tracking-wider">Fix</p>
                    <p className="text-sm text-gray-300">{vuln.fix}</p>
                  </div>
                  {vuln.fixedCode && (
                    <div className="bg-gray-950/80 rounded-lg p-4 overflow-x-auto">
                      <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">Fixed code</p>
                      <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">{vuln.fixedCode}</pre>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* Performance */}
          {activeTab === "performance" && data.performance && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-strong rounded-xl p-6">
                  <p className="text-sm text-gray-400 mb-2">Performance Score</p>
                  <p className="text-4xl font-bold text-orange-400">{data.performance.score}/100</p>
                  {data.performance.bundleAnalysis && (
                    <p className="text-xs text-gray-500 mt-2">Est. bundle: {data.performance.bundleAnalysis.estimatedSize}</p>
                  )}
                </div>
                <div className="glass-strong rounded-xl p-6">
                  <p className="text-sm text-gray-400 mb-3">Core Web Vitals</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(data.performance.coreWebVitals).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${val.status === "good" ? "bg-green-400" : val.status === "needs-improvement" ? "bg-yellow-400" : "bg-red-400"}`} />
                        <span className="text-sm text-gray-300 uppercase font-medium">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {data.performance.issues.map((issue, i) => (
                <div key={i} className="glass-strong rounded-xl p-5 border-l-2 border-l-orange-400/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityColors[issue.impact] || severityColors.medium}`}>{issue.impact}</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{issue.category}</span>
                    {issue.metric && <span className="text-xs text-orange-400">{issue.metric}</span>}
                  </div>
                  <p className="font-medium mb-1">{issue.issue}</p>
                  <p className="text-sm text-gray-400">{issue.fix}</p>
                  {issue.fixedCode && (
                    <pre className="mt-3 bg-gray-950/80 rounded-lg p-3 text-xs text-orange-300 font-mono overflow-x-auto whitespace-pre-wrap">{issue.fixedCode}</pre>
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {/* SEO */}
          {activeTab === "seo" && data.result?.seoIssues && data.result.seoIssues.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {data.result.seoIssues.map((issue, i) => (
                <div key={i} className="glass-strong rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityColors[issue.impact] || severityColors.medium}`}>{issue.impact.toUpperCase()}</span>
                    <span className="font-medium">{issue.issue}</span>
                  </div>
                  <p className="text-sm text-gray-400">{issue.recommendation}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* AEO */}
          {activeTab === "aeo" && data.aeo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="glass-strong rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-400">AI Visibility Score</p>
                    <p className="text-4xl font-bold text-purple-400">{data.aeo.score}/100</p>
                  </div>
                  <p className="text-sm text-gray-500 max-w-xs text-right">How well AI assistants can understand and recommend your site</p>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${data.aeo.score}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
              </div>

              {data.aeo.issues.map((issue, i) => (
                <div key={i} className="glass-strong rounded-xl p-5 border-l-2 border-l-purple-400/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityColors[issue.impact] || severityColors.medium}`}>{issue.impact.toUpperCase()}</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{issue.category}</span>
                  </div>
                  <p className="font-medium mb-1">{issue.issue}</p>
                  <p className="text-sm text-gray-400">{issue.fix}</p>
                  {issue.fixedCode && (
                    <pre className="mt-3 bg-gray-950/80 rounded-lg p-3 text-xs text-purple-300 font-mono overflow-x-auto whitespace-pre-wrap">{issue.fixedCode}</pre>
                  )}
                </div>
              ))}

              {data.aeo.generatedFiles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-300 mb-3">Ready-to-Deploy Files</h4>
                  {data.aeo.generatedFiles.map((file, i) => (
                    <div key={i} className="glass-strong rounded-xl overflow-hidden mb-3">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 font-mono text-sm">{file.filename}</span>
                          <span className="text-xs text-gray-600">— {file.purpose}</span>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(file.content)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors">
                          Copy
                        </button>
                      </div>
                      <pre className="p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">{file.content}</pre>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Dependencies */}
          {activeTab === "dependencies" && data.dependencies && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="glass-strong rounded-xl p-5 text-center">
                  <p className="text-3xl font-bold text-white">{data.dependencies.totalDependencies}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Packages</p>
                </div>
                <div className="glass-strong rounded-xl p-5 text-center">
                  <p className={`text-3xl font-bold ${data.dependencies.vulnerableDependencies > 0 ? "text-red-400" : "text-green-400"}`}>
                    {data.dependencies.vulnerableDependencies}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Vulnerable</p>
                </div>
                <div className="glass-strong rounded-xl p-5 text-center">
                  <p className={`text-3xl font-bold ${data.dependencies.riskScore > 70 ? "text-green-400" : data.dependencies.riskScore > 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {data.dependencies.riskScore}/100
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Safety Score</p>
                </div>
              </div>

              {data.dependencies.vulnerabilities.map((vuln, i) => (
                <div key={i} className="glass-strong rounded-xl p-5 border-l-2 border-l-red-400/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${severityColors[vuln.severity]}`}>{vuln.severity.toUpperCase()}</span>
                      <span className="font-mono text-sm text-white">{vuln.package}@{vuln.version}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{vuln.cve}</span>
                  </div>
                  <p className="text-sm text-gray-300">{vuln.title}</p>
                  {vuln.fixedIn && <p className="text-xs text-green-400 mt-2">Fix: upgrade to {vuln.fixedIn}</p>}
                </div>
              ))}

              {data.dependencies.outdated.length > 0 && (
                <div className="glass-strong rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5">
                    <h4 className="font-medium text-sm">Outdated Packages</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 text-xs">
                        <th className="text-left px-5 py-3">Package</th>
                        <th className="text-left px-5 py-3">Current</th>
                        <th className="text-left px-5 py-3">Latest</th>
                        <th className="text-left px-5 py-3">Behind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dependencies.outdated.map((dep, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="px-5 py-2.5 font-mono text-white">{dep.package}</td>
                          <td className="px-5 py-2.5 text-red-400 font-mono">{dep.current}</td>
                          <td className="px-5 py-2.5 text-green-400 font-mono">{dep.latest}</td>
                          <td className="px-5 py-2.5 text-gray-400">{dep.behind}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* Secrets */}
          {activeTab === "secrets" && data.secrets && data.secrets.totalLeaks > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="glass-strong rounded-xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Secrets Safety</p>
                  <p className={`text-4xl font-bold ${data.secrets.score > 70 ? "text-green-400" : data.secrets.score > 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {data.secrets.score}/100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-400">{data.secrets.totalLeaks}</p>
                  <p className="text-xs text-gray-500">leak{data.secrets.totalLeaks > 1 ? "s" : ""} found</p>
                </div>
              </div>
              {data.secrets.leaks.map((leak, i) => (
                <div key={i} className="glass-strong rounded-xl p-5 border-l-2 border-l-red-400/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${severityColors[leak.severity]}`}>{leak.severity.toUpperCase()}</span>
                      <span className="font-medium text-sm">{leak.type}</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{leak.file}:{leak.line}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{leak.description}</p>
                  <div className="bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
                    <code className="text-xs text-red-300 font-mono break-all">{leak.snippet}</code>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Accessibility */}
          {activeTab === "accessibility" && data.accessibility && data.accessibility.totalIssues > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-strong rounded-xl p-6">
                  <p className="text-sm text-gray-400 mb-2">Accessibility Score</p>
                  <p className={`text-4xl font-bold ${data.accessibility.score > 70 ? "text-green-400" : data.accessibility.score > 40 ? "text-yellow-400" : "text-red-400"}`}>
                    {data.accessibility.score}/100
                  </p>
                </div>
                <div className="glass-strong rounded-xl p-6">
                  <p className="text-sm text-gray-400 mb-3">By Severity</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Critical", value: data.accessibility.summary.critical, color: "bg-red-400" },
                      { label: "Serious", value: data.accessibility.summary.serious, color: "bg-orange-400" },
                      { label: "Moderate", value: data.accessibility.summary.moderate, color: "bg-yellow-400" },
                      { label: "Minor", value: data.accessibility.summary.minor, color: "bg-blue-400" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className="text-gray-400">{s.label}: {s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {data.accessibility.issues.map((issue, i) => (
                <div key={i} className="glass-strong rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      issue.severity === "critical" ? severityColors.critical :
                      issue.severity === "serious" ? severityColors.high :
                      issue.severity === "moderate" ? severityColors.medium : severityColors.low
                    }`}>{issue.severity.toUpperCase()}</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded font-mono">{issue.wcag}</span>
                  </div>
                  <p className="font-medium mb-1">{issue.description}</p>
                  <p className="text-sm text-gray-400">{issue.fix}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Tech Stack */}
        {data.techStack && data.techStack.stack.length > 0 && (
          <div className="mt-12 pt-8 border-t border-white/5">
            <h3 className="font-bold text-lg mb-4">Tech Stack</h3>
            <div className="glass-strong rounded-xl p-6">
              <p className="text-sm text-gray-400 mb-4">{data.techStack.summary}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.techStack.stack.map((tech, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tech.name}</p>
                      <p className="text-xs text-gray-600">{tech.category}{tech.version ? ` • v${tech.version}` : ""}</p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">{tech.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Logo from "./components/Logo";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const router = useRouter();
  const [inputUrl, setInputUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const { t, lang, setLang } = useTranslation();

  const handleScan = async () => {
    const url = inputUrl.trim();
    if (!url) {
      setError(t("scan.error"));
      return;
    }

    setScanning(true);
    setError("");

    try {
      // Detect if it's a GitHub repo URL
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/\s?#]+)/);

      let res;
      if (githubMatch) {
        const [, owner, repo] = githubMatch;
        res = await fetch("/api/github/scan-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo: repo.replace(/\.git$/, "") }),
        });
      } else {
        // It's a live site URL — crawl it
        res = await fetch("/api/scan-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      }

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
    <div className="relative flex flex-col min-h-screen bg-grid noise">
      {/* Ambient background */}
      <div className="fixed inset-0 aurora aurora-animate pointer-events-none" />
      <div className="fixed inset-0 spotlight pointer-events-none" />

      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" aria-label="OverMCP home">
            <Logo markClass="w-8 h-8" textClass="text-lg" />
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t("nav.pricing")}</a>
            <a href="/tools/headers" className="hover:text-white transition-colors">{t("nav.freeTools")}</a>
            <a href="/blog" className="hover:text-white transition-colors">{t("nav.blog")}</a>
            <a href="/monitor" className="hover:text-white transition-colors">{t("nav.monitoring")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher lang={lang} setLang={setLang} />
            <a
              href="#scan"
              className="hidden sm:inline-block px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              {t("nav.scanFree")}
            </a>
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileNav ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile nav */}
      {mobileNav && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden sticky top-16 z-40 border-b border-white/5 backdrop-blur-xl bg-[#030712]/90"
        >
          <nav className="flex flex-col px-6 py-4 gap-3 text-sm text-gray-400">
            <a href="#features" onClick={() => setMobileNav(false)} className="hover:text-white py-1">{t("nav.features")}</a>
            <a href="#pricing" onClick={() => setMobileNav(false)} className="hover:text-white py-1">{t("nav.pricing")}</a>
            <a href="/tools/headers" className="hover:text-white py-1">{t("nav.freeTools")}</a>
            <a href="/blog" className="hover:text-white py-1">{t("nav.blog")}</a>
            <a href="/monitor" className="hover:text-white py-1">{t("nav.monitoring")}</a>
            <a
              href="#scan"
              onClick={() => setMobileNav(false)}
              className="mt-2 px-4 py-2.5 text-center text-sm font-semibold rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white"
            >
              {t("nav.scanFree")}
            </a>
          </nav>
        </motion.div>
      )}

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-20">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-ring" />
              {t("hero.badge")}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              {t("hero.title.line1")}
              <br />
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                {t("hero.title.line2")}
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12">
              {t("hero.subtitle")}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-12 mb-16">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">89%</p>
                <p className="text-sm text-gray-500">{t("stats.vulnerabilities")}</p>
              </div>
              <div className="w-px h-12 bg-gray-800" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">9</p>
                <p className="text-sm text-gray-500">{t("stats.modules")}</p>
              </div>
              <div className="w-px h-12 bg-gray-800" />
              <div className="text-center">
                <p className="text-3xl font-bold text-white">&lt; 60s</p>
                <p className="text-sm text-gray-500">{t("stats.time")}</p>
              </div>
            </div>
          </motion.div>

          {/* Main Input Card */}
          <motion.div
            id="scan"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="max-w-2xl mx-auto scroll-mt-24"
          >
            <div className="gradient-border p-8 rounded-2xl">
              {/* URL Input */}
              <label className="text-sm text-gray-400 font-medium block mb-3">
                {t("scan.label")}
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 003 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => { setInputUrl(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleScan()}
                    placeholder={t("scan.placeholder")}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all text-base"
                  />
                </div>
                <button
                  onClick={handleScan}
                  disabled={scanning || !inputUrl.trim()}
                  className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-green-500/25 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] whitespace-nowrap"
                >
                  {scanning ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    t("hero.scanButton")
                  )}
                </button>
              </div>

              {error && (
                <p className="mt-3 text-red-400 text-sm">{error}</p>
              )}

              <p className="mt-4 text-xs text-gray-600">
                {t("scan.note")}
                {" "}
                <a href="/connect" className="text-green-400/80 hover:text-green-400 transition-colors">
                  {t("scan.private")}
                </a>.
              </p>

              {/* Divider */}
              <div className="flex items-center gap-4 my-7">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-gray-600 uppercase tracking-wider">{t("scan.divider")}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Platform buttons */}
              <div className="grid grid-cols-3 gap-3">
                <a
                  href="/connect"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                >
                  <span className="text-xl">▲</span>
                  <span className="text-gray-400">Vercel</span>
                </a>
                <a
                  href="/dashboard"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                >
                  <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  <span className="text-gray-400">GitHub</span>
                </a>
                <a
                  href="/connect"
                  className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm font-medium bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all"
                >
                  <span className="text-xl text-teal-400">N</span>
                  <span className="text-gray-400">Netlify</span>
                </a>
              </div>
            </div>

            <p className="text-center text-xs text-gray-600 mt-5">
              {t("scan.footer")}
            </p>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("features.title")}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t("features.subtitle")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "Security Audit",
                description: "OWASP Top 10 — XSS, SQL injection, exposed secrets, broken auth, and more.",
                color: "green",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
                title: "AI Visibility (AEO)",
                description: "Get found by ChatGPT, Claude & Perplexity. We generate llms.txt, schema, and AI bot access.",
                color: "purple",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "Performance & CWV",
                description: "Core Web Vitals, bundle analysis, render-blocking resources, image optimization.",
                color: "orange",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "Dependency CVE Scan",
                description: "Check every npm package for known vulnerabilities. Get fix versions instantly.",
                color: "red",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                  </svg>
                ),
                title: "SEO Audit",
                description: "Meta tags, structure, accessibility, Open Graph — rank higher on Google.",
                color: "blue",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                ),
                title: "Secret Leak Detection",
                description: "AWS keys, Stripe tokens, database URLs — we find exposed secrets in your client code.",
                color: "red",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                ),
                title: "Accessibility (WCAG)",
                description: "WCAG 2.1 Level AA audit. Alt tags, color contrast, keyboard navigation, ARIA labels.",
                color: "blue",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3" />
                  </svg>
                ),
                title: "Auto-Fix & Deploy",
                description: "One click — we fix everything and redeploy to Vercel, Netlify, or open a GitHub PR.",
                color: "emerald",
              },
            ].map((feature, i) => {
              const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                green: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)", text: "rgb(74,222,128)" },
                purple: { bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.2)", text: "rgb(192,132,252)" },
                orange: { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", text: "rgb(251,146,60)" },
                red: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)", text: "rgb(248,113,113)" },
                blue: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", text: "rgb(96,165,250)" },
                emerald: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", text: "rgb(52,211,153)" },
              };
              const c = colorMap[feature.color] || colorMap.green;
              return (
                <motion.div
                  key={i}
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="card p-7 group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, color: c.text }}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("howItWorks.title")}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: t("howItWorks.step1.title"), desc: t("howItWorks.step1.desc") },
              { step: "02", title: t("howItWorks.step2.title"), desc: t("howItWorks.step2.desc") },
              { step: "03", title: t("howItWorks.step3.title"), desc: t("howItWorks.step3.desc") },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-white/5 mb-4">{item.step}</div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-gray-400">{t("pricing.subtitle")}</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Scan",
                price: "Free",
                desc: "See what's wrong",
                features: ["Vulnerability count", "Risk summary", "SEO + AEO scores", "Performance score", "1 issue preview"],
                cta: "Start Free Scan",
                highlight: false,
              },
              {
                name: "Fix",
                price: "$9",
                desc: "Full report + auto PR",
                features: ["All vulnerabilities detailed", "Fixed code snippets", "SEO + AEO optimization", "Performance & CWV report", "Dependency CVE audit", "Auto PR on GitHub"],
                cta: "Get Full Report",
                highlight: true,
              },
              {
                name: "Deploy",
                price: "$29",
                desc: "We fix & deploy for you",
                features: ["Everything in Fix", "Auto-deploy to any platform", "llms.txt + schema generated", "Live site secured", "Priority support", "Rescan included"],
                cta: "Fix & Deploy",
                highlight: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`rounded-2xl p-7 relative ${
                  plan.highlight
                    ? "gradient-border glow-green bg-white/[0.03]"
                    : "glass"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full text-xs font-medium">
                    {t("pricing.mostPopular")}
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>
                <p className="text-4xl font-bold mb-6">
                  {plan.price}
                  {plan.price !== "Free" && <span className="text-base font-normal text-gray-500"> USD</span>}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20"
                      : "bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("cta.title")}
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              {t("cta.subtitle")}
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-green-500/25 transition-all hover:scale-105 active:scale-95"
            >
              {t("cta.button")}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </motion.div>
        </section>
      </main>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-t border-white/5">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">FAQ</h2>
        </motion.div>

        <div className="space-y-4">
          {[
            {
              q: "What is vibe coding and why does it need security scanning?",
              a: "Vibe coding means using AI tools like Cursor, Bolt, v0, and Lovable to build apps by describing what you want in natural language. While incredibly fast, AI-generated code often contains security vulnerabilities — XSS, SQL injection, exposed API keys, missing authentication. OverMCP catches these before your users do.",
            },
            {
              q: "How does OverMCP scan my website?",
              a: "Paste any live URL or GitHub repo link. We crawl your deployed code, extract HTML/JS/CSS, follow source maps to get original source, and run 4 parallel AI analyses: security audit, SEO/AEO check, performance audit, and dependency CVE scan. Takes 15-30 seconds.",
            },
            {
              q: "What is AEO (Answer Engine Optimization)?",
              a: "AEO makes your site visible and recommendable by AI chatbots — ChatGPT, Claude, Perplexity, and others. We check AI bot permissions in robots.txt, generate llms.txt files, add JSON-LD structured data, and optimize content for AI comprehension. This is SEO for the AI era.",
            },
            {
              q: "Can you actually fix my code automatically?",
              a: "Yes. The $9 tier creates a GitHub PR with all fixes applied to your repo. The $29 tier deploys the fixed version directly to Vercel, Netlify, Cloudflare Pages, or Railway — one click and your live site is secured.",
            },
            {
              q: "Why crypto payments only?",
              a: "We accept Bitcoin, Ethereum, USDT, and 100+ cryptocurrencies via NOWPayments. This makes OverMCP accessible globally without geographic payment restrictions or requiring a credit card.",
            },
            {
              q: "What platforms do you support?",
              a: "Any live website (we auto-detect the platform from headers), plus direct integrations with Vercel, Netlify, Cloudflare Pages, Railway, and GitHub for auto-fix and deploy.",
            },
          ].map((faq, i) => (
            <motion.details
              key={i}
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              viewport={{ once: true }}
              className="glass rounded-xl group"
            >
              <summary className="px-6 py-5 cursor-pointer font-medium text-white hover:text-green-400 transition-colors list-none flex items-center justify-between">
                {faq.q}
                <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">
                {faq.a}
              </p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo className="mb-3" markClass="w-7 h-7" textClass="text-base" />
              <p className="text-sm text-gray-500 leading-relaxed">
                {t("footer.description")}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-300 mb-3">{t("footer.product")}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-white transition-colors">{t("nav.features")}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t("nav.pricing")}</a></li>
                <li><a href="/monitor" className="hover:text-white transition-colors">{t("nav.monitoring")}</a></li>
                <li><a href="/badge" className="hover:text-white transition-colors">{t("footer.trustBadge")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-300 mb-3">{t("footer.freeTools")}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/tools/headers" className="hover:text-white transition-colors">{t("footer.headersChecker")}</a></li>
                <li><a href="/tools/ssl" className="hover:text-white transition-colors">{t("footer.sslChecker")}</a></li>
                <li><a href="/tools/leak" className="hover:text-white transition-colors">{t("footer.secretLeakScanner")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-300 mb-3">{t("footer.resources")}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="/blog" className="hover:text-white transition-colors">{t("footer.blog")}</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">{t("footer.terms")}</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">{t("footer.privacy")}</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} OverMCP. {t("footer.copyright")}
            </p>
            <span className="text-xs text-gray-600">{t("footer.crypto")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

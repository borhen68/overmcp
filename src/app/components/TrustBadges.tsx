// Trust signals shown on the report + landing. Every claim here must be TRUE
// of the actual product — over-claiming on a security tool destroys trust
// faster than saying nothing. These four are all things OverMCP genuinely does.
//
// Icons are clean outline SVGs (matching the rest of the app), not emoji.

import type { ReactNode } from "react";

const Icon = ({ d }: { d: string }) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ITEMS: { icon: ReactNode; title: string; body: string }[] = [
  {
    // shield-check
    icon: <Icon d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15a11.96 11.96 0 0 1-8.25-3.29Z" />,
    title: "Every finding is verified",
    body: "A second pass re-checks each issue against your actual code and points to the exact line — no vague scare-warnings.",
  },
  {
    // code branch / pull request
    icon: <Icon d="M6 3v12m0 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-12a3 3 0 1 0 0 .01M18 9a3 3 0 1 0 0-.01M18 9a9 9 0 0 1-9 9" />,
    title: "We never touch your live app",
    body: "Fixes come as a pull request on a new branch that you review and merge. We never push to your default branch or deploy without you.",
  },
  {
    // bolt / instant, no signup
    icon: <Icon d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />,
    title: "Try it before you trust it",
    body: "Scan any public site or GitHub repo free — no signup, no account. See real results before connecting anything private.",
  },
  {
    // lock-closed
    icon: <Icon d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z" />,
    title: "Used only for your report",
    body: "Your code is analyzed to produce this report and nothing else — never sold, never used to train models.",
  },
];

export default function TrustBadges({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "" : "max-w-5xl mx-auto px-6"}>
      {!compact && (
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-2">Why you can trust us</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Built to earn your trust, not just your scan</h2>
        </div>
      )}
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"}`}>
        {ITEMS.map((it) => (
          <div
            key={it.title}
            className="rounded-xl border border-white/8 bg-white/[0.03] p-5 hover:border-white/15 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              {it.icon}
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{it.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

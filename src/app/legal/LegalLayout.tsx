import React from "react";
import Logo from "../components/Logo";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-grid noise text-white">
      <div className="fixed inset-0 aurora pointer-events-none" />
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#030712]/70">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" aria-label="OverMCP home">
            <Logo markClass="w-8 h-8" textClass="text-lg" />
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back home
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: {updated}</p>
        <div className="mt-10 space-y-8 text-gray-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-2 [&_p]:text-sm [&_p]:text-gray-400 [&_li]:text-sm [&_li]:text-gray-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default LegalLayout;

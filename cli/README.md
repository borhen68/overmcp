# OverMCP CLI

**Catch leaked secrets before they ship.** A zero-dependency command-line guardrail that scans your codebase for hardcoded API keys, tokens, private keys, and database URLs — and blocks your commit, CI build, or deploy when it finds them.

This is the prevention layer for [OverMCP](../README.md): instead of reporting a breach after a key hits a public repo, it stops the leak at the source.

## Quick start

```bash
# Scan the current directory
npx overmcp

# Scan a specific folder and only fail on critical leaks
npx overmcp ./src --fail-on critical

# Machine-readable output for tooling
npx overmcp --json
```

Exit code is `0` when clean and `1` when blocking findings are present — perfect for CI.

## Pre-commit hook

Block commits locally the moment a critical secret appears:

```bash
npx overmcp install-hook
```

This writes a `pre-commit` hook into `.git/hooks` that runs `overmcp --staged --fail-on critical`. Bypass once with `git commit --no-verify` if you really need to.

## GitHub Actions

Copy `examples/security-scan.yml` into `.github/workflows/` in your repo, or use the composite action in `action.yml`:

```yaml
- uses: your-org/overmcp/cli@main
  with:
    fail-on: high
```

## Options

| Flag | Description | Default |
| --- | --- | --- |
| `--fail-on <level>` | Exit non-zero at/above this severity: `critical`, `high`, `medium`, `none` | `high` |
| `--json` | Machine-readable JSON output | off |
| `--staged` | Only scan files staged in git (for pre-commit hooks) | off |
| `--include-ignored` | Also scan files excluded by `.gitignore` | off |
| `--quiet` | Only print output on failure | off |
| `-v, --version` | Print version | |
| `-h, --help` | Show help | |

## What it detects

AWS keys, GitHub tokens, Stripe live keys, OpenAI keys, Supabase/JWT tokens, Firebase/Google keys, private keys, database connection strings, Slack webhooks, SendGrid/Twilio/Mailgun keys, and generic high-entropy `apiKey`/`secret`/`password`/`token` assignments.

Generic matches are filtered with a Shannon-entropy check and a placeholder denylist (`example`, `your-`, `changeme`, etc.) to keep false positives low.

> `.env` files are always scanned (even when gitignored) since they are the most common leak source. On CI, `actions/checkout` only fetches committed files, so gitignored `.env` files are not present.

## Notes

- Requires Node.js >= 18.
- No network calls and no dependencies — safe to run in locked-down CI.
- Detection patterns mirror `src/lib/secrets.ts` in the main app.

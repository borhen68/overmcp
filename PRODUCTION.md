# OverMCP — Production Checklist

## Required environment variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | libSQL/Turso database URL (scans, monitors, rate limits) | **Yes** |
| `TURSO_AUTH_TOKEN` | Turso auth token | Yes (remote DB) |
| `DEEPSEEK_API_KEY` | AI security/SEO analysis + chat | **Yes** |
| `RESEND_API_KEY` | Transactional + alert emails | Yes (email features) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (links, OG, webhooks) | **Yes** |
| `CRON_SECRET` | Protects `/api/monitor/run` cron endpoint | **Yes (monitoring)** |
| `NOWPAYMENTS_API_KEY` | Crypto payments | Payments |
| `NOWPAYMENTS_IPN_SECRET` | Verifies payment webhook signatures | Payments |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth | GitHub features |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth (client) | GitHub features |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` | GitHub App auth | GitHub App |
| `VERCEL` / `NETLIFY_TOKEN` / `RAILWAY_TOKEN` | Deploy integrations | Deploy features |
| `CF_ACCOUNT_ID` / `CF_API_TOKEN` | Cloudflare Pages | Cloudflare |

## Pre-launch checklist

- [ ] **Database**: `TURSO_DATABASE_URL` points at a live, reachable DB. The dev DB currently returns `404` on writes — fix before launch (monitoring requires real persistence; it cannot fall back to in-memory).
- [ ] **Email domain**: Verify `overmcp.app` in Resend (SPF/DKIM) or change the `from:` addresses in `src/lib/email.ts`. Emails will bounce until the sending domain is verified.
- [ ] **`CRON_SECRET` set**: Without it, `/api/monitor/run` is publicly callable. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>` automatically.
- [ ] **`NEXT_PUBLIC_APP_URL`** set to the production domain.
- [ ] **Payment webhook**: Configure NOWPayments IPN callback to `${NEXT_PUBLIC_APP_URL}/api/payment/webhook` and set `NOWPAYMENTS_IPN_SECRET`.
- [ ] **Run** `npm run build` and `npx tsc --noEmit` clean.

## Hardening already applied

- **Timeouts** on every external service: DeepSeek (60s, 2 retries), chat (45s), all axios integrations via shared client `src/lib/http.ts` (30s), Octokit (20s via AbortSignal), Resend (15s via `withTimeout`).
- **SSRF protection** (`src/lib/url-guard.ts`): the crawler rejects localhost, private/reserved IP ranges, and cloud metadata endpoints (e.g. `169.254.169.254`) for the entered URL, every asset, and source maps.
- **Security headers** (`next.config.ts`): HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` disabled.
- **Payment webhook** verifies HMAC signature before granting paid access.
- **Continuous monitoring** gated behind the $29 Deploy plan.

## Known follow-ups (not blocking)

- **Rate limiting** uses in-memory state (`src/lib/rate-limit.ts`) which resets on serverless cold starts and isn't shared across instances. A DB-backed limiter (`checkRateLimit` in `src/lib/db.ts`) exists and should replace it for true production limits.
- **Redirect-based SSRF**: the host guard validates the entered/asset hosts, but a public host that 3xx-redirects to an internal IP is not re-validated mid-redirect. Consider `maxRedirects: 0` + manual hop validation if scanning untrusted inputs at scale.
- **Email unsubscribe** uses a GET link (one-click); email prefetchers could trigger it. Acceptable, but a confirm page would be safer.

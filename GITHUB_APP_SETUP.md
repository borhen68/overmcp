# GitHub App setup — always-on PR scanning

OverMCP can scan every pull request automatically and post the findings as a PR
comment. This is powered by a **GitHub App**. Follow these steps once.

## 1. Create the GitHub App

Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
(for an org: Org Settings → Developer settings).

Set:

- **GitHub App name**: anything (e.g. `overmcp-scanner`). The URL slug it
  generates is your `NEXT_PUBLIC_GITHUB_APP_NAME`.
- **Homepage URL**: your site (e.g. `https://overmcp.com`).
- **Webhook → Active**: ✅ checked
- **Webhook URL**: `https://YOUR_DOMAIN/api/github/webhook`
- **Webhook secret**: the value of `GITHUB_APP_WEBHOOK_SECRET` (already generated
  into your `.env`/`.env.local` — copy it).

### Repository permissions (least privilege — only what we need)

| Permission        | Access         | Why                                   |
| ----------------- | -------------- | ------------------------------------- |
| **Contents**      | Read-only      | Read changed files to scan them       |
| **Pull requests** | Read and write | Post / update the scan comment        |
| **Metadata**      | Read-only      | (mandatory, auto-selected)            |

Do **not** grant anything else. We never need admin, secrets, or workflow scopes.

### Subscribe to events

- ✅ **Pull request**

(That's enough for PR scanning. You can add **Push** later if you want
branch-level scanning.)

## 2. Generate credentials

On the app's page:

- **App ID** → set as `GITHUB_APP_ID`
- **Generate a private key** → downloads a `.pem`. Put its contents in
  `GITHUB_APP_PRIVATE_KEY`. In a single-line env var, replace real newlines with
  `\n` (the code normalizes `\n` back to newlines automatically).
- The app **slug** (from its URL `github.com/apps/<slug>`) → set as
  `NEXT_PUBLIC_GITHUB_APP_NAME`.

## 3. Environment variables

These must be set both locally (`.env.local`) and in **Vercel → Project →
Settings → Environment Variables**:

```
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GITHUB_APP_WEBHOOK_SECRET=...        # already generated in your .env
NEXT_PUBLIC_GITHUB_APP_NAME=your-app-slug
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
```

Redeploy after adding them in Vercel.

## 4. Install it

Either click **Install GitHub App** on `/connect`, or open
`https://github.com/apps/<slug>/installations/new`. Choose **only the repos you
want scanned** (you can pick a subset — true least privilege).

## 5. Test

Open or update a pull request in an installed repo. Within ~30s OverMCP posts (or
updates) a single comment with the findings and a link to the full report.

### Troubleshooting

- **No comment appears**: check the GitHub App → **Advanced → Recent Deliveries**
  for the webhook response. `401 Invalid signature` → the webhook secret doesn't
  match `GITHUB_APP_WEBHOOK_SECRET`. `200 {"note":"GitHub App not configured"}` →
  one of the env vars is missing on the server.
- **Comment but no findings link works**: ensure `NEXT_PUBLIC_APP_URL` is set.
- Verify the auth pieces locally: `npx tsx scripts/test-github-app.ts`.

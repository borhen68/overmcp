import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/blog";

// Single-post generation usually finishes well under this; keep headroom for
// AI latency spikes. Multi-post batches also use a soft time budget below.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Leave ~45s for the final DeepSeek call + DB write so Vercel doesn't kill
// the function mid-insert.
const SOFT_BUDGET_MS = 240_000;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Local dev without a secret configured.
  if (!secret) return true;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  // Fallback for cron providers that cannot set Authorization headers.
  const qp = req.nextUrl.searchParams.get("secret");
  return qp === secret;
}

async function handleGenerate(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Default 1 — the production cron fires 11 times/day (one post each) so we
  // never stack 11 sequential DeepSeek calls into a single 300s function.
  const rawCount = parseInt(req.nextUrl.searchParams.get("count") || "1", 10);
  const count = Number.isFinite(rawCount)
    ? Math.min(Math.max(rawCount, 1), 11)
    : 1;

  const posts: { id: string; slug: string; title: string }[] = [];
  const errors: string[] = [];
  const startedAt = Date.now();

  for (let i = 0; i < count; i++) {
    if (Date.now() - startedAt > SOFT_BUDGET_MS) {
      errors.push(
        `Stopped after ${posts.length} post(s): soft time budget reached to avoid Vercel timeout`
      );
      break;
    }

    try {
      const post = await generateBlogPost();
      if (post) {
        posts.push({ id: post.id, slug: post.slug, title: post.title });
      } else {
        errors.push(`Generation ${i + 1} returned null (duplicate slug or empty model response)`);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? `${e.message} | ${e.cause ? String(e.cause) : "no cause"} | ${e.stack?.split("\n")[1] || ""}`
          : String(e);
      console.error(`Blog generation ${i + 1} failed:`, msg);
      errors.push(msg);
    }
  }

  const envCheck = {
    hasDeepseek: !!process.env.DEEPSEEK_API_KEY,
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    hasCronSecret: !!process.env.CRON_SECRET,
  };

  return NextResponse.json({
    generated: posts.length,
    requested: count,
    posts,
    errors,
    envCheck,
    durationMs: Date.now() - startedAt,
  });
}

// Vercel Cron issues GET requests.
export async function GET(req: NextRequest) {
  return handleGenerate(req);
}

export async function POST(req: NextRequest) {
  return handleGenerate(req);
}

import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/blog";

// Generating 12 posts means 12 sequential DeepSeek calls, so allow the longest
// execution window the platform permits (Vercel caps this per plan).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function handleGenerate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = parseInt(req.nextUrl.searchParams.get("count") || "2");
  const posts = [];

  const errors: string[] = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    try {
      const post = await generateBlogPost();
      if (post) posts.push({ id: post.id, slug: post.slug, title: post.title });
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.message} | ${e.cause ? String(e.cause) : "no cause"} | ${e.stack?.split("\n")[1] || ""}` : String(e);
      console.error(`Blog generation ${i + 1} failed:`, msg);
      errors.push(msg);
    }
  }

  const envCheck = {
    hasDeepseek: !!process.env.DEEPSEEK_API_KEY,
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
  };

  return NextResponse.json({ generated: posts.length, posts, errors, envCheck });
}

export async function GET(req: NextRequest) {
  return handleGenerate(req);
}

export async function POST(req: NextRequest) {
  return handleGenerate(req);
}

import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/blog";

async function handleGenerate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = parseInt(req.nextUrl.searchParams.get("count") || "2");
  const posts = [];

  const errors: string[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    try {
      const post = await generateBlogPost();
      if (post) posts.push({ id: post.id, slug: post.slug, title: post.title });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Blog generation ${i + 1} failed:`, msg);
      errors.push(msg);
    }
  }

  return NextResponse.json({ generated: posts.length, posts, errors });
}

export async function GET(req: NextRequest) {
  return handleGenerate(req);
}

export async function POST(req: NextRequest) {
  return handleGenerate(req);
}

import { NextResponse } from "next/server";
import { getAllPostsForIndex } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await getAllPostsForIndex(500);
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([]);
  }
}

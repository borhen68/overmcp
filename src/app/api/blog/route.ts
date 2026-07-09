import { NextResponse } from "next/server";
import { getSeoPosts } from "@/lib/blog";

export async function GET() {
  try {
    const posts = await getSeoPosts();
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([]);
  }
}

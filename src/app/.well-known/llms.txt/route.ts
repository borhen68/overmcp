import { NextResponse } from "next/server";
import { buildLlmsText } from "@/lib/llms";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await buildLlmsText();
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const SECURITY_HEADERS = [
  "Content-Security-Policy",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Strict-Transport-Security",
  "Referrer-Policy",
  "Permissions-Policy",
];

function calculateGrade(presentCount: number, total: number): string {
  const ratio = presentCount / total;
  if (ratio >= 1) return "A";
  if (ratio >= 0.83) return "B";
  if (ratio >= 0.66) return "C";
  if (ratio >= 0.5) return "D";
  return "F";
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(ip, 20);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { url } = body as { url: string };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL. Please include https://" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      });
    } catch {
      // Retry with GET if HEAD fails
      try {
        response = await fetch(parsedUrl.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeout);
        return NextResponse.json(
          { error: "Could not connect to the URL. Make sure it is accessible." },
          { status: 422 }
        );
      }
    }
    clearTimeout(timeout);

    const headers = SECURITY_HEADERS.map((name) => {
      const value = response.headers.get(name.toLowerCase());
      return {
        name,
        present: value !== null,
        value: value || undefined,
      };
    });

    const presentCount = headers.filter((h) => h.present).length;
    const grade = calculateGrade(presentCount, SECURITY_HEADERS.length);

    return NextResponse.json({
      url: parsedUrl.toString(),
      headers,
      grade,
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

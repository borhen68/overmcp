import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";

export async function GET(request: NextRequest) {
  const scanId = request.nextUrl.searchParams.get("id");

  if (!scanId) {
    return new NextResponse(generateBadgeSVG("unknown", "No scan"), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
    });
  }

  let scan = getScan(scanId);
  if (!scan) {
    scan = await getScanWithDB(scanId);
  }

  if (!scan || !scan.result) {
    return new NextResponse(generateBadgeSVG("unknown", "Scan pending"), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
    });
  }

  const { critical, high } = scan.result.summary;
  let status: "secure" | "warning" | "critical";
  let label: string;

  if (critical === 0 && high === 0) {
    status = "secure";
    label = "Secure";
  } else if (critical === 0) {
    status = "warning";
    label = `${high} issues`;
  } else {
    status = "critical";
    label = `${critical} critical`;
  }

  return new NextResponse(generateBadgeSVG(status, label), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  });
}

function generateBadgeSVG(status: "secure" | "warning" | "critical" | "unknown", label: string): string {
  const colors = {
    secure: { bg: "#059669", text: "#fff" },
    warning: { bg: "#d97706", text: "#fff" },
    critical: { bg: "#dc2626", text: "#fff" },
    unknown: { bg: "#6b7280", text: "#fff" },
  };

  const c = colors[status];
  const labelWidth = Math.max(label.length * 7 + 16, 60);
  const totalWidth = 110 + labelWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
  </defs>
  <rect width="${totalWidth}" height="28" rx="6" fill="url(#bg)"/>
  <rect x="1" y="1" width="${totalWidth - 2}" height="26" rx="5" fill="none" stroke="#333" stroke-width="1"/>
  <text x="10" y="18" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#4ade80">🛡️ OverMCP</text>
  <rect x="108" y="4" width="${labelWidth}" height="20" rx="4" fill="${c.bg}"/>
  <text x="${108 + labelWidth / 2}" y="18" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="${c.text}" text-anchor="middle">${label}</text>
</svg>`;
}

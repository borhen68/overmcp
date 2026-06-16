import { NextRequest, NextResponse } from "next/server";
import { getScan, getScanWithDB } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let scan = getScan(id);
  if (!scan) {
    scan = await getScanWithDB(id);
  }

  if (!scan || !scan.result) {
    // Generic badge — no scan found or scan still pending
    const svg = generateBadge("default", "Scan your app");
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const { critical } = scan.result.summary;

  let grade: string;
  let color: "green" | "yellow" | "gray";

  if (critical === 0) {
    grade = "Grade A";
    color = "green";
  } else if (critical <= 2) {
    grade = "Grade B";
    color = "yellow";
  } else {
    grade = "Scan your app";
    color = "gray";
  }

  const svg = generateBadge(color, grade);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function generateBadge(
  color: "green" | "yellow" | "gray" | "default",
  grade: string
): string {
  const colors: Record<string, { fill: string; text: string }> = {
    green: { fill: "#22c55e", text: "#fff" },
    yellow: { fill: "#eab308", text: "#000" },
    gray: { fill: "#6b7280", text: "#fff" },
    default: { fill: "#6b7280", text: "#fff" },
  };

  const c = colors[color];
  const leftText = "Secured by OverMCP";
  const leftWidth = 138;
  const rightWidth = Math.max(grade.length * 7.2 + 20, 70);
  const totalWidth = leftWidth + rightWidth;
  const height = 20;
  const radius = 3;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="${height}" role="img" aria-label="${leftText}: ${grade}">
  <title>${leftText}: ${grade}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="${height}" rx="${radius}" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="${height}" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${c.fill}"/>
    <rect width="${totalWidth}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${leftWidth / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(leftWidth - 10) * 10}">${leftText}</text>
    <text x="${leftWidth / 2}" y="140" transform="scale(.1)" fill="#fff" textLength="${(leftWidth - 10) * 10}">${leftText}</text>
    <text aria-hidden="true" x="${(leftWidth + leftWidth + rightWidth) / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(rightWidth - 10) * 10}">${grade}</text>
    <text x="${(leftWidth + leftWidth + rightWidth) / 2}" y="140" transform="scale(.1)" fill="${c.text}" textLength="${(rightWidth - 10) * 10}">${grade}</text>
  </g>
</svg>`;
}

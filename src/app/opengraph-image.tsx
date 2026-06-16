import { ImageResponse } from "next/og";
import { Mark } from "./brand-mark";

export const alt = "OverMCP — Security scanner for AI-built apps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(1000px 500px at 20% -10%, rgba(16,185,129,0.25), transparent), #030712",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
          <Mark size={84} />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span>Over</span>
            <span style={{ color: "#34d399" }}>MCP</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: "900px",
            letterSpacing: "-0.03em",
          }}
        >
          <span>Your AI-built app is</span>
          <span style={{ color: "#f87171" }}>not secure</span>
        </div>
        <div style={{ fontSize: 30, color: "#9ca3af", marginTop: "28px", maxWidth: "820px" }}>
          Scan any site or repo for leaked secrets, vulnerabilities, CVEs &amp; SEO — fix and deploy in one click.
        </div>
      </div>
    ),
    { ...size }
  );
}

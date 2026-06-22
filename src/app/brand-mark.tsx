import React from "react";

// Renders the OverMCP mark using native fl/div elements (satori-safe — no
// embedded SVG), so it rasterizes reliably in ImageResponse at any size.
export function Mark({ size }: { size: number }) {
  const s = size;
  const dot = Math.round(s * 0.13);
  const node = (cx: number, cy: number) => ({
    position: "absolute" as const,
    width: dot,
    height: dot,
    borderRadius: dot,
    background: "#0c0a09",
    left: Math.round((cx / 40) * s - dot / 2),
    top: Math.round((cy / 40) * s - dot / 2),
  });
  const bar = Math.max(2, Math.round(s * 0.045));
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: s,
        height: s,
        borderRadius: Math.round(s * 0.28),
        background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%)",
      }}
    >
      {/* connecting bar between the two lower nodes */}
      <div
        style={{
          position: "absolute",
          height: bar,
          width: Math.round((13 / 40) * s),
          background: "#0c0a09",
          borderRadius: bar,
          left: Math.round((13.5 / 40) * s),
          top: Math.round((24 / 40) * s - bar / 2),
        }}
      />
      <div style={node(20, 13)} />
      <div style={node(13.5, 24)} />
      <div style={node(26.5, 24)} />
    </div>
  );
}

export default Mark;

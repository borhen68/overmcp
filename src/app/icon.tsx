import { ImageResponse } from "next/og";
import { Mark } from "./brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a09",
        }}
      >
        <Mark size={30} />
      </div>
    ),
    { ...size }
  );
}

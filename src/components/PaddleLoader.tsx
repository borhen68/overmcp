"use client";

import Script from "next/script";

export default function PaddleLoader() {
  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={() => {
        const Paddle = (window as unknown as { Paddle?: { Environment: { set: (env: string) => void }; Initialize: (opts: Record<string, unknown>) => void } }).Paddle;
        if (Paddle) {
          if (process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true") {
            Paddle.Environment.set("sandbox");
          }
          Paddle.Initialize({ token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN });
        }
      }}
    />
  );
}

import React from "react";

export function LogoMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="omcp-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path
        d="M20 2.5l13 4.6v9.4c0 8.6-5.4 16.3-13 18.9C12.4 32.8 7 25.1 7 16.5V7.1L20 2.5z"
        fill="url(#omcp-grad)"
        fillOpacity="0.18"
        stroke="url(#omcp-grad)"
        strokeWidth="1.6"
      />
      {/* Connected-node "MCP" motif */}
      <circle cx="20" cy="13" r="2.4" fill="url(#omcp-grad)" />
      <circle cx="13.5" cy="23.5" r="2.4" fill="url(#omcp-grad)" />
      <circle cx="26.5" cy="23.5" r="2.4" fill="url(#omcp-grad)" />
      <path
        d="M20 13L13.5 23.5M20 13l6.5 10.5M13.5 23.5h13"
        stroke="url(#omcp-grad)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  markClass = "w-9 h-9",
  textClass = "text-lg",
}: {
  className?: string;
  markClass?: string;
  textClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClass} />
      <span className={`font-semibold tracking-tight ${textClass}`}>
        Over<span className="text-emerald-400">MCP</span>
      </span>
    </span>
  );
}

export default Logo;

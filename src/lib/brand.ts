// Standalone SVG of the OverMCP mark (filled, reads well at favicon sizes).
// Used by app/icon.tsx and app/opengraph-image.tsx via a data URI.
export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop stop-color="#34d399"/>
      <stop offset="0.55" stop-color="#10b981"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#g)"/>
  <circle cx="20" cy="13" r="2.6" fill="#04130d"/>
  <circle cx="13.5" cy="24" r="2.6" fill="#04130d"/>
  <circle cx="26.5" cy="24" r="2.6" fill="#04130d"/>
  <path d="M20 13L13.5 24M20 13l6.5 11M13.5 24h13" stroke="#04130d" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

export const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

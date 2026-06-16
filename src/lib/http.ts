import axios from "axios";

// Shared HTTP client with a hard timeout so no external API (Vercel, Netlify,
// Cloudflare, Railway, NOWPayments, etc.) can hang a request indefinitely.
const http = axios.create({
  timeout: 30_000,
  headers: { "User-Agent": "OverMCP/1.0" },
});

export default http;

// Generic timeout wrapper for SDKs that don't expose a timeout option
// (e.g. Resend, Octokit). Rejects if the promise doesn't settle in time.
export function withTimeout<T>(promise: Promise<T>, ms = 15_000, label = "operation"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

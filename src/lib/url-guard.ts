import { lookup } from "node:dns/promises";
import net from "node:net";

// SSRF protection. This service fetches arbitrary user-supplied URLs, so we must
// reject anything that points at localhost, private networks, or cloud metadata
// endpoints (e.g. 169.254.169.254) before making any request.

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function ipToLong(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function inRange(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

const BLOCKED_V4_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local + cloud metadata (169.254.169.254)
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
];

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return BLOCKED_V4_RANGES.some((cidr) => inRange(ip, cidr));
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80") || lower.startsWith("fec0")) return true; // link/site-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true; // unknown format → treat as unsafe
}

/**
 * Validates a user-supplied URL and rejects SSRF vectors.
 * Returns the normalized URL string on success; throws UnsafeUrlError otherwise.
 */
export async function assertSafeUrl(input: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal"
  ) {
    throw new UnsafeUrlError("Refusing to scan internal/loopback hosts");
  }

  // Literal IP in the hostname.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new UnsafeUrlError("Refusing to scan private/reserved IPs");
    return url.toString();
  }

  // Resolve DNS and reject if it points at a private/reserved address.
  try {
    const records = await lookup(hostname, { all: true });
    if (records.length === 0) throw new UnsafeUrlError("Host did not resolve");
    for (const { address } of records) {
      if (isPrivateIp(address)) {
        throw new UnsafeUrlError("Host resolves to a private/reserved IP");
      }
    }
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw e;
    throw new UnsafeUrlError("Could not resolve host");
  }

  return url.toString();
}

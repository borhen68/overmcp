import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import * as tls from "tls";

interface CertResult {
  valid: boolean;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  protocol: string;
}

function checkSSL(domain: string): Promise<CertResult> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        timeout: 10000,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol() || "unknown";

        if (!cert || !cert.subject) {
          socket.destroy();
          reject(new Error("No certificate returned"));
          return;
        }

        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const daysRemaining = Math.floor(
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        const isValid = socket.authorized && daysRemaining > 0;

        const rawIssuer = cert.issuer
          ? cert.issuer.O || cert.issuer.CN || "Unknown"
          : "Unknown";
        const issuer = Array.isArray(rawIssuer) ? rawIssuer[0] : rawIssuer;

        const rawSubject = cert.subject
          ? cert.subject.CN || cert.subject.O || "Unknown"
          : "Unknown";
        const subject = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;

        socket.destroy();

        resolve({
          valid: isValid,
          issuer,
          subject,
          validFrom: validFrom.toISOString(),
          validTo: validTo.toISOString(),
          daysRemaining,
          protocol,
        });
      }
    );

    socket.on("error", (err) => {
      socket.destroy();
      reject(err);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timed out"));
    });
  });
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(ip, 20);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    let { domain } = body as { domain: string };

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Strip protocol and path if provided
    domain = domain.replace(/^https?:\/\//, "").split("/")[0].trim();

    if (!domain || domain.includes(" ")) {
      return NextResponse.json(
        { error: "Invalid domain" },
        { status: 400 }
      );
    }

    const result = await checkSSL(domain);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not connect to domain";
    return NextResponse.json(
      { error: `SSL check failed: ${message}` },
      { status: 422 }
    );
  }
}

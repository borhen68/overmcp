import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/lib/rate-limit";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://api.deepseek.com",
      apiKey: process.env.DEEPSEEK_API_KEY,
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return _client;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const { allowed } = rateLimit(ip, 3, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { url, vulnerabilities, secrets } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const domain = (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();

    const vulnContext = (vulnerabilities || [])
      .slice(0, 5)
      .map((v: { severity: string; type: string; file: string; description: string; line?: number }) =>
        `- [${v.severity.toUpperCase()}] ${v.type} in ${v.file}${v.line ? `:${v.line}` : ""}: ${v.description}`
      )
      .join("\n");

    const secretContext = (secrets || [])
      .slice(0, 3)
      .map((s: { type: string; file: string; snippet: string; severity: string }) =>
        `- [${s.severity.toUpperCase()}] ${s.type} found in ${s.file}: ${s.snippet.slice(0, 40)}...`
      )
      .join("\n");

    const response = await getClient().chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an expert penetration tester writing a realistic attack simulation script for a security awareness tool.

Generate a cinematic, step-by-step terminal attack sequence that shows how a real attacker would exploit the vulnerabilities found in a target website. This is for EDUCATIONAL purposes to scare users into fixing their security issues.

RULES:
1. Output ONLY a JSON array of terminal lines. Each line has: {"text": "string", "color": "green|amber|red|white|cyan|dim", "delay": number|null}
2. Use the REAL data provided (URLs, file paths, key types) — don't make up different ones
3. Partially redact any secrets: show first 4 and last 4 characters, replace middle with ****
4. Structure as 4 phases: RECONNAISSANCE → DISCOVERY → EXPLOITATION → IMPACT
5. Phase headers use color "cyan" and have delay: 500
6. Commands (lines starting with $ or >) use color "green"
7. Discovered sensitive data uses color "amber"
8. Exploitation/damage lines use color "red"
9. Regular output uses color "white"
10. Empty spacing lines use {"text": "", "color": "dim"}
11. Make it feel REAL — use actual hacking tools (curl, nmap, sqlmap, nuclei, ffuf, etc.)
12. The exploitation should be SPECIFIC to the actual vulnerability types found
13. End with a damage assessment showing time-to-exploit, skill level needed, and what data was compromised
14. Keep it 40-70 lines total
15. Make the attacker feel skilled but the attack feel EASY — this scares users into paying
16. Last line should be {"text": "─── SIMULATION COMPLETE ───", "color": "cyan", "delay": 400}`,
        },
        {
          role: "user",
          content: `Target: ${url}
Domain: ${domain}

VULNERABILITIES FOUND:
${vulnContext || "No specific vulnerabilities detected"}

SECRET LEAKS FOUND:
${secretContext || "No secrets detected"}

Generate a realistic, terrifying attack simulation using this REAL data. Make it specific to these exact findings.`,
        },
      ],
      temperature: 0.9,
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    const lines = Array.isArray(parsed) ? parsed : parsed.lines || parsed.script || [];

    return NextResponse.json({ lines });
  } catch (e) {
    console.error("Simulation generation failed:", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

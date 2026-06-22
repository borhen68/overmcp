// Safety-gate tests. Run: npx tsx scripts/test-fix-verify.ts
// These prove the auto-fix can NEVER overwrite a file with a snippet,
// truncated, empty, or structurally broken content.
import { validateReplacement, bracketsBalanced, stripFences } from "../src/lib/fix-verify";

const ORIGINAL = `import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  const id = req.query.id;
  const rows = await db.query("SELECT * FROM users WHERE id = " + id);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();
  return NextResponse.json({ ok: true });
}
`;

interface Case { label: string; proposed: string; file: string; expectSafe: boolean; }

const CASES: Case[] = [
  {
    label: "Good full-file fix (parameterized query)",
    file: "route.ts",
    expectSafe: true,
    proposed: `import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  const id = req.query.id;
  const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();
  return NextResponse.json({ ok: true });
}
`,
  },
  {
    label: "DANGER: snippet pushed as whole file (the old bug)",
    file: "route.ts",
    expectSafe: false,
    proposed: `const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);`,
  },
  {
    label: "DANGER: empty content",
    file: "route.ts",
    expectSafe: false,
    proposed: "",
  },
  {
    label: "DANGER: truncated mid-function (unbalanced braces)",
    file: "route.ts",
    expectSafe: false,
    proposed: `import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  const id = req.query.id;
  const rows = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();
`,
  },
  {
    label: "DANGER: prose instead of code",
    file: "route.ts",
    expectSafe: false,
    proposed: `Here is the fixed file with parameterized queries applied to prevent SQL injection.`,
  },
  {
    label: "DANGER: dropped all imports/structure",
    file: "route.ts",
    expectSafe: false,
    proposed: `function GET(req) { return 1; }
function POST(req) { return 2; }
function extra(a) { return a; }
function more(b) { return b; }
function evenmore(c) { return c; }`,
  },
  {
    label: "OK: model wrapped output in code fences",
    file: "route.ts",
    expectSafe: true,
    proposed: "```ts\n" + ORIGINAL.replace('+ id', "?", ) + "```",
  },
];

let pass = 0, fail = 0;
console.log("\n=== FIX SAFETY GATE ===");
for (const c of CASES) {
  const v = validateReplacement(ORIGINAL, c.proposed, c.file);
  const ok = v.safe === c.expectSafe;
  if (ok) { pass++; console.log(`  ✅ ${c.label}${v.reason ? ` — (${v.reason})` : ""}`); }
  else { fail++; console.log(`  ❌ ${c.label} — expected safe=${c.expectSafe}, got ${v.safe} (${v.reason || "ok"})`); }
}

// Direct bracket-balancer sanity checks (incl. template literals + regex-ish).
console.log("\n=== BRACKET BALANCER ===");
const bb: [string, boolean][] = [
  ["const x = `hello ${a + (b)} world`;", true],
  ["const s = '})]';", true],
  ["function f() { return { a: [1,2] }; }", true],
  ["function f() { return {", false],
  ["const c = `${ {x:1} }`;", true],
  ["// } } }\nconst a = 1;", true],
];
for (const [src, expect] of bb) {
  const got = bracketsBalanced(src);
  if (got === expect) { pass++; console.log(`  ✅ ${JSON.stringify(src)}`); }
  else { fail++; console.log(`  ❌ ${JSON.stringify(src)} — expected ${expect}, got ${got}`); }
}

// stripFences sanity
if (stripFences("```js\nconst a=1;\n```") === "const a=1;") { pass++; console.log("\n  ✅ stripFences"); }
else { fail++; console.log("\n  ❌ stripFences"); }

const total = pass + fail;
console.log(`\n=== RESULT: ${pass}/${total} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

// Plain-English summary tests. Run: npx tsx scripts/test-summary.ts
import { buildPlainSummary } from "../src/lib/summary";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label}`); }
}

const secrets = buildPlainSummary({ secretLeaks: 2, critical: 0, high: 1 });
check("secrets → danger tone", secrets.tone === "danger");
check("secrets → headline mentions secrets", /secret/i.test(secrets.headline));
check("secrets → first action is rotate", /rotate/i.test(secrets.actions[0]));
check("secrets → score heavily reduced", secrets.score <= 50);

const critical = buildPlainSummary({ critical: 3, high: 2, totalCVEs: 1 });
check("critical → danger tone", critical.tone === "danger");
check("critical → paragraph mentions critical", /critical/i.test(critical.paragraph));

const warning = buildPlainSummary({ critical: 0, high: 2, medium: 1 });
check("high only → warning tone", warning.tone === "warning");

const clean = buildPlainSummary({ critical: 0, high: 0, medium: 0, secretLeaks: 0, totalCVEs: 0 });
check("clean → good tone", clean.tone === "good");
check("clean → score 100", clean.score === 100);
check("clean → reassuring paragraph", clean.paragraph.length > 20);
check("clean → has at least one action", clean.actions.length >= 1);

check("actions capped at 4", buildPlainSummary({ secretLeaks: 1, critical: 1, high: 1, medium: 1, totalCVEs: 1 }).actions.length <= 4);

const total = pass + fail;
console.log(`\n=== RESULT: ${pass}/${total} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);

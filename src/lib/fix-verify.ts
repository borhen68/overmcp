// Safety gate for auto-generated fixes.
//
// The cardinal rule: NEVER open a PR that could break a user's app. The old
// code pushed an LLM snippet as the *entire* file content — catastrophic. This
// module validates that a proposed replacement is a plausible full-file rewrite
// (not a fragment, not truncated, structurally balanced) before it is allowed
// anywhere near a commit. It is intentionally conservative: when in doubt, the
// fix is REJECTED. Shipping fewer correct fixes beats shipping one that wrecks
// a repo.

export interface FixValidation {
  safe: boolean;
  reason?: string;
}

const CODE_EXTS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte",
  "py", "rb", "go", "rs", "php", "java", "c", "cpp", "cs",
]);

function ext(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// Strip a leading/trailing markdown code fence if the model wrapped its output.
export function stripFences(content: string): string {
  let c = content.trim();
  const fence = c.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/);
  if (fence) c = fence[1];
  return c;
}

// "Anchor" lines are structural landmarks that a faithful full-file rewrite
// should preserve: imports, exports, declarations. A snippet or a truncated
// file loses most of them — that's our strongest signal against destruction.
const ANCHOR_RE =
  /^\s*(import\s|export\s|from\s+['"]|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|function\s|class\s|def\s|require\s*\(|module\.exports|package\s|use\s|fn\s)/;

function extractAnchors(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => ANCHOR_RE.test(l));
}

// String/comment-aware bracket balance for C-family / JS-family code.
// Handles // and /* */ comments, ' " ` strings (with escapes) and ${} inside
// template literals. Returns true if (), [], {} are all balanced.
export function bracketsBalanced(src: string): boolean {
  let round = 0, square = 0, curly = 0;
  let i = 0;
  const n = src.length;
  // template literal expression depth stack to know when `${ ... }` closes
  const templateStack: number[] = [];

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    // line comment
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    // block comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // single / double quoted strings
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    // template literal
    if (ch === "`") {
      i++;
      while (i < n && src[i] !== "`") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          // enter expression — track curly depth so the matching } returns us
          templateStack.push(curly);
          curly++;
          i += 2;
          // fall through to normal scanning of the expression
          break;
        }
        i++;
      }
      // if we hit the closing backtick (not an expression), consume it
      if (i < n && src[i] === "`") { i++; }
      continue;
    }

    if (ch === "(") round++;
    else if (ch === ")") round--;
    else if (ch === "[") square++;
    else if (ch === "]") square--;
    else if (ch === "{") curly++;
    else if (ch === "}") {
      curly--;
      // closing a template expression?
      if (templateStack.length && curly === templateStack[templateStack.length - 1]) {
        templateStack.pop();
        i++;
        // resume scanning the rest of the template literal
        while (i < n && src[i] !== "`") {
          if (src[i] === "\\") { i += 2; continue; }
          if (src[i] === "$" && src[i + 1] === "{") {
            templateStack.push(curly);
            curly++;
            i += 2;
            break;
          }
          i++;
        }
        if (i < n && src[i] === "`") i++;
        continue;
      }
    }

    if (round < 0 || square < 0 || curly < 0) return false;
    i++;
  }

  return round === 0 && square === 0 && curly === 0;
}

export function validateReplacement(
  original: string,
  proposed: string,
  filename: string
): FixValidation {
  const fixed = stripFences(proposed);

  if (!fixed || fixed.trim().length === 0) {
    return { safe: false, reason: "Proposed fix is empty." };
  }

  // The model returned prose instead of code.
  if (/^(here('s| is)|sure|certainly|i('ve| have)|below is|the fixed)/i.test(fixed.trim())) {
    return { safe: false, reason: "Proposed fix looks like prose, not file content." };
  }

  const e = ext(filename);
  const isCode = CODE_EXTS.has(e);

  // Snippet-as-file guard: a real full-file rewrite is not a fraction of the
  // original. (Skip for tiny files where ratios are noisy.)
  if (original.length > 400 && fixed.length < original.length * 0.5) {
    return {
      safe: false,
      reason: `Proposed fix is only ${Math.round((fixed.length / original.length) * 100)}% the size of the original — likely a snippet, not a full file.`,
    };
  }

  if (isCode) {
    const origAnchors = extractAnchors(original);
    if (origAnchors.length >= 3) {
      const fixedSet = new Set(extractAnchors(fixed));
      const kept = origAnchors.filter((a) => fixedSet.has(a)).length;
      const ratio = kept / origAnchors.length;
      if (ratio < 0.7) {
        return {
          safe: false,
          reason: `Fix dropped too much structure (kept ${kept}/${origAnchors.length} imports/declarations) — refusing to overwrite.`,
        };
      }
    }

    // Only run the bracket balancer for brace-family languages.
    if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "go", "rs", "php", "java", "c", "cpp", "cs"].includes(e)) {
      if (!bracketsBalanced(fixed)) {
        return { safe: false, reason: "Proposed fix has unbalanced brackets — likely truncated or malformed." };
      }
    }
  }

  return { safe: true };
}

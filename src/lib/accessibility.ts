export interface A11yIssue {
  rule: string;
  severity: "critical" | "serious" | "moderate" | "minor";
  element: string;
  description: string;
  fix: string;
  wcag: string;
}

export interface AccessibilityResult {
  score: number;
  totalIssues: number;
  issues: A11yIssue[];
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export function analyzeAccessibility(files: { name: string; content: string }[]): AccessibilityResult {
  const issues: A11yIssue[] = [];

  const htmlFiles = files.filter(
    (f) => f.name.endsWith(".html") || f.name.endsWith(".tsx") || f.name.endsWith(".jsx") || f.name.endsWith(".vue") || f.name.endsWith(".svelte")
  );

  for (const file of htmlFiles) {
    const content = file.content;

    // Images without alt
    const imgNoAlt = content.match(/<img(?![^>]*alt=)[^>]*>/gi);
    if (imgNoAlt) {
      issues.push({
        rule: "img-alt",
        severity: "critical",
        element: imgNoAlt[0].substring(0, 80),
        description: `${imgNoAlt.length} image(s) missing alt attribute in ${file.name}`,
        fix: "Add descriptive alt text to all <img> tags. Use alt=\"\" for decorative images.",
        wcag: "WCAG 1.1.1 (Level A)",
      });
    }

    // Buttons without accessible text
    const emptyButtons = content.match(/<button[^>]*>[\s]*(?:<(?:svg|img|i|span)[^>]*\/?>[^<]*)*<\/button>/gi);
    if (emptyButtons) {
      const withoutLabel = emptyButtons.filter(
        (b) => !b.includes("aria-label") && !b.includes("aria-labelledby") && !b.match(/>[^<]*\w+[^<]*</)
      );
      if (withoutLabel.length > 0) {
        issues.push({
          rule: "button-name",
          severity: "critical",
          element: withoutLabel[0].substring(0, 80),
          description: `${withoutLabel.length} button(s) without accessible name in ${file.name}`,
          fix: "Add aria-label or visible text content to buttons. Icon-only buttons need aria-label.",
          wcag: "WCAG 4.1.2 (Level A)",
        });
      }
    }

    // Links without href or text
    const emptyLinks = content.match(/<a[^>]*>[\s]*<\/a>/gi);
    if (emptyLinks) {
      issues.push({
        rule: "link-name",
        severity: "serious",
        element: emptyLinks[0],
        description: `${emptyLinks.length} empty link(s) in ${file.name}`,
        fix: "Add descriptive text content or aria-label to all links.",
        wcag: "WCAG 2.4.4 (Level A)",
      });
    }

    // Form inputs without labels
    const inputsNoLabel = content.match(/<input(?![^>]*aria-label)[^>]*(?<!type=['"](?:hidden|submit|button|reset)['"])[^>]*>/gi);
    if (inputsNoLabel) {
      const withoutId = inputsNoLabel.filter((inp) => !inp.includes("id=") && !inp.includes("aria-label"));
      if (withoutId.length > 0) {
        issues.push({
          rule: "input-label",
          severity: "serious",
          element: withoutId[0].substring(0, 80),
          description: `${withoutId.length} form input(s) without associated label in ${file.name}`,
          fix: "Add <label for=\"id\"> or aria-label to all form inputs.",
          wcag: "WCAG 1.3.1 (Level A)",
        });
      }
    }

    // Missing lang attribute
    if (content.includes("<html") && !content.match(/<html[^>]*lang=/i)) {
      issues.push({
        rule: "html-lang",
        severity: "serious",
        element: "<html>",
        description: `Missing lang attribute on <html> in ${file.name}`,
        fix: 'Add lang="en" (or appropriate language) to the <html> tag.',
        wcag: "WCAG 3.1.1 (Level A)",
      });
    }

    // Missing document title
    if (content.includes("<head") && !content.includes("<title")) {
      issues.push({
        rule: "document-title",
        severity: "serious",
        element: "<head>",
        description: `Missing <title> element in ${file.name}`,
        fix: "Add a descriptive <title> element inside <head>.",
        wcag: "WCAG 2.4.2 (Level A)",
      });
    }

    // Color contrast (heuristic: text on very low opacity backgrounds)
    const lowContrastPatterns = content.match(/text-gray-[6-9]00|text-white\/[1-3]0|opacity-[1-3]0/g);
    if (lowContrastPatterns && lowContrastPatterns.length > 3) {
      issues.push({
        rule: "color-contrast",
        severity: "moderate",
        element: "Multiple elements",
        description: `Potential low contrast text found (${lowContrastPatterns.length} instances) in ${file.name}`,
        fix: "Ensure text has at least 4.5:1 contrast ratio against its background. Use darker text colors.",
        wcag: "WCAG 1.4.3 (Level AA)",
      });
    }

    // Missing heading hierarchy
    const headings = content.match(/<h[1-6][^>]*>/gi) || [];
    const levels = headings.map((h) => parseInt(h.charAt(2)));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        issues.push({
          rule: "heading-order",
          severity: "moderate",
          element: `h${levels[i - 1]} → h${levels[i]}`,
          description: `Skipped heading level (h${levels[i - 1]} to h${levels[i]}) in ${file.name}`,
          fix: "Don't skip heading levels. After h2, use h3, not h4.",
          wcag: "WCAG 1.3.1 (Level A)",
        });
        break;
      }
    }

    // No skip navigation
    if (content.includes("<nav") && !content.match(/skip|#main|#content/i)) {
      issues.push({
        rule: "skip-nav",
        severity: "moderate",
        element: "<nav>",
        description: `No skip navigation link found in ${file.name}`,
        fix: 'Add a "Skip to content" link as the first focusable element.',
        wcag: "WCAG 2.4.1 (Level A)",
      });
    }

    // Autoplaying media
    if (content.match(/<(?:video|audio)[^>]*autoplay/i)) {
      issues.push({
        rule: "no-autoplay",
        severity: "moderate",
        element: "<video autoplay> or <audio autoplay>",
        description: `Auto-playing media found in ${file.name}`,
        fix: "Don't autoplay media, or ensure it has controls and can be paused.",
        wcag: "WCAG 1.4.2 (Level A)",
      });
    }

    // Missing focus styles (if outline-none without focus-visible replacement)
    const outlineNone = (content.match(/outline-none|outline:\s*none/g) || []).length;
    const focusVisible = (content.match(/focus-visible|focus:/g) || []).length;
    if (outlineNone > focusVisible + 2) {
      issues.push({
        rule: "focus-visible",
        severity: "serious",
        element: "CSS styles",
        description: `Focus outlines removed without replacement (${outlineNone} removals, ${focusVisible} replacements) in ${file.name}`,
        fix: "Don't remove outline without adding a visible focus indicator (e.g., ring, border, or box-shadow on :focus-visible).",
        wcag: "WCAG 2.4.7 (Level AA)",
      });
    }

    // Missing aria-live for dynamic content
    if (content.match(/useState|useEffect|loading|spinner/i) && !content.includes("aria-live")) {
      issues.push({
        rule: "aria-live",
        severity: "minor",
        element: "Dynamic content",
        description: `Dynamic content without aria-live region in ${file.name}`,
        fix: 'Add aria-live="polite" to containers that update dynamically (loading states, notifications).',
        wcag: "WCAG 4.1.3 (Level AA)",
      });
    }
  }

  const summary = {
    critical: issues.filter((i) => i.severity === "critical").length,
    serious: issues.filter((i) => i.severity === "serious").length,
    moderate: issues.filter((i) => i.severity === "moderate").length,
    minor: issues.filter((i) => i.severity === "minor").length,
  };

  const score = Math.max(
    0,
    100 - summary.critical * 20 - summary.serious * 10 - summary.moderate * 5 - summary.minor * 2
  );

  return {
    score,
    totalIssues: issues.length,
    issues,
    summary,
  };
}

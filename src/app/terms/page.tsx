import type { Metadata } from "next";
import LegalLayout from "../legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "OverMCP Terms of Service.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 2026">
      <p>
        These Terms govern your use of OverMCP (the &quot;Service&quot;). By using the Service you agree to
        them. This is a template starting point and not legal advice — have it reviewed before launch.
      </p>

      <section>
        <h2>1. The Service</h2>
        <p>
          OverMCP scans websites and code repositories you submit for security, dependency, SEO, and
          related issues, and may generate fixes or deploy changes when you connect a platform. Results
          are provided on a best-effort basis and may contain false positives or miss issues.
        </p>
      </section>

      <section>
        <h2>2. Authorized use</h2>
        <ul>
          <li>You may only scan websites and repositories that you own or are authorized to test.</li>
          <li>You must not use the Service to attack, overload, or gain unauthorized access to systems.</li>
          <li>You are responsible for all activity performed under your account or submissions.</li>
        </ul>
      </section>

      <section>
        <h2>3. Payments</h2>
        <p>
          Paid tiers are charged in cryptocurrency via NOWPayments. Crypto payments are generally
          non-reversible; refunds, if any, are at our discretion. Prices are shown before purchase.
        </p>
      </section>

      <section>
        <h2>4. No warranty</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that
          your application is secure, compliant, or free of vulnerabilities after using the Service.
        </p>
      </section>

      <section>
        <h2>5. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, OverMCP is not liable for any indirect, incidental, or
          consequential damages arising from your use of the Service.
        </p>
      </section>

      <section>
        <h2>6. Changes</h2>
        <p>
          We may update these Terms. Continued use after changes constitutes acceptance. Contact:{" "}
          <a className="text-emerald-400 hover:underline" href="mailto:support@overmcp.com">
            support@overmcp.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}

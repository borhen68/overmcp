import type { Metadata } from "next";
import LegalLayout from "../legal/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "OverMCP Privacy Policy.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 2026">
      <p>
        This Policy explains what data OverMCP collects and how it is used. This is a template starting
        point and not legal advice — have it reviewed before launch.
      </p>

      <section>
        <h2>1. Data we collect</h2>
        <ul>
          <li><strong>Scan inputs:</strong> URLs and repositories you submit, and the public code/content fetched from them.</li>
          <li><strong>Scan results:</strong> findings, scores, and reports generated from your submissions.</li>
          <li><strong>Contact:</strong> your email address when you request a report or enable monitoring.</li>
          <li><strong>Payments:</strong> payment identifiers from NOWPayments. We do not store card or wallet credentials.</li>
          <li><strong>Connected platforms:</strong> OAuth tokens you authorize (GitHub, Vercel, Netlify, etc.), used only to perform actions you request.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use data</h2>
        <ul>
          <li>To run scans, generate reports, and deliver fixes/deploys you request.</li>
          <li>To send transactional and monitoring-alert emails (via Resend).</li>
          <li>To process payments and unlock paid features.</li>
        </ul>
      </section>

      <section>
        <h2>3. Third-party processors</h2>
        <p>
          We share data with service providers strictly to operate the Service: DeepSeek (AI analysis),
          Turso (database), Resend (email), NOWPayments (payments), and your connected hosting/Git
          platforms. Submitted code may be sent to the AI provider for analysis.
        </p>
      </section>

      <section>
        <h2>4. Retention</h2>
        <p>
          Scan records and monitoring configurations are retained to provide the Service. You can request
          deletion of your data or stop monitoring at any time.
        </p>
      </section>

      <section>
        <h2>5. Your rights & contact</h2>
        <p>
          To request access or deletion of your data, contact{" "}
          <a className="text-emerald-400 hover:underline" href="mailto:privacy@overmcp.com">
            privacy@overmcp.com
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}

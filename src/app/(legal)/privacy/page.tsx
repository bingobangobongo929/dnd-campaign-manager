import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Multiloop - Learn how we collect, use, and protect your personal data.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 20, 2026'

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <header className="not-prose mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
        <p className="text-gray-400">Last updated: {lastUpdated}</p>
      </header>

      <section>
        <h2>1. Introduction</h2>
        <p>
          Welcome to Multiloop. We respect your privacy and are committed to protecting your personal data.
          This privacy policy explains how we collect, use, and safeguard your information when you use our
          tabletop role-playing game (TTRPG) campaign management service.
        </p>
        <p>
          Multiloop is operated by an individual based in the European Union. We are committed to complying
          with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
        </p>
      </section>

      <section>
        <h2>2. Data Controller</h2>
        <p>
          The data controller responsible for your personal data is the individual operator of Multiloop.
          For any privacy-related inquiries, please contact us at:{' '}
          <a href="mailto:contact@multiloop.app" className="text-[--arcane-purple]">contact@multiloop.app</a>
        </p>
      </section>

      <section>
        <h2>3. Data We Collect</h2>

        <h3>3.1 Account Data</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Password (stored as a secure hash, never in plain text)</li>
          <li>Account creation date</li>
        </ul>

        <h3>3.2 Profile and Content Data</h3>
        <p>When you use Multiloop, you may provide:</p>
        <ul>
          <li>Campaign information (names, descriptions, settings)</li>
          <li>Character data (names, descriptions, images, attributes)</li>
          <li>Session notes and logs</li>
          <li>User preferences and settings</li>
          <li>Images you upload</li>
        </ul>

        <h3>3.3 Usage Data</h3>
        <p>We automatically collect anonymized usage data through privacy-focused analytics, including:</p>
        <ul>
          <li>Pages visited (anonymized)</li>
          <li>Feature usage patterns (anonymized)</li>
          <li>Device type and browser (anonymized)</li>
        </ul>
        <p>
          We use <strong>Umami Analytics</strong>, a privacy-focused analytics solution that does not use
          cookies and does not collect personally identifiable information.
        </p>

        <h3>3.4 Technical Data</h3>
        <p>For security purposes only, we may temporarily process:</p>
        <ul>
          <li>IP addresses (for abuse prevention and security)</li>
          <li>Authentication tokens</li>
        </ul>
      </section>

      <section>
        <h2>4. Legal Basis for Processing</h2>
        <p>We process your personal data based on the following legal grounds:</p>
        <ul>
          <li>
            <strong>Consent:</strong> When you create an account and agree to our Terms of Service and this
            Privacy Policy.
          </li>
          <li>
            <strong>Contract:</strong> To provide you with the Multiloop service as outlined in our Terms of
            Service.
          </li>
          <li>
            <strong>Legitimate Interest:</strong> For security purposes, fraud prevention, and service
            improvement.
          </li>
          <li>
            <strong>Legal Obligation:</strong> When required by applicable laws and regulations.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. How We Use Your Data</h2>
        <p>We use your personal data to:</p>
        <ul>
          <li>Provide and maintain the Multiloop service</li>
          <li>Authenticate your identity and manage your account</li>
          <li>Store and display your campaigns, characters, and other content</li>
          <li>Send essential service communications (e.g., password resets, security alerts)</li>
          <li>Improve our service based on anonymized usage patterns</li>
          <li>Ensure the security and integrity of our platform</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <ul>
          <li>
            <strong>Active Accounts:</strong> We retain your data for as long as your account is active.
          </li>
          <li>
            <strong>Deleted Accounts:</strong> When you delete your account, your data is marked for deletion
            and permanently removed within 30 days. You may request immediate permanent deletion.
          </li>
          <li>
            <strong>Backup Data:</strong> Backups containing your data may be retained for up to 30 days
            after account deletion for disaster recovery purposes.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. Your Rights Under GDPR</h2>
        <p>As a data subject under the GDPR, you have the following rights:</p>

        <h3>7.1 Right of Access (Article 15)</h3>
        <p>
          You have the right to request a copy of all personal data we hold about you. You can export your
          data at any time from your account settings.
        </p>

        <h3>7.2 Right to Rectification (Article 16)</h3>
        <p>
          You have the right to correct any inaccurate personal data. You can update your profile and content
          directly within the application.
        </p>

        <h3>7.3 Right to Erasure (Article 17)</h3>
        <p>
          You have the right to request deletion of your personal data. You can delete your account from your
          account settings, which will remove all associated data.
        </p>

        <h3>7.4 Right to Data Portability (Article 20)</h3>
        <p>
          You have the right to receive your personal data in a structured, commonly used, machine-readable
          format (JSON). You can export all your data from your account settings.
        </p>

        <h3>7.5 Right to Restriction of Processing (Article 18)</h3>
        <p>
          You have the right to request restriction of processing in certain circumstances. Contact us to
          exercise this right.
        </p>

        <h3>7.6 Right to Object (Article 21)</h3>
        <p>
          You have the right to object to processing based on legitimate interests. Contact us to exercise
          this right.
        </p>

        <h3>7.7 Right to Withdraw Consent</h3>
        <p>
          Where processing is based on consent, you may withdraw your consent at any time by deleting your
          account or contacting us.
        </p>

        <h3>7.8 Right to Lodge a Complaint</h3>
        <p>
          You have the right to lodge a complaint with a supervisory authority if you believe your rights
          have been violated.
        </p>

        <p className="mt-6">
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:contact@multiloop.app" className="text-[--arcane-purple]">contact@multiloop.app</a>
          {' '}or use the relevant features in your account settings.
        </p>
      </section>

      <section>
        <h2>8. Infrastructure and Service Providers</h2>
        <p>
          To provide the Service, we use trusted third-party infrastructure providers. These providers
          process your data only as necessary to deliver their services to us, and are bound by
          data processing agreements. We do not sell or share your data with third parties for
          their own purposes.
        </p>

        <h3>8.1 Infrastructure Providers</h3>
        <ul>
          <li>
            <strong>Supabase:</strong> Database and authentication services (data stored in EU region)
          </li>
          <li>
            <strong>Vercel:</strong> Application hosting
          </li>
          <li>
            <strong>Cloudflare:</strong> CDN and security services
          </li>
          <li>
            <strong>Sentry:</strong> Error tracking and performance monitoring (helps us identify and fix bugs)
          </li>
        </ul>

        <h3>8.2 AI Service Providers (Optional, User-Initiated Only)</h3>
        <p>
          If you choose to use AI-powered features, your prompts and relevant content may be sent to:
        </p>
        <ul>
          <li>
            <strong>Anthropic:</strong> For Claude AI features
          </li>
          <li>
            <strong>Google:</strong> For Gemini AI features
          </li>
        </ul>
        <p>
          AI features are entirely optional. We only send data to AI providers when you explicitly
          use an AI feature. We do not automatically send your content to AI providers.
        </p>

        <h3>8.3 What We Never Do</h3>
        <ul>
          <li>Sell your personal data to anyone</li>
          <li>Share your data with advertisers or marketers</li>
          <li>Use your content to train AI models</li>
          <li>Share your data with third parties for their own marketing purposes</li>
        </ul>
      </section>

      <section>
        <h2>9. Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your data, including:</p>
        <ul>
          <li>Encryption of data in transit (HTTPS/TLS)</li>
          <li>Encryption of sensitive data at rest</li>
          <li>Secure password hashing</li>
          <li>Two-factor authentication (2FA) option</li>
          <li>Regular security assessments</li>
          <li>Access controls and audit logging</li>
        </ul>
      </section>

      <section>
        <h2>10. Cookies</h2>
        <p>
          We use only essential cookies required for the service to function (authentication session).
          We do not use tracking cookies or third-party advertising cookies. For more details, please see
          our <a href="/cookies" className="text-[--arcane-purple]">Cookie Policy</a>.
        </p>
      </section>

      <section>
        <h2>11. Children&apos;s Privacy</h2>
        <p>
          Multiloop is not intended for users under 16 years of age. We do not knowingly collect personal
          data from children under 16. If you believe a child under 16 has provided us with personal data,
          please contact us immediately at{' '}
          <a href="mailto:contact@multiloop.app" className="text-[--arcane-purple]">contact@multiloop.app</a>.
        </p>
      </section>

      <section>
        <h2>12. International Data Transfers</h2>
        <p>
          Your data is primarily stored within the European Union. Where data is transferred outside the EU
          (e.g., to service providers), we ensure appropriate safeguards are in place, such as Standard
          Contractual Clauses or adequacy decisions.
        </p>
      </section>

      <section>
        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. For material changes, we will notify you via
          email or through a prominent notice on our service at least 30 days before the changes take effect.
          Continued use of the service after such notice constitutes acceptance of the updated policy.
        </p>
      </section>

      <section>
        <h2>14. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices, please contact us at:
        </p>
        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:contact@multiloop.app" className="text-[--arcane-purple]">contact@multiloop.app</a>
        </p>
        <p>
          We aim to respond to all privacy-related inquiries within 30 days.
        </p>
      </section>
    </article>
  )
}

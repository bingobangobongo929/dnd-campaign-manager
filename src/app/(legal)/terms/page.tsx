import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Multiloop - The rules and guidelines for using our service.',
}

export default function TermsOfServicePage() {
  const lastUpdated = 'January 19, 2026'

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <header className="not-prose mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
        <p className="text-gray-400">Last updated: {lastUpdated}</p>
      </header>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Multiloop (&quot;the Service&quot;), you agree to be bound by these Terms of
          Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service.
        </p>
        <p>
          The Service is operated by an individual based in the European Union. These Terms constitute a
          legally binding agreement between you and the operator of Multiloop.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>To use Multiloop, you must:</p>
        <ul>
          <li>Be at least 16 years of age</li>
          <li>Have the legal capacity to enter into binding agreements</li>
          <li>Not be prohibited from using the Service under applicable laws</li>
        </ul>
        <p>
          By creating an account, you represent and warrant that you meet all eligibility requirements.
        </p>
      </section>

      <section>
        <h2>3. Account Registration and Security</h2>
        <h3>3.1 Account Creation</h3>
        <p>
          To access certain features of the Service, you must create an account. You agree to provide
          accurate, current, and complete information during registration.
        </p>

        <h3>3.2 Account Security</h3>
        <p>You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use of your account</li>
        </ul>

        <h3>3.3 Two-Factor Authentication</h3>
        <p>
          We offer two-factor authentication (2FA) for enhanced security. We strongly recommend enabling
          2FA on your account.
        </p>
      </section>

      <section>
        <h2>4. Your Content</h2>
        <h3>4.1 Ownership</h3>
        <p>
          You retain ownership of all content you create, upload, or store on Multiloop (&quot;Your
          Content&quot;), including but not limited to campaigns, characters, session notes, and images.
        </p>

        <h3>4.2 License to Us</h3>
        <p>
          By using the Service, you grant us a limited, non-exclusive, worldwide license to store, process,
          and display Your Content solely for the purpose of providing the Service to you. This license
          terminates when you delete Your Content or your account.
        </p>

        <h3>4.3 Responsibility for Content</h3>
        <p>
          You are solely responsible for Your Content. You represent and warrant that you have all necessary
          rights to Your Content and that Your Content does not violate these Terms or any applicable laws.
        </p>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree NOT to use the Service to:</p>
        <ul>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe on intellectual property rights of others</li>
          <li>Upload, store, or share content that is illegal, harmful, threatening, abusive, harassing,
            defamatory, vulgar, obscene, or otherwise objectionable</li>
          <li>Upload content depicting illegal activity or child exploitation</li>
          <li>Harass, bully, or intimidate other users</li>
          <li>Impersonate any person or entity</li>
          <li>Distribute malware, viruses, or other harmful code</li>
          <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
          <li>Scrape, crawl, or use automated means to access the Service without permission</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Use the Service for any commercial purpose without authorization</li>
        </ul>
      </section>

      <section>
        <h2>6. AI Features</h2>
        <h3>6.1 Third-Party AI Services</h3>
        <p>
          Certain features of the Service use third-party artificial intelligence providers (such as
          Anthropic and Google). When you use AI features, your prompts and relevant content may be
          processed by these providers.
        </p>

        <h3>6.2 AI Output</h3>
        <p>
          AI-generated content is provided &quot;as is&quot; without any warranties. You are responsible for
          reviewing and verifying any AI-generated content before use. We do not guarantee the accuracy,
          appropriateness, or quality of AI outputs.
        </p>

        <h3>6.3 AI Usage Limits</h3>
        <p>
          AI features may be subject to usage limits based on your subscription tier. We reserve the right
          to modify AI feature availability and limits at any time.
        </p>
      </section>

      <section>
        <h2>7. Subscription Tiers and Payments</h2>
        <h3>7.1 Free Tier</h3>
        <p>
          The basic Service is provided free of charge with certain limitations. Free tier features may
          change at our discretion.
        </p>

        <h3>7.2 Paid Tiers</h3>
        <p>
          Premium features are available through paid subscription tiers. Pricing, features, and terms for
          paid tiers will be clearly displayed before purchase.
        </p>

        <h3>7.3 Changes to Pricing</h3>
        <p>
          We reserve the right to modify pricing at any time. Current subscribers will be notified at least
          30 days in advance of any price changes affecting their subscription.
        </p>
      </section>

      <section>
        <h2>8. Service Availability</h2>
        <p>
          We strive to maintain high availability of the Service, but we do not guarantee uninterrupted
          access. The Service is provided &quot;as is&quot; and &quot;as available.&quot; We may:
        </p>
        <ul>
          <li>Perform maintenance with or without notice</li>
          <li>Experience downtime due to technical issues</li>
          <li>Modify, suspend, or discontinue features at any time</li>
        </ul>
      </section>

      <section>
        <h2>9. Termination</h2>
        <h3>9.1 Termination by You</h3>
        <p>
          You may terminate your account at any time by using the account deletion feature in your settings
          or by contacting us. Upon termination, your data will be handled according to our{' '}
          <a href="/privacy" className="text-[--arcane-purple]">Privacy Policy</a>.
        </p>

        <h3>9.2 Termination by Us</h3>
        <p>We may suspend or terminate your account if you:</p>
        <ul>
          <li>Violate these Terms</li>
          <li>Engage in fraudulent or illegal activity</li>
          <li>Fail to pay applicable fees (for paid accounts)</li>
          <li>Create risk or legal exposure for us or other users</li>
        </ul>

        <h3>9.3 Suspension</h3>
        <p>
          We may temporarily suspend your access while we investigate potential violations. During
          suspension, you will be notified of the reason and given an opportunity to respond.
        </p>

        <h3>9.4 Effect of Termination</h3>
        <p>
          Upon termination, your right to use the Service ceases immediately. Provisions of these Terms that
          by their nature should survive termination will survive.
        </p>
      </section>

      <section>
        <h2>10. Intellectual Property</h2>
        <h3>10.1 Our Intellectual Property</h3>
        <p>
          The Service, including its design, features, and code (excluding Your Content), is owned by
          Multiloop and protected by intellectual property laws. You may not copy, modify, distribute,
          or create derivative works without permission.
        </p>

        <h3>10.2 Trademarks</h3>
        <p>
          &quot;Multiloop&quot; and associated logos are trademarks. You may not use our trademarks without
          prior written permission.
        </p>
      </section>

      <section>
        <h2>11. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
          KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.
        </p>
      </section>

      <section>
        <h2>12. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL MULTILOOP OR ITS OPERATOR BE LIABLE FOR
          ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE USE OF THE
          SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS
          PRECEDING THE CLAIM, OR ONE HUNDRED EUROS (EUR 100), WHICHEVER IS GREATER.
        </p>
        <p>
          THESE LIMITATIONS DO NOT APPLY WHERE PROHIBITED BY LAW OR TO LIABILITY ARISING FROM FRAUD,
          GROSS NEGLIGENCE, OR WILLFUL MISCONDUCT.
        </p>
      </section>

      <section>
        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Multiloop and its operator from any claims, damages,
          losses, and expenses (including reasonable legal fees) arising from:
        </p>
        <ul>
          <li>Your violation of these Terms</li>
          <li>Your Content</li>
          <li>Your use of the Service</li>
          <li>Your violation of any third-party rights</li>
        </ul>
      </section>

      <section>
        <h2>14. Governing Law and Jurisdiction</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the European Union
          and the member state where the operator is located, without regard to conflict of law principles.
        </p>
        <p>
          Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction
          of the courts in the operator&apos;s member state, unless mandatory consumer protection laws provide
          otherwise.
        </p>
      </section>

      <section>
        <h2>15. Dispute Resolution</h2>
        <p>
          Before initiating any formal dispute resolution, you agree to contact us at{' '}
          <a href="mailto:privacy@multiloop.app" className="text-[--arcane-purple]">privacy@multiloop.app</a>
          {' '}and attempt to resolve the dispute informally for at least 30 days.
        </p>
        <p>
          As a consumer in the EU, you may also be entitled to use the Online Dispute Resolution platform
          provided by the European Commission.
        </p>
      </section>

      <section>
        <h2>16. Changes to These Terms</h2>
        <p>
          We may modify these Terms at any time. For material changes, we will provide at least 30 days&apos;
          notice via email or through the Service before the changes take effect.
        </p>
        <p>
          Your continued use of the Service after the effective date of any changes constitutes your
          acceptance of the new Terms. If you do not agree to the changes, you must stop using the Service.
        </p>
      </section>

      <section>
        <h2>17. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable, the remaining provisions will
          continue in full force and effect.
        </p>
      </section>

      <section>
        <h2>18. Entire Agreement</h2>
        <p>
          These Terms, together with our <a href="/privacy" className="text-[--arcane-purple]">Privacy Policy</a>
          {' '}and <a href="/cookies" className="text-[--arcane-purple]">Cookie Policy</a>, constitute the entire
          agreement between you and Multiloop regarding the Service.
        </p>
      </section>

      <section>
        <h2>19. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:privacy@multiloop.app" className="text-[--arcane-purple]">privacy@multiloop.app</a>
        </p>
      </section>
    </article>
  )
}

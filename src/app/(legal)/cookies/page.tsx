import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie Policy for Multiloop - Learn about cookies and similar technologies we use.',
}

export default function CookiePolicyPage() {
  const lastUpdated = 'January 19, 2026'

  return (
    <article className="prose prose-invert prose-lg max-w-none">
      <header className="not-prose mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Cookie Policy</h1>
        <p className="text-gray-400">Last updated: {lastUpdated}</p>
      </header>

      <section>
        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are placed on your device when you visit a website. They are
          widely used to make websites work more efficiently and to provide information to website owners.
        </p>
        <p>
          This Cookie Policy explains how Multiloop uses cookies and similar technologies.
        </p>
      </section>

      <section>
        <h2>2. Our Cookie Philosophy</h2>
        <p>
          We believe in privacy-first practices. We use only the cookies that are strictly necessary
          for the Service to function. We do not use:
        </p>
        <ul>
          <li>Advertising or marketing cookies</li>
          <li>Third-party tracking cookies</li>
          <li>Social media tracking pixels</li>
          <li>Cross-site tracking technologies</li>
        </ul>
      </section>

      <section>
        <h2>3. Cookies We Use</h2>

        <h3>3.1 Essential Cookies (Strictly Necessary)</h3>
        <p>
          These cookies are essential for the Service to function. They cannot be disabled without
          breaking core functionality.
        </p>

        <div className="not-prose overflow-x-auto my-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Cookie Name</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Purpose</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Duration</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">sb-*-auth-token</td>
                <td className="py-3 px-4">Authentication session token</td>
                <td className="py-3 px-4">Session / 1 week</td>
                <td className="py-3 px-4">Essential</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                <td className="py-3 px-4">PKCE verification for secure auth</td>
                <td className="py-3 px-4">Session</td>
                <td className="py-3 px-4">Essential</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">cookie_consent</td>
                <td className="py-3 px-4">Stores your cookie consent preference</td>
                <td className="py-3 px-4">1 year</td>
                <td className="py-3 px-4">Essential</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>3.2 Analytics (Privacy-Focused)</h3>
        <p>
          We use <strong>Umami Analytics</strong>, a privacy-focused analytics solution. Umami:
        </p>
        <ul>
          <li>Does NOT use cookies</li>
          <li>Does NOT collect personally identifiable information</li>
          <li>Does NOT track users across sites</li>
          <li>Is GDPR compliant by design</li>
          <li>Is self-hosted for maximum privacy</li>
        </ul>
        <p>
          Umami collects only anonymized, aggregated data about page views and basic device information
          (browser type, country) without any persistent identifiers.
        </p>
      </section>

      <section>
        <h2>4. Local Storage</h2>
        <p>
          In addition to cookies, we may use browser local storage for certain preferences:
        </p>

        <div className="not-prose overflow-x-auto my-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Key</th>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">theme</td>
                <td className="py-3 px-4">Your preferred color theme (dark/light/system)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">lastChangelogView</td>
                <td className="py-3 px-4">When you last viewed the changelog (for &quot;new&quot; badge)</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-xs">sidebarCollapsed</td>
                <td className="py-3 px-4">Your sidebar preference</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Local storage data remains on your device and is never transmitted to our servers.
        </p>
      </section>

      <section>
        <h2>5. Third-Party Cookies</h2>
        <p>
          We do not allow third-party cookies on our Service. The only external services that may interact
          with your browser are:
        </p>
        <ul>
          <li>
            <strong>Supabase:</strong> Authentication provider (sets essential auth cookies)
          </li>
          <li>
            <strong>Cloudflare:</strong> Security and CDN (may set security-related cookies)
          </li>
        </ul>
        <p>
          These services only set cookies that are strictly necessary for security and authentication.
        </p>
      </section>

      <section>
        <h2>6. Managing Cookies</h2>

        <h3>6.1 Essential Cookies</h3>
        <p>
          Essential cookies cannot be disabled without losing access to the Service. If you delete
          authentication cookies, you will be logged out and need to sign in again.
        </p>

        <h3>6.2 Browser Settings</h3>
        <p>
          You can manage cookies through your browser settings. Here are links to cookie management
          instructions for popular browsers:
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[--arcane-purple]">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-[--arcane-purple]">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[--arcane-purple]">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[--arcane-purple]">Microsoft Edge</a></li>
        </ul>

        <h3>6.3 Clearing Local Storage</h3>
        <p>
          To clear local storage data, you can use your browser&apos;s developer tools or clear all site
          data through your browser&apos;s privacy settings.
        </p>
      </section>

      <section>
        <h2>7. Updates to This Policy</h2>
        <p>
          We may update this Cookie Policy from time to time. If we make material changes, we will notify
          you through the Service or by other means.
        </p>
      </section>

      <section>
        <h2>8. Contact Us</h2>
        <p>
          If you have any questions about our use of cookies, please contact us at:
        </p>
        <p>
          <strong>Email:</strong>{' '}
          <a href="mailto:privacy@multiloop.app" className="text-[--arcane-purple]">privacy@multiloop.app</a>
        </p>
      </section>

      <section className="not-prose mt-12 p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <h3 className="text-lg font-semibold text-white mb-2">Related Policies</h3>
        <div className="flex gap-4">
          <a href="/privacy" className="text-[--arcane-purple] hover:underline">Privacy Policy</a>
          <a href="/terms" className="text-[--arcane-purple] hover:underline">Terms of Service</a>
        </div>
      </section>
    </article>
  )
}

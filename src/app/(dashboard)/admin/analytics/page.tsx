'use client'

import { BarChart3, ExternalLink, Info, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'

export default function AdminAnalyticsPage() {
  const umamiConfigured = !!process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const umamiDashboardUrl = process.env.NEXT_PUBLIC_UMAMI_DASHBOARD_URL || 'https://analytics.multiloop.app'

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${umamiConfigured ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            {umamiConfigured ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-1">
              Umami Analytics {umamiConfigured ? 'Connected' : 'Not Configured'}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {umamiConfigured
                ? 'Analytics tracking is active. Page views and events are being collected.'
                : 'Set up Umami to track page views and user behavior with privacy in mind.'
              }
            </p>
            {umamiConfigured && (
              <a
                href={umamiDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Open Umami Dashboard
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Why Umami */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Why Umami?</h2>
        <ul className="space-y-3 text-gray-400">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Privacy-focused</strong> - No cookies, GDPR compliant by default</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Self-hosted</strong> - You own your data, no third-party access</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Lightweight</strong> - Minimal impact on page load (~2KB script)</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <span><strong className="text-white">Open source</strong> - Transparent, auditable code</span>
          </li>
        </ul>
      </div>

      {/* Setup Instructions */}
      {!umamiConfigured && (
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Setup Instructions</h2>
          </div>
          <ol className="space-y-4 text-gray-400">
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium flex-shrink-0">1</span>
              <div>
                <strong className="text-white">Deploy Umami</strong>
                <p className="text-sm mt-1">
                  Fork the <a href="https://github.com/umami-software/umami" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Umami repository</a> and deploy to Vercel with a PostgreSQL database.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium flex-shrink-0">2</span>
              <div>
                <strong className="text-white">Create a website</strong>
                <p className="text-sm mt-1">
                  In the Umami dashboard, add multiloop.app as a tracked website and copy the Website ID.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium flex-shrink-0">3</span>
              <div>
                <strong className="text-white">Configure environment variables</strong>
                <p className="text-sm mt-1">Add these to your Vercel project:</p>
                <pre className="mt-2 p-3 bg-black/30 rounded-lg text-sm overflow-x-auto">
{`NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://your-umami.vercel.app/script.js
NEXT_PUBLIC_UMAMI_DASHBOARD_URL=https://your-umami.vercel.app`}
                </pre>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-medium flex-shrink-0">4</span>
              <div>
                <strong className="text-white">Redeploy</strong>
                <p className="text-sm mt-1">
                  Redeploy your app for the changes to take effect. Analytics will start tracking immediately.
                </p>
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* What's Tracked */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">What's Tracked</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h3 className="text-white font-medium">Collected</h3>
            <ul className="space-y-1 text-gray-400">
              <li>• Page views and unique visitors</li>
              <li>• Session duration and bounce rate</li>
              <li>• Browser and OS (anonymized)</li>
              <li>• Country (from IP, not stored)</li>
              <li>• Referrer sources</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-medium">Not Collected</h3>
            <ul className="space-y-1 text-gray-400">
              <li>• Personal information</li>
              <li>• IP addresses (processed, not stored)</li>
              <li>• Cookies or fingerprinting</li>
              <li>• Cross-site tracking</li>
              <li>• User accounts or emails</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

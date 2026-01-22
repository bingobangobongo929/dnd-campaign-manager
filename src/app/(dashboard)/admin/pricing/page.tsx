'use client'

import { useState } from 'react'
import { Check, Sparkles, Shield, Crown, Info } from 'lucide-react'
import { useUserSettings } from '@/hooks'
import { isSuperAdmin } from '@/lib/admin'
import { TIER_INFO, TIER_LIMITS, FOUNDER_LIMITS, formatLimit } from '@/lib/membership'
import { cn } from '@/lib/utils'

/**
 * Admin-only pricing page for planning and preview
 * This page is NOT visible to regular users
 */
export default function AdminPricingPage() {
  const { settings: userSettings } = useUserSettings()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const isSuperAdminUser = isSuperAdmin(userSettings?.role || 'user')

  if (!isSuperAdminUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Super admin access required</p>
        </div>
      </div>
    )
  }

  const tiers = [
    {
      key: 'adventurer' as const,
      name: 'Adventurer',
      description: 'Perfect for getting started',
      price: null,
      icon: Sparkles,
      color: 'emerald',
      limits: TIER_LIMITS.adventurer,
      features: [
        `${TIER_LIMITS.adventurer.campaigns} campaigns`,
        `${TIER_LIMITS.adventurer.oneshots} one-shots`,
        `${TIER_LIMITS.adventurer.vaultCharacters} vault characters`,
        `${TIER_LIMITS.adventurer.storageMB} MB storage`,
        `${TIER_LIMITS.adventurer.shareLinks} share links`,
        `${TIER_LIMITS.adventurer.publicTemplates} public template`,
      ],
    },
    {
      key: 'hero' as const,
      name: 'Hero',
      description: 'For dedicated dungeon masters',
      price: billingCycle === 'monthly' ? 5 : 40,
      icon: Shield,
      color: 'blue',
      limits: TIER_LIMITS.hero,
      popular: true,
      features: [
        `${TIER_LIMITS.hero.campaigns} campaigns`,
        `${TIER_LIMITS.hero.oneshots} one-shots`,
        `${TIER_LIMITS.hero.vaultCharacters} vault characters`,
        `${TIER_LIMITS.hero.storageMB} MB storage`,
        `${TIER_LIMITS.hero.shareLinks} share links`,
        `${TIER_LIMITS.hero.publicTemplates} public templates`,
        'PDF export',
      ],
    },
    {
      key: 'legend' as const,
      name: 'Legend',
      description: 'Unlimited power for serious campaigns',
      price: billingCycle === 'monthly' ? 10 : 80,
      icon: Crown,
      color: 'amber',
      limits: TIER_LIMITS.legend,
      features: [
        'Unlimited campaigns',
        'Unlimited one-shots',
        'Unlimited characters',
        `${(TIER_LIMITS.legend.storageMB / 1024).toFixed(0)} GB storage`,
        'Unlimited share links',
        'Unlimited templates',
        'PDF export',
        'Custom themes',
      ],
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm mb-4">
          <Info className="w-4 h-4" />
          Admin Preview Only
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Pricing Plans</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          This is a preview of the pricing page. It will only be shown to users when billing is enabled.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === 'monthly'
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              billingCycle === 'yearly'
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            Yearly
            <span className="ml-1 text-xs text-green-400">Save 33%</span>
          </button>
        </div>
      </div>

      {/* Founder Badge Info */}
      <div className="max-w-2xl mx-auto p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Founder Benefits</p>
            <p className="text-sm text-amber-200/80 mt-1">
              Users with Founder status on the Adventurer tier receive Hero-level limits for free, permanently.
              This includes {FOUNDER_LIMITS.campaigns} campaigns, {FOUNDER_LIMITS.vaultCharacters} characters, and {FOUNDER_LIMITS.storageMB} MB storage.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon
          const colorClasses = {
            emerald: {
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
              text: 'text-emerald-400',
              button: 'bg-emerald-600 hover:bg-emerald-500',
            },
            blue: {
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
              text: 'text-blue-400',
              button: 'bg-blue-600 hover:bg-blue-500',
            },
            amber: {
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/20',
              text: 'text-amber-400',
              button: 'bg-amber-600 hover:bg-amber-500',
            },
          }[tier.color]

          return (
            <div
              key={tier.key}
              className={cn(
                "relative p-6 rounded-2xl border transition-all",
                tier.popular
                  ? "bg-blue-500/5 border-blue-500/30 scale-105"
                  : "bg-[#1a1a24] border-white/[0.06]"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2 rounded-lg", colorClasses.bg)}>
                  <Icon className={cn("w-5 h-5", colorClasses.text)} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{tier.name}</h3>
                  <p className="text-xs text-gray-500">{tier.description}</p>
                </div>
              </div>

              <div className="mb-6">
                {tier.price === null ? (
                  <div className="text-3xl font-bold text-white">Free</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">${tier.price}</span>
                    <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className={cn("w-4 h-4 mt-0.5 flex-shrink-0", colorClasses.text)} />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={cn(
                  "w-full py-2.5 rounded-lg font-medium text-white transition-colors",
                  colorClasses.button
                )}
              >
                {tier.price === null ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Limits Comparison Table */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Detailed Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                <th className="text-center py-3 px-4 text-emerald-400 font-medium">Adventurer</th>
                <th className="text-center py-3 px-4 text-amber-400 font-medium">Founder*</th>
                <th className="text-center py-3 px-4 text-blue-400 font-medium">Hero</th>
                <th className="text-center py-3 px-4 text-amber-400 font-medium">Legend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <ComparisonRow
                label="Campaigns"
                adventurer={TIER_LIMITS.adventurer.campaigns}
                founder={FOUNDER_LIMITS.campaigns}
                hero={TIER_LIMITS.hero.campaigns}
                legend={TIER_LIMITS.legend.campaigns}
              />
              <ComparisonRow
                label="One-Shots"
                adventurer={TIER_LIMITS.adventurer.oneshots}
                founder={FOUNDER_LIMITS.oneshots}
                hero={TIER_LIMITS.hero.oneshots}
                legend={TIER_LIMITS.legend.oneshots}
              />
              <ComparisonRow
                label="Vault Characters"
                adventurer={TIER_LIMITS.adventurer.vaultCharacters}
                founder={FOUNDER_LIMITS.vaultCharacters}
                hero={TIER_LIMITS.hero.vaultCharacters}
                legend={TIER_LIMITS.legend.vaultCharacters}
              />
              <ComparisonRow
                label="Storage"
                adventurer={`${TIER_LIMITS.adventurer.storageMB} MB`}
                founder={`${FOUNDER_LIMITS.storageMB} MB`}
                hero={`${TIER_LIMITS.hero.storageMB} MB`}
                legend={`${(TIER_LIMITS.legend.storageMB / 1024).toFixed(0)} GB`}
              />
              <ComparisonRow
                label="Share Links"
                adventurer={TIER_LIMITS.adventurer.shareLinks}
                founder={FOUNDER_LIMITS.shareLinks}
                hero={TIER_LIMITS.hero.shareLinks}
                legend={TIER_LIMITS.legend.shareLinks}
              />
              <ComparisonRow
                label="Public Templates"
                adventurer={TIER_LIMITS.adventurer.publicTemplates}
                founder={FOUNDER_LIMITS.publicTemplates}
                hero={TIER_LIMITS.hero.publicTemplates}
                legend={TIER_LIMITS.legend.publicTemplates}
              />
              <ComparisonRow
                label="PDF Export"
                adventurer={TIER_LIMITS.adventurer.pdfExport}
                founder={FOUNDER_LIMITS.pdfExport}
                hero={TIER_LIMITS.hero.pdfExport}
                legend={TIER_LIMITS.legend.pdfExport}
                isBoolean
              />
              <ComparisonRow
                label="Custom Themes"
                adventurer={TIER_LIMITS.adventurer.customThemes}
                founder={FOUNDER_LIMITS.customThemes}
                hero={TIER_LIMITS.hero.customThemes}
                legend={TIER_LIMITS.legend.customThemes}
                isBoolean
              />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          * Founder = Adventurer tier with Founder status (early supporters)
        </p>
      </div>
    </div>
  )
}

function ComparisonRow({
  label,
  adventurer,
  founder,
  hero,
  legend,
  isBoolean = false,
}: {
  label: string
  adventurer: number | string | boolean
  founder: number | string | boolean
  hero: number | string | boolean
  legend: number | string | boolean
  isBoolean?: boolean
}) {
  const formatValue = (value: number | string | boolean) => {
    if (isBoolean) {
      return value ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <span className="text-gray-600">—</span>
    }
    if (typeof value === 'number') {
      return value === -1 ? '∞' : value
    }
    return value
  }

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="py-3 px-4 text-gray-300">{label}</td>
      <td className="py-3 px-4 text-center text-gray-400">{formatValue(adventurer)}</td>
      <td className="py-3 px-4 text-center text-amber-400 font-medium">{formatValue(founder)}</td>
      <td className="py-3 px-4 text-center text-gray-300">{formatValue(hero)}</td>
      <td className="py-3 px-4 text-center text-gray-300">{formatValue(legend)}</td>
    </tr>
  )
}

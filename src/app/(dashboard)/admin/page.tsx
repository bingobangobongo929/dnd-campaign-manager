'use client'

import { useState, useEffect } from 'react'
import { Users, Swords, BookOpen, Scroll, TrendingUp, Calendar, Clock, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn } from '@/lib/utils'
import { getTierBadgeColor, getTierDisplayName } from '@/lib/admin'

interface Stats {
  totalUsers: number
  usersThisWeek: number
  usersThisMonth: number
  usersByTier: { tier: string; count: number }[]
  totalCampaigns: number
  totalCharacters: number
  totalSessions: number
  totalOneshots: number
  activeUsersToday: number
  activeUsersWeek: number
  activeUsersMonth: number
}

export default function AdminOverviewPage() {
  const supabase = useSupabase()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        // Fetch all stats in parallel
        const [
          { count: totalUsers },
          { count: usersThisWeek },
          { count: usersThisMonth },
          { data: tierData },
          { count: totalCampaigns },
          { count: totalCharacters },
          { count: totalSessions },
          { count: totalOneshots },
          { count: activeToday },
          { count: activeWeek },
          { count: activeMonth },
        ] = await Promise.all([
          // Total users
          supabase.from('user_settings').select('*', { count: 'exact', head: true }),
          // Users this week
          supabase.from('user_settings').select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo.toISOString()),
          // Users this month
          supabase.from('user_settings').select('*', { count: 'exact', head: true })
            .gte('created_at', monthAgo.toISOString()),
          // Users by tier
          supabase.from('user_settings').select('tier'),
          // Total campaigns
          supabase.from('campaigns').select('*', { count: 'exact', head: true }),
          // Total characters (vault)
          supabase.from('vault_characters').select('*', { count: 'exact', head: true }),
          // Total sessions
          supabase.from('sessions').select('*', { count: 'exact', head: true }),
          // Total oneshots
          supabase.from('oneshots').select('*', { count: 'exact', head: true }),
          // Active users today
          supabase.from('user_settings').select('*', { count: 'exact', head: true })
            .gte('last_login_at', today.toISOString()),
          // Active users this week
          supabase.from('user_settings').select('*', { count: 'exact', head: true })
            .gte('last_login_at', weekAgo.toISOString()),
          // Active users this month
          supabase.from('user_settings').select('*', { count: 'exact', head: true })
            .gte('last_login_at', monthAgo.toISOString()),
        ])

        // Calculate users by tier
        const tierCounts: Record<string, number> = {}
        tierData?.forEach(({ tier }) => {
          tierCounts[tier] = (tierCounts[tier] || 0) + 1
        })
        const usersByTier = Object.entries(tierCounts).map(([tier, count]) => ({ tier, count }))

        setStats({
          totalUsers: totalUsers || 0,
          usersThisWeek: usersThisWeek || 0,
          usersThisMonth: usersThisMonth || 0,
          usersByTier,
          totalCampaigns: totalCampaigns || 0,
          totalCharacters: totalCharacters || 0,
          totalSessions: totalSessions || 0,
          totalOneshots: totalOneshots || 0,
          activeUsersToday: activeToday || 0,
          activeUsersWeek: activeWeek || 0,
          activeUsersMonth: activeMonth || 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-400">
        Failed to load statistics
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">User Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="New This Week"
            value={stats.usersThisWeek}
            color="green"
          />
          <StatCard
            icon={Calendar}
            label="New This Month"
            value={stats.usersThisMonth}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Active Today"
            value={stats.activeUsersToday}
            color="amber"
          />
        </div>
      </section>

      {/* Active Users & Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Active Users</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Daily Active Users (DAU)</span>
              <span className="text-white font-semibold">{stats.activeUsersToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Weekly Active Users (WAU)</span>
              <span className="text-white font-semibold">{stats.activeUsersWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Monthly Active Users (MAU)</span>
              <span className="text-white font-semibold">{stats.activeUsersMonth}</span>
            </div>
          </div>
        </section>

        {/* Users by Tier */}
        <section className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Users by Tier</h2>
          <div className="space-y-3">
            {stats.usersByTier.length === 0 ? (
              <p className="text-gray-500">No users yet</p>
            ) : (
              stats.usersByTier.map(({ tier, count }) => (
                <div key={tier} className="flex items-center justify-between">
                  <span className={cn("px-2 py-1 rounded text-xs font-medium", getTierBadgeColor(tier))}>
                    {getTierDisplayName(tier)}
                  </span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Content Stats */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Content Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Swords}
            label="Campaigns"
            value={stats.totalCampaigns}
            color="blue"
          />
          <StatCard
            icon={BookOpen}
            label="Characters"
            value={stats.totalCharacters}
            color="purple"
          />
          <StatCard
            icon={Calendar}
            label="Sessions"
            value={stats.totalSessions}
            color="green"
          />
          <StatCard
            icon={Scroll}
            label="One-Shots"
            value={stats.totalOneshots}
            color="amber"
          />
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: 'purple' | 'green' | 'blue' | 'amber'
}) {
  const colors = {
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
  }

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-5">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

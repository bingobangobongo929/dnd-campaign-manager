'use client'

import { useState, useEffect } from 'react'
import { Search, MoreVertical, Shield, Ban, UserX, Crown, Loader2, Check, X, Sparkles, Bot, Copy } from 'lucide-react'
import { useSupabase, useUserSettings } from '@/hooks'
import { Modal, Button } from '@/components/ui'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { cn, formatDate } from '@/lib/utils'
import {
  getRoleDisplayName,
  getRoleBadgeColor,
  getTierDisplayName,
  getTierBadgeColor,
  isSuperAdmin,
} from '@/lib/admin'
import { toast } from 'sonner'
import type { UserRole } from '@/types/database'

interface UserWithSettings {
  id: string
  email: string
  created_at: string
  settings: {
    tier: string
    role: UserRole
    is_founder: boolean
    ai_access: boolean
    suspended_at: string | null
    suspended_reason: string | null
    disabled_at: string | null
    last_login_at: string | null
    totp_enabled: boolean
  } | null
}

export default function AdminUsersPage() {
  const supabase = useSupabase()
  const { settings: currentUserSettings } = useUserSettings()
  const [users, setUsers] = useState<UserWithSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Action modals
  const [selectedUser, setSelectedUser] = useState<UserWithSettings | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showChangeTierModal, setShowChangeTierModal] = useState(false)
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneResults, setCloneResults] = useState<{ campaigns: number; oneshots: number; characters: number; errors: string[] } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [newTier, setNewTier] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [actionLoading, setActionLoading] = useState(false)

  const isSuperAdminUser = isSuperAdmin(currentUserSettings?.role || 'user')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // Fetch users with their settings
      const { data: settingsData, error } = await supabase
        .from('user_settings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform to user format
      const usersData: UserWithSettings[] = (settingsData || []).map(s => ({
        id: s.user_id,
        email: '', // We'll need to get this separately or store it in user_settings
        created_at: s.created_at,
        settings: {
          tier: s.tier || 'adventurer',
          role: s.role,
          is_founder: s.is_founder || false,
          ai_access: s.ai_access || false,
          suspended_at: s.suspended_at,
          suspended_reason: s.suspended_reason,
          disabled_at: s.disabled_at,
          last_login_at: s.last_login_at,
          totp_enabled: s.totp_enabled,
        },
      }))

      setUsers(usersData)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (suspend: boolean) => {
    if (!selectedUser) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_reason: suspend ? suspendReason : null,
          suspended_by: suspend ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('user_id', selectedUser.id)

      if (error) throw error

      // Log admin activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: suspend ? 'suspend_user' : 'unsuspend_user',
        target_user_id: selectedUser.id,
        details: suspend ? { reason: suspendReason } : {},
      })

      toast.success(suspend ? 'User suspended' : 'User unsuspended')
      setShowSuspendModal(false)
      setSuspendReason('')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisable = async (disable: boolean) => {
    if (!selectedUser || !isSuperAdminUser) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          disabled_at: disable ? new Date().toISOString() : null,
          disabled_by: disable ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('user_id', selectedUser.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: disable ? 'disable_user' : 'enable_user',
        target_user_id: selectedUser.id,
      })

      toast.success(disable ? 'User disabled' : 'User enabled')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeTier = async () => {
    if (!selectedUser || !isSuperAdminUser || !newTier) return

    setActionLoading(true)
    try {
      const oldTier = selectedUser.settings?.tier

      const { error } = await supabase
        .from('user_settings')
        .update({ tier: newTier })
        .eq('user_id', selectedUser.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'change_tier',
        target_user_id: selectedUser.id,
        details: { old_tier: oldTier, new_tier: newTier },
      })

      toast.success('Tier updated')
      setShowChangeTierModal(false)
      setNewTier('')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to change tier')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeRole = async () => {
    if (!selectedUser || !isSuperAdminUser || !newRole) return

    setActionLoading(true)
    try {
      const oldRole = selectedUser.settings?.role

      const { error } = await supabase
        .from('user_settings')
        .update({ role: newRole })
        .eq('user_id', selectedUser.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'change_role',
        target_user_id: selectedUser.id,
        details: { old_role: oldRole, new_role: newRole },
      })

      toast.success('Role updated')
      setShowChangeRoleModal(false)
      setNewRole('user')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to change role')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleFounder = async (user: UserWithSettings) => {
    if (!isSuperAdminUser) return

    const currentFounder = user.settings?.is_founder || false
    const newFounder = !currentFounder

    try {
      const adminUser = (await supabase.auth.getUser()).data.user
      const { error } = await supabase
        .from('user_settings')
        .update({
          is_founder: newFounder,
          founder_granted_at: newFounder ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: adminUser?.id,
        action: newFounder ? 'grant_founder' : 'revoke_founder',
        target_user_id: user.id,
      })

      toast.success(newFounder ? 'Founder status granted' : 'Founder status revoked')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update founder status')
    }
  }

  const handleToggleAIAccess = async (user: UserWithSettings) => {
    if (!isSuperAdminUser) return

    const currentAI = user.settings?.ai_access || false
    const newAI = !currentAI

    try {
      const adminUser = (await supabase.auth.getUser()).data.user
      const { error } = await supabase
        .from('user_settings')
        .update({
          ai_access: newAI,
          ai_access_granted_by: newAI ? adminUser?.id : null,
          ai_access_granted_at: newAI ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: adminUser?.id,
        action: newAI ? 'grant_ai_access' : 'revoke_ai_access',
        target_user_id: user.id,
      })

      toast.success(newAI ? 'AI access granted' : 'AI access revoked')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update AI access')
    }
  }

  const handleCloneUserData = async () => {
    if (!selectedUser || !isSuperAdminUser) return

    setActionLoading(true)
    setCloneResults(null)

    try {
      const res = await fetch('/api/admin/clone-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUserId: selectedUser.id }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to clone data')

      setCloneResults(data.results)
      toast.success('User data cloned to your account')
    } catch (error: any) {
      toast.error(error.message || 'Failed to clone user data')
    } finally {
      setActionLoading(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!user.id.toLowerCase().includes(query)) {
        return false
      }
    }
    if (filterTier !== 'all' && user.settings?.tier !== filterTier) return false
    if (filterRole !== 'all' && user.settings?.role !== filterRole) return false
    if (filterStatus === 'suspended' && !user.settings?.suspended_at) return false
    if (filterStatus === 'disabled' && !user.settings?.disabled_at) return false
    if (filterStatus === 'active' && (user.settings?.suspended_at || user.settings?.disabled_at)) return false
    return true
  })

  const getUserStatus = (user: UserWithSettings) => {
    if (user.settings?.disabled_at) return { label: 'Disabled', color: 'text-red-400 bg-red-500/10' }
    if (user.settings?.suspended_at) return { label: 'Suspended', color: 'text-amber-400 bg-amber-500/10' }
    return { label: 'Active', color: 'text-green-400 bg-green-500/10' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Tiers</option>
          <option value="adventurer">Adventurer</option>
          <option value="hero">Hero</option>
          <option value="legend">Legend</option>
        </select>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="moderator">Moderators</option>
          <option value="super_admin">Super Admins</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tier</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Founder</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">AI</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Login</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">2FA</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = getUserStatus(user)
                  return (
                    <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]" title={user.id}>
                            {user.id.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined {formatDate(user.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getTierBadgeColor(user.settings?.tier || 'adventurer'))}>
                          {getTierDisplayName(user.settings?.tier || 'adventurer')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleFounder(user)}
                          disabled={!isSuperAdminUser}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            user.settings?.is_founder
                              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                              : "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
                            !isSuperAdminUser && "cursor-not-allowed opacity-50"
                          )}
                          title={user.settings?.is_founder ? "Click to revoke founder status" : "Click to grant founder status"}
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleAIAccess(user)}
                          disabled={!isSuperAdminUser}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            user.settings?.ai_access
                              ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              : "bg-gray-500/10 text-gray-600 hover:bg-gray-500/20",
                            !isSuperAdminUser && "cursor-not-allowed opacity-50"
                          )}
                          title={user.settings?.ai_access ? "Click to revoke AI access" : "Click to grant AI access"}
                        >
                          <Bot className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", getRoleBadgeColor(user.settings?.role || 'user'))}>
                          {getRoleDisplayName(user.settings?.role || 'user')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-medium", status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {user.settings?.last_login_at
                          ? formatDate(user.settings.last_login_at)
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        {user.settings?.totp_enabled ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-gray-600" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu
                          trigger={
                            <button className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          }
                          align="right"
                        >
                          {/* Suspend/Unsuspend */}
                          {user.settings?.suspended_at ? (
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                handleSuspend(false)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-400 hover:bg-white/[0.04]"
                            >
                              <Check className="w-4 h-4" />
                              Unsuspend
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowSuspendModal(true)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-amber-400 hover:bg-white/[0.04]"
                            >
                              <Ban className="w-4 h-4" />
                              Suspend
                            </button>
                          )}

                          {/* Super Admin only actions */}
                          {isSuperAdminUser && (
                            <>
                              {/* Disable/Enable */}
                              {user.settings?.disabled_at ? (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user)
                                    handleDisable(false)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-400 hover:bg-white/[0.04]"
                                >
                                  <Check className="w-4 h-4" />
                                  Enable
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user)
                                    handleDisable(true)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-white/[0.04]"
                                >
                                  <UserX className="w-4 h-4" />
                                  Disable
                                </button>
                              )}

                              {/* Change Tier */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewTier(user.settings?.tier || 'free')
                                  setShowChangeTierModal(true)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-blue-400 hover:bg-white/[0.04]"
                              >
                                <Crown className="w-4 h-4" />
                                Change Tier
                              </button>

                              {/* Change Role */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewRole(user.settings?.role || 'user')
                                  setShowChangeRoleModal(true)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-purple-400 hover:bg-white/[0.04]"
                              >
                                <Shield className="w-4 h-4" />
                                Change Role
                              </button>

                              {/* Clone User Data */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setCloneResults(null)
                                  setShowCloneModal(true)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-cyan-400 hover:bg-white/[0.04]"
                              >
                                <Copy className="w-4 h-4" />
                                Clone Data to My Account
                              </button>
                            </>
                          )}
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend Modal */}
      <Modal
        isOpen={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false)
          setSuspendReason('')
        }}
        title="Suspend User"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Suspending this user will prevent them from accessing their account.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Reason</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension..."
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSuspendModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <button
              onClick={() => handleSuspend(true)}
              disabled={actionLoading || !suspendReason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-50 font-medium transition-colors"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Suspend'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Change Tier Modal */}
      <Modal
        isOpen={showChangeTierModal}
        onClose={() => setShowChangeTierModal(false)}
        title="Change User Tier"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">New Tier</label>
            <select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="free">Free</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowChangeTierModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeTier}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Tier'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={showChangeRoleModal}
        onClose={() => setShowChangeRoleModal(false)}
        title="Change User Role"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">New Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowChangeRoleModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Role'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clone User Data Modal */}
      <Modal
        isOpen={showCloneModal}
        onClose={() => {
          setShowCloneModal(false)
          setCloneResults(null)
        }}
        title="Clone User Data"
      >
        <div className="space-y-4">
          {!cloneResults ? (
            <>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <p className="text-sm text-cyan-200">
                  This will copy all campaigns, oneshots, and vault characters from this user to your account.
                </p>
                <p className="text-xs text-cyan-200/70 mt-2">
                  Items will be named with "(from username)" suffix. Original data is not affected.
                </p>
              </div>

              <div className="text-sm text-gray-400">
                <p>User ID: <span className="text-white font-mono">{selectedUser?.id.slice(0, 8)}...</span></p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowCloneModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <button
                  onClick={handleCloneUserData}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cloning...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Clone Data
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-sm text-green-400 font-medium mb-2">Clone Complete</p>
                <div className="text-sm text-green-200 space-y-1">
                  <p>Campaigns: {cloneResults.campaigns}</p>
                  <p>One-Shots: {cloneResults.oneshots}</p>
                  <p>Vault Characters: {cloneResults.characters}</p>
                </div>
              </div>

              {cloneResults.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400 font-medium mb-2">Errors ({cloneResults.errors.length})</p>
                  <div className="text-xs text-red-200 space-y-1 max-h-32 overflow-y-auto">
                    {cloneResults.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setShowCloneModal(false)
                  setCloneResults(null)
                }}
                className="w-full"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Search, MoreVertical, Shield, Ban, UserX, Crown, Loader2, Check, X, Sparkles, Bot, Copy, AtSign, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download } from 'lucide-react'
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
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  settings: {
    username: string | null
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Action modals
  const [selectedUser, setSelectedUser] = useState<UserWithSettings | null>(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showChangeTierModal, setShowChangeTierModal] = useState(false)
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false)
  const [showChangeUsernameModal, setShowChangeUsernameModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)

  // Confirmation modal for dangerous actions
  const [confirmAction, setConfirmAction] = useState<{
    type: 'disable' | 'revoke_founder' | 'revoke_ai' | null
    user: UserWithSettings | null
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning'
  }>({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })
  const [cloneResults, setCloneResults] = useState<{ campaigns: number; oneshots: number; characters: number; errors: string[] } | null>(null)
  const [cloneTargetUser, setCloneTargetUser] = useState<UserWithSettings | null>(null)
  const [cloneTargetSearch, setCloneTargetSearch] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [newTier, setNewTier] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const isSuperAdminUser = isSuperAdmin(currentUserSettings?.role || 'user')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // Fetch users with emails from admin API
      const res = await fetch('/api/admin/users')

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch users')
      }

      const { users: usersData } = await res.json()
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

  const handleDisable = async (disable: boolean, user?: UserWithSettings) => {
    const targetUser = user || selectedUser
    if (!targetUser || !isSuperAdminUser) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          disabled_at: disable ? new Date().toISOString() : null,
          disabled_by: disable ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('user_id', targetUser.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: disable ? 'disable_user' : 'enable_user',
        target_user_id: targetUser.id,
      })

      toast.success(disable ? 'User disabled' : 'User enabled')
      setConfirmAction({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })
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

  const handleChangeUsername = async () => {
    if (!selectedUser || !isSuperAdminUser) return

    const trimmedUsername = newUsername.trim().toLowerCase()

    // Validate username format
    if (trimmedUsername && !/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
      setUsernameError('Username must be 3-20 characters, lowercase letters, numbers, and underscores only')
      return
    }

    // Check reserved usernames
    const reservedUsernames = [
      'admin', 'administrator', 'mod', 'moderator', 'support', 'help',
      'staff', 'team', 'multiloop', 'system', 'root', 'official',
      'superadmin', 'super_admin', 'owner', 'founder', 'ceo',
      'api', 'www', 'mail', 'ftp', 'test', 'dev', 'null', 'undefined',
    ]

    if (trimmedUsername && reservedUsernames.includes(trimmedUsername)) {
      setUsernameError('This username is reserved and cannot be used')
      return
    }

    setActionLoading(true)
    setUsernameError('')

    try {
      const oldUsername = selectedUser.settings?.username

      // Check if username is taken (if not clearing it)
      if (trimmedUsername) {
        const { data: existing } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('username', trimmedUsername)
          .neq('user_id', selectedUser.id)
          .single()

        if (existing) {
          setUsernameError('This username is already taken')
          setActionLoading(false)
          return
        }
      }

      const { error } = await supabase
        .from('user_settings')
        .update({ username: trimmedUsername || null })
        .eq('user_id', selectedUser.id)

      if (error) throw error

      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'change_username',
        target_user_id: selectedUser.id,
        details: { old_username: oldUsername, new_username: trimmedUsername || null },
      })

      toast.success(trimmedUsername ? 'Username updated' : 'Username cleared')
      setShowChangeUsernameModal(false)
      setNewUsername('')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to change username')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleFounder = async (user: UserWithSettings, skipConfirm = false) => {
    if (!isSuperAdminUser) return

    const currentFounder = user.settings?.is_founder || false
    const newFounder = !currentFounder

    // Show confirmation when revoking
    if (currentFounder && !skipConfirm) {
      setConfirmAction({
        type: 'revoke_founder',
        user,
        title: 'Revoke Founder Status',
        message: `Are you sure you want to revoke founder status from ${user.settings?.username || user.email}? They will lose all founder benefits.`,
        confirmLabel: 'Revoke Founder',
        variant: 'warning',
      })
      return
    }

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
      setConfirmAction({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update founder status')
    }
  }

  const handleToggleAIAccess = async (user: UserWithSettings, skipConfirm = false) => {
    if (!isSuperAdminUser) return

    const currentAI = user.settings?.ai_access || false
    const newAI = !currentAI

    // Show confirmation when revoking
    if (currentAI && !skipConfirm) {
      setConfirmAction({
        type: 'revoke_ai',
        user,
        title: 'Revoke AI Access',
        message: `Are you sure you want to revoke AI access from ${user.settings?.username || user.email}? They will no longer be able to use AI features.`,
        confirmLabel: 'Revoke AI Access',
        variant: 'warning',
      })
      return
    }

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
      setConfirmAction({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })
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
        body: JSON.stringify({
          sourceUserId: selectedUser.id,
          targetUserId: cloneTargetUser?.id || null, // null = clone to admin's own account
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to clone data')

      setCloneResults(data.results)
      const targetLabel = cloneTargetUser ? cloneTargetUser.settings?.username || cloneTargetUser.email : 'your account'
      toast.success(`User data cloned to ${targetLabel}`)
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
      const matchesId = user.id.toLowerCase().includes(query)
      const matchesEmail = user.email?.toLowerCase().includes(query)
      const matchesUsername = user.settings?.username?.toLowerCase().includes(query)
      if (!matchesId && !matchesEmail && !matchesUsername) {
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

  // Pagination calculations
  const totalUsers = filteredUsers.length
  const totalPages = Math.ceil(totalUsers / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalUsers)
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void, value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  // Export filtered users to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Email', 'Username', 'Tier', 'Role', 'Founder', 'AI Access', 'Status', '2FA', 'Created At', 'Last Login']
    const rows = filteredUsers.map(user => {
      const status = user.settings?.disabled_at ? 'Disabled' : user.settings?.suspended_at ? 'Suspended' : 'Active'
      return [
        user.id,
        user.email || '',
        user.settings?.username || '',
        user.settings?.tier || 'adventurer',
        user.settings?.role || 'user',
        user.settings?.is_founder ? 'Yes' : 'No',
        user.settings?.ai_access ? 'Yes' : 'No',
        status,
        user.settings?.totp_enabled ? 'Yes' : 'No',
        user.created_at ? new Date(user.created_at).toISOString() : '',
        user.settings?.last_login_at ? new Date(user.settings.last_login_at).toISOString() : '',
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${filteredUsers.length} users to CSV`)
  }

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
            placeholder="Search by email, username, or ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <select
          value={filterTier}
          onChange={(e) => handleFilterChange(setFilterTier, e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Tiers</option>
          <option value="adventurer">Adventurer</option>
          <option value="hero">Hero</option>
          <option value="legend">Legend</option>
        </select>

        <select
          value={filterRole}
          onChange={(e) => handleFilterChange(setFilterRole, e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="moderator">Moderators</option>
          <option value="super_admin">Super Admins</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>

        <button
          onClick={handleExportCSV}
          disabled={filteredUsers.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export filtered users to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Username</th>
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
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const status = getUserStatus(user)
                  return (
                    <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-white truncate max-w-[200px]" title={user.email || user.id}>
                              {user.email || `${user.id.slice(0, 8)}...`}
                            </p>
                            {user.email_confirmed_at ? (
                              <span title="Email confirmed">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              </span>
                            ) : (
                              <span title="Email not confirmed">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {user.id.slice(0, 8)}... · Joined {formatDate(user.created_at)}
                            {user.last_sign_in_at && ` · Last login ${formatDate(user.last_sign_in_at)}`}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {user.settings?.username ? (
                          <span className="text-sm text-purple-400 font-medium">
                            @{user.settings.username}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600 italic">Not set</span>
                        )}
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
                                    handleDisable(false, user)
                                  }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-400 hover:bg-white/[0.04]"
                                >
                                  <Check className="w-4 h-4" />
                                  Enable
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setConfirmAction({
                                      type: 'disable',
                                      user,
                                      title: 'Disable User Account',
                                      message: `Are you sure you want to disable ${user.settings?.username || user.email}? This will permanently lock them out of their account until re-enabled.`,
                                      confirmLabel: 'Disable Account',
                                      variant: 'danger',
                                    })
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
                                  setNewTier(user.settings?.tier || 'adventurer')
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

                              {/* Change Username */}
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setNewUsername(user.settings?.username || '')
                                  setUsernameError('')
                                  setShowChangeUsernameModal(true)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-green-400 hover:bg-white/[0.04]"
                              >
                                <AtSign className="w-4 h-4" />
                                Change Username
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

        {/* Pagination Controls */}
        {totalUsers > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1}-{endIndex} of {totalUsers} users
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="px-3 py-1 text-sm text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}
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
              <option value="adventurer">Adventurer</option>
              <option value="hero">Hero</option>
              <option value="legend">Legend</option>
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
          setCloneTargetUser(null)
          setCloneTargetSearch('')
        }}
        title="Clone User Data"
      >
        <div className="space-y-4">
          {!cloneResults ? (
            <>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                <p className="text-sm text-cyan-200">
                  Copy all campaigns, oneshots, and vault characters from this user to another account.
                </p>
                <p className="text-xs text-cyan-200/70 mt-2">
                  Items will be named with "(from username)" suffix. Original data is not affected.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-400 mb-1">Source User:</p>
                  <p className="text-white font-medium">
                    {selectedUser?.settings?.username || selectedUser?.email || 'Unknown'}
                    <span className="text-gray-500 font-mono text-xs ml-2">({selectedUser?.id.slice(0, 8)}...)</span>
                  </p>
                </div>

                <div className="text-sm">
                  <p className="text-gray-400 mb-2">Clone To:</p>
                  <div className="space-y-2">
                    {/* Search for target user */}
                    <input
                      type="text"
                      placeholder="Search user by email or username..."
                      value={cloneTargetSearch}
                      onChange={(e) => setCloneTargetSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 text-sm"
                    />

                    {/* Show matching users */}
                    {cloneTargetSearch.length >= 2 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 bg-white/[0.02] rounded-lg p-2">
                        {users
                          .filter(u => {
                            const search = cloneTargetSearch.toLowerCase()
                            return (
                              u.id !== selectedUser?.id &&
                              (u.email?.toLowerCase().includes(search) ||
                               u.settings?.username?.toLowerCase().includes(search))
                            )
                          })
                          .slice(0, 10)
                          .map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setCloneTargetUser(u)
                                setCloneTargetSearch('')
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.04] text-sm transition-colors"
                            >
                              <span className="text-white">{u.settings?.username || u.email}</span>
                              {u.settings?.username && u.email && (
                                <span className="text-gray-500 ml-2 text-xs">{u.email}</span>
                              )}
                            </button>
                          ))}
                        {users.filter(u => {
                          const search = cloneTargetSearch.toLowerCase()
                          return (
                            u.id !== selectedUser?.id &&
                            (u.email?.toLowerCase().includes(search) ||
                             u.settings?.username?.toLowerCase().includes(search))
                          )
                        }).length === 0 && (
                          <p className="text-gray-500 text-sm px-3 py-2">No users found</p>
                        )}
                      </div>
                    )}

                    {/* Selected target user or default */}
                    <div className="p-3 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                      {cloneTargetUser ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{cloneTargetUser.settings?.username || cloneTargetUser.email}</p>
                            <p className="text-gray-500 text-xs">{cloneTargetUser.email}</p>
                          </div>
                          <button
                            onClick={() => setCloneTargetUser(null)}
                            className="text-gray-400 hover:text-white text-xs"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <p className="text-cyan-400">
                          <span className="font-medium">My Account</span>
                          <span className="text-cyan-400/60 text-xs ml-2">(default - clone to your own account)</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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

      {/* Change Username Modal */}
      <Modal
        isOpen={showChangeUsernameModal}
        onClose={() => {
          setShowChangeUsernameModal(false)
          setNewUsername('')
          setUsernameError('')
        }}
        title="Change Username"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>User ID: <span className="text-white font-mono">{selectedUser?.id.slice(0, 8)}...</span></p>
            <p className="mt-1">Current: {selectedUser?.settings?.username ? (
              <span className="text-purple-400">@{selectedUser.settings.username}</span>
            ) : (
              <span className="text-gray-600 italic">Not set</span>
            )}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">New Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  setUsernameError('')
                }}
                placeholder="username"
                className="w-full pl-8 pr-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                maxLength={20}
              />
            </div>
            <p className="text-xs text-gray-500">
              3-20 characters, lowercase letters, numbers, and underscores only. Leave empty to clear.
            </p>
            {usernameError && (
              <p className="text-xs text-red-400">{usernameError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowChangeUsernameModal(false)
                setNewUsername('')
                setUsernameError('')
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeUsername}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Username'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Dangerous Actions */}
      <Modal
        isOpen={confirmAction.type !== null}
        onClose={() => setConfirmAction({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })}
        title={confirmAction.title}
      >
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-xl border",
            confirmAction.variant === 'danger'
              ? "bg-red-500/10 border-red-500/20"
              : "bg-amber-500/10 border-amber-500/20"
          )}>
            <p className={cn(
              "text-sm",
              confirmAction.variant === 'danger' ? "text-red-200" : "text-amber-200"
            )}>
              {confirmAction.message}
            </p>
          </div>

          <div className="text-sm text-gray-400">
            <p>User: <span className="text-white font-medium">{confirmAction.user?.settings?.username || confirmAction.user?.email}</span></p>
            <p className="text-xs text-gray-500 mt-1">ID: {confirmAction.user?.id}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmAction({ type: null, user: null, title: '', message: '', confirmLabel: '', variant: 'danger' })}
              className="flex-1"
            >
              Cancel
            </Button>
            <button
              onClick={() => {
                if (!confirmAction.user) return
                if (confirmAction.type === 'disable') {
                  handleDisable(true, confirmAction.user)
                } else if (confirmAction.type === 'revoke_founder') {
                  handleToggleFounder(confirmAction.user, true)
                } else if (confirmAction.type === 'revoke_ai') {
                  handleToggleAIAccess(confirmAction.user, true)
                }
              }}
              disabled={actionLoading}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
                confirmAction.variant === 'danger'
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              )}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmAction.confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

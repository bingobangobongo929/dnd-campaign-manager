'use client'

import { useState, useEffect } from 'react'
import {
  FileStack,
  Swords,
  Scroll,
  User,
  Search,
  Loader2,
  Eye,
  Download,
  Calendar,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink
} from 'lucide-react'
import { useSupabase } from '@/hooks'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type TemplateType = 'campaign' | 'oneshot' | 'character'

interface PublishedTemplate {
  id: string
  type: TemplateType
  name: string
  description: string | null
  tags: string[] | null
  save_count: number
  version: number
  user_id: string
  username?: string
  user_email?: string
  created_at: string
  updated_at: string
}

export default function AdminTemplatesPage() {
  const supabase = useSupabase()
  const [templates, setTemplates] = useState<PublishedTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TemplateType | 'all'>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const allTemplates: PublishedTemplate[] = []

      // Fetch published campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, template_description, template_tags, template_save_count, template_version, user_id, created_at, updated_at')
        .eq('is_published', true)
        .order('template_save_count', { ascending: false })

      if (campaigns) {
        allTemplates.push(...campaigns.map(c => ({
          id: c.id,
          type: 'campaign' as TemplateType,
          name: c.name,
          description: c.template_description,
          tags: c.template_tags,
          save_count: c.template_save_count || 0,
          version: c.template_version || 1,
          user_id: c.user_id,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })))
      }

      // Fetch published oneshots
      const { data: oneshots } = await supabase
        .from('oneshots')
        .select('id, name, template_description, template_tags, template_save_count, template_version, user_id, created_at, updated_at')
        .eq('is_published', true)
        .order('template_save_count', { ascending: false })

      if (oneshots) {
        allTemplates.push(...oneshots.map(o => ({
          id: o.id,
          type: 'oneshot' as TemplateType,
          name: o.name,
          description: o.template_description,
          tags: o.template_tags,
          save_count: o.template_save_count || 0,
          version: o.template_version || 1,
          user_id: o.user_id,
          created_at: o.created_at,
          updated_at: o.updated_at,
        })))
      }

      // Fetch published vault characters
      const { data: characters } = await supabase
        .from('vault_characters')
        .select('id, name, template_description, template_tags, template_save_count, template_version, user_id, created_at, updated_at')
        .eq('is_published', true)
        .order('template_save_count', { ascending: false })

      if (characters) {
        allTemplates.push(...characters.map(c => ({
          id: c.id,
          type: 'character' as TemplateType,
          name: c.name,
          description: c.template_description,
          tags: c.template_tags,
          save_count: c.template_save_count || 0,
          version: c.template_version || 1,
          user_id: c.user_id,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })))
      }

      // Fetch user info for all templates
      const userIds = [...new Set(allTemplates.map(t => t.user_id))]
      if (userIds.length > 0) {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const { users } = await res.json()
          const userMap: Record<string, { email: string; username: string | null }> = {}
          users?.forEach((u: { id: string; email: string; settings?: { username: string | null } }) => {
            userMap[u.id] = { email: u.email, username: u.settings?.username || null }
          })

          allTemplates.forEach(t => {
            const user = userMap[t.user_id]
            if (user) {
              t.user_email = user.email
              t.username = user.username || undefined
            }
          })
        }
      }

      // Sort by save count descending
      allTemplates.sort((a, b) => b.save_count - a.save_count)
      setTemplates(allTemplates)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (filterType !== 'all' && template.type !== filterType) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = template.name.toLowerCase().includes(query)
      const matchesDescription = template.description?.toLowerCase().includes(query)
      const matchesTags = template.tags?.some(t => t.toLowerCase().includes(query))
      const matchesUser = template.username?.toLowerCase().includes(query) || template.user_email?.toLowerCase().includes(query)
      if (!matchesName && !matchesDescription && !matchesTags && !matchesUser) {
        return false
      }
    }
    return true
  })

  // Pagination calculations
  const totalTemplates = filteredTemplates.length
  const totalPages = Math.ceil(totalTemplates / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalTemplates)
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (value: TemplateType | 'all') => {
    setFilterType(value)
    setCurrentPage(1)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Name', 'Description', 'Tags', 'Saves', 'Version', 'Author', 'Author Email', 'Created At', 'Updated At']
    const rows = filteredTemplates.map(t => [
      t.id,
      t.type,
      t.name,
      t.description || '',
      t.tags?.join(', ') || '',
      t.save_count,
      t.version,
      t.username || '',
      t.user_email || '',
      t.created_at ? new Date(t.created_at).toISOString() : '',
      t.updated_at ? new Date(t.updated_at).toISOString() : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `templates-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success(`Exported ${filteredTemplates.length} templates to CSV`)
  }

  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'campaign': return Swords
      case 'oneshot': return Scroll
      case 'character': return User
    }
  }

  const getTypeColor = (type: TemplateType) => {
    switch (type) {
      case 'campaign': return 'text-purple-400 bg-purple-500/10'
      case 'oneshot': return 'text-amber-400 bg-amber-500/10'
      case 'character': return 'text-blue-400 bg-blue-500/10'
    }
  }

  const getTypeLabel = (type: TemplateType) => {
    switch (type) {
      case 'campaign': return 'Campaign'
      case 'oneshot': return 'One-Shot'
      case 'character': return 'Character'
    }
  }

  // Stats
  const campaignCount = templates.filter(t => t.type === 'campaign').length
  const oneshotCount = templates.filter(t => t.type === 'oneshot').length
  const characterCount = templates.filter(t => t.type === 'character').length
  const totalSaves = templates.reduce((sum, t) => sum + t.save_count, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{campaignCount}</p>
              <p className="text-sm text-gray-400">Campaigns</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{oneshotCount}</p>
              <p className="text-sm text-gray-400">One-Shots</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{characterCount}</p>
              <p className="text-sm text-gray-400">Characters</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalSaves}</p>
              <p className="text-sm text-gray-400">Total Saves</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, author, or tags..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => handleFilterChange(e.target.value as TemplateType | 'all')}
          className="px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-purple-500/50"
        >
          <option value="all">All Types</option>
          <option value="campaign">Campaigns</option>
          <option value="oneshot">One-Shots</option>
          <option value="character">Characters</option>
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
          disabled={filteredTemplates.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export templates to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Templates List */}
      {paginatedTemplates.length === 0 ? (
        <div className="text-center py-16 bg-[#1a1a24] rounded-xl border border-white/[0.06]">
          <FileStack className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No published templates</h3>
          <p className="text-gray-400">Published templates will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#1a1a24] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Template</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Author</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tags</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Saves</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Version</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Published</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTemplates.map((template) => {
                  const Icon = getTypeIcon(template.type)
                  return (
                    <tr key={`${template.type}-${template.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-white">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[300px]">{template.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium", getTypeColor(template.type))}>
                          <Icon className="w-3 h-3" />
                          {getTypeLabel(template.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          {template.username ? (
                            <span className="text-sm text-purple-400">@{template.username}</span>
                          ) : (
                            <span className="text-sm text-gray-400">{template.user_email || 'Unknown'}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {template.tags?.slice(0, 3).map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/[0.04] rounded text-xs text-gray-400">
                              {tag}
                            </span>
                          ))}
                          {template.tags && template.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-white font-medium">{template.save_count}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">v{template.version}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {formatDate(template.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalTemplates > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{endIndex} of {totalTemplates} templates
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
      )}
    </div>
  )
}

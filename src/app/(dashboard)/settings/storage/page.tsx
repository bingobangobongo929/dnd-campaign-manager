'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, HardDrive, Image, Trash2, Loader2, FolderOpen } from 'lucide-react'
import { useSupabase, useUser, useMembership } from '@/hooks'
import { UsageBar } from '@/components/membership'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface StorageItem {
  name: string
  size: number
  bucket: string
  path: string
  created_at: string
}

interface BucketUsage {
  bucket: string
  label: string
  count: number
  sizeMB: number
  icon: React.ComponentType<{ className?: string }>
}

const BUCKET_INFO: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'campaign-images': { label: 'Campaign Images', icon: Image },
  'character-images': { label: 'Character Images', icon: Image },
  'oneshot-images': { label: 'One-Shot Images', icon: Image },
  'avatars': { label: 'Profile Avatars', icon: Image },
}

export default function StorageSettingsPage() {
  const router = useRouter()
  const supabase = useSupabase()
  const { user } = useUser()
  const { limits, usage, isFounder, refreshUsage } = useMembership()

  const [loading, setLoading] = useState(true)
  const [bucketUsage, setBucketUsage] = useState<BucketUsage[]>([])
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [bucketFiles, setBucketFiles] = useState<StorageItem[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadStorageBreakdown()
    }
  }, [user])

  const loadStorageBreakdown = async () => {
    if (!user) return
    setLoading(true)

    try {
      const buckets = Object.keys(BUCKET_INFO)
      const usageByBucket: BucketUsage[] = []

      for (const bucket of buckets) {
        try {
          const { data: files } = await supabase.storage
            .from(bucket)
            .list(user.id, { limit: 1000 })

          if (files && files.length > 0) {
            let totalSize = 0
            for (const file of files) {
              if (file.metadata?.size) {
                totalSize += file.metadata.size
              }
            }

            usageByBucket.push({
              bucket,
              label: BUCKET_INFO[bucket].label,
              icon: BUCKET_INFO[bucket].icon,
              count: files.length,
              sizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
            })
          }
        } catch {
          // Bucket might not exist or user has no files
        }
      }

      setBucketUsage(usageByBucket.sort((a, b) => b.sizeMB - a.sizeMB))
    } catch (error) {
      console.error('Failed to load storage breakdown:', error)
      toast.error('Failed to load storage data')
    } finally {
      setLoading(false)
    }
  }

  const loadBucketFiles = async (bucket: string) => {
    if (!user) return
    setLoadingFiles(true)
    setSelectedBucket(bucket)

    try {
      const { data: files } = await supabase.storage
        .from(bucket)
        .list(user.id, { limit: 100 })

      if (files) {
        const items: StorageItem[] = files
          .filter(f => f.name && !f.name.startsWith('.'))
          .map(f => ({
            name: f.name,
            size: f.metadata?.size || 0,
            bucket,
            path: `${user.id}/${f.name}`,
            created_at: f.created_at || '',
          }))
          .sort((a, b) => b.size - a.size)

        setBucketFiles(items)
      }
    } catch (error) {
      console.error('Failed to load bucket files:', error)
      toast.error('Failed to load files')
    } finally {
      setLoadingFiles(false)
    }
  }

  const deleteFile = async (item: StorageItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return

    setDeletingFile(item.path)

    try {
      const { error } = await supabase.storage
        .from(item.bucket)
        .remove([item.path])

      if (error) throw error

      toast.success('File deleted')
      setBucketFiles(prev => prev.filter(f => f.path !== item.path))
      await loadStorageBreakdown()
      await refreshUsage()
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('Failed to delete file')
    } finally {
      setDeletingFile(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalUsedMB = bucketUsage.reduce((sum, b) => sum + b.sizeMB, 0)

  return (
    <div className="min-h-screen bg-[--bg-base]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[--bg-base]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 h-14">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 -ml-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h1 className="text-lg font-semibold text-white">Storage Management</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Overall Usage */}
        <section className="p-6 rounded-xl bg-[--bg-elevated] border border-[--border]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
              <p className="text-sm text-[--text-tertiary]">
                {isFounder ? 'Founder limits applied' : 'Standard limits'}
              </p>
            </div>
          </div>

          <UsageBar
            label="Total Storage"
            used={usage.storageMB}
            limit={limits.storageMB}
            unit="MB"
            size="lg"
          />

          <p className="text-sm text-[--text-tertiary] mt-2">
            {usage.storageMB} MB used of {limits.storageMB === -1 ? 'Unlimited' : `${limits.storageMB} MB`}
          </p>
        </section>

        {/* Storage Breakdown */}
        <section className="p-6 rounded-xl bg-[--bg-elevated] border border-[--border]">
          <h2 className="text-lg font-semibold text-white mb-4">Storage Breakdown</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : bucketUsage.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-[--text-tertiary]">No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bucketUsage.map((bucket) => (
                <button
                  key={bucket.bucket}
                  onClick={() => loadBucketFiles(bucket.bucket)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left",
                    selectedBucket === bucket.bucket
                      ? "bg-purple-500/10 border-purple-500/30"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  )}
                >
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <bucket.icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{bucket.label}</p>
                    <p className="text-sm text-[--text-tertiary]">
                      {bucket.count} file{bucket.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{bucket.sizeMB} MB</p>
                    <p className="text-xs text-[--text-tertiary]">
                      {totalUsedMB > 0 ? Math.round((bucket.sizeMB / totalUsedMB) * 100) : 0}%
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* File List */}
        {selectedBucket && (
          <section className="p-6 rounded-xl bg-[--bg-elevated] border border-[--border]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {BUCKET_INFO[selectedBucket]?.label || selectedBucket}
              </h2>
              <button
                onClick={() => setSelectedBucket(null)}
                className="text-sm text-[--text-tertiary] hover:text-white"
              >
                Close
              </button>
            </div>

            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : bucketFiles.length === 0 ? (
              <p className="text-center py-8 text-[--text-tertiary]">No files in this bucket</p>
            ) : (
              <div className="space-y-2">
                {bucketFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                  >
                    <Image className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-[--text-tertiary]">{formatSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => deleteFile(file)}
                      disabled={deletingFile === file.path}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete file"
                    >
                      {deletingFile === file.path ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Help Text */}
        <p className="text-sm text-[--text-tertiary] text-center">
          Deleting files here will free up storage space. Files used in your content will show broken images if deleted.
        </p>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { ArrowLeft, Star, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Changelog } from '@/types/database'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what\'s new in Multiloop - the latest updates, features, and improvements.',
}

// Format date for display
function formatChangelogDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Group entries by month
function groupByMonth(entries: Changelog[]): Map<string, Changelog[]> {
  const groups = new Map<string, Changelog[]>()

  entries.forEach(entry => {
    const date = new Date(entry.published_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(entry)
  })

  return groups
}

export default async function ChangelogPage() {
  const supabase = await createClient()

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const { data: entries } = await supabase
    .from('changelog')
    .select('*')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  const groupedEntries = groupByMonth(entries || [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[--bg-base]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">Back to Multiloop</span>
              <span className="font-medium sm:hidden">Back</span>
            </Link>
            {!isLoggedIn && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </Link>
                <Link
                  href="/#waitlist"
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-purple-500/20"
                >
                  Join Waitlist
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Stay up to date with the latest features, improvements, and fixes in Multiloop.
          </p>
        </div>

        {entries?.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No updates yet</h2>
            <p className="text-gray-400">
              Check back soon for the latest updates and improvements.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Array.from(groupedEntries.entries()).map(([key, monthEntries]) => {
              const monthLabel = new Date(monthEntries[0].published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
              })

              return (
                <section key={key}>
                  <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-6">
                    {monthLabel}
                  </h2>
                  <div className="space-y-6">
                    {monthEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className="bg-[#1a1a24] rounded-xl border border-white/[0.06] p-6"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-2 py-1 rounded text-xs font-mono font-medium bg-purple-500/20 text-purple-400">
                            v{entry.version}
                          </span>
                          {entry.is_major && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                              <Star className="w-3 h-3" />
                              Major Release
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatChangelogDate(entry.published_at)}
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-3">
                          {entry.title}
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <p className="text-gray-400 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Multiloop. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

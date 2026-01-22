import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: oneshot } = await supabase
    .from('oneshots')
    .select('title, min_players, max_players, estimated_duration')
    .eq('id', id)
    .single()

  if (!oneshot) {
    return { title: 'One-Shot | Multiloop' }
  }

  // Build specs for title
  const specs: string[] = []
  if (oneshot.min_players && oneshot.max_players) {
    specs.push(`${oneshot.min_players}-${oneshot.max_players} Players`)
  }
  if (oneshot.estimated_duration) {
    specs.push(oneshot.estimated_duration)
  }

  const title = specs.length > 0
    ? `${oneshot.title} | ${specs.join(' • ')}`
    : oneshot.title

  return {
    title,
    description: `Run and manage ${oneshot.title} - a one-shot adventure.`,
  }
}

export default function OneshotLayout({ children }: LayoutProps) {
  return <>{children}</>
}

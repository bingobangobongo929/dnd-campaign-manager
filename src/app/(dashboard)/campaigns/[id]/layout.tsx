import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, setting')
    .eq('id', id)
    .single()

  if (!campaign) {
    return { title: 'Campaign | Multiloop' }
  }

  const title = campaign.setting
    ? `${campaign.name} | ${campaign.setting}`
    : campaign.name

  return {
    title,
    description: `Manage ${campaign.name} - sessions, lore, timeline, and more.`,
  }
}

export default function CampaignLayout({ children }: LayoutProps) {
  return <>{children}</>
}

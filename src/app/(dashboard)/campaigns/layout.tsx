import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Campaigns',
  description: 'Manage your TTRPG campaigns - sessions, lore, and world-building.',
}

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

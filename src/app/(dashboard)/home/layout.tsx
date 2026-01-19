import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Your TTRPG dashboard - characters, campaigns, and adventures at a glance.',
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

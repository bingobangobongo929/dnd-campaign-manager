import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Shared Content',
    template: '%s | Campaign Manager',
  },
  description: 'View shared tabletop RPG content - characters, campaigns, and adventures.',
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[--bg-base]">
      {children}
    </div>
  )
}

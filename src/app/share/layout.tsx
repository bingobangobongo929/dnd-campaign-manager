import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shared Content - Campaign Manager',
  description: 'View shared character, oneshot, or campaign content',
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

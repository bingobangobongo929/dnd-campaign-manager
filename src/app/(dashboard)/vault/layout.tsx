import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Character Vault',
  description: 'Manage your TTRPG characters - backstories, relationships, and more.',
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

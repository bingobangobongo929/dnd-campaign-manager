import type { Metadata } from 'next'
import { SettingsNav } from './SettingsNav'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsNav>{children}</SettingsNav>
}

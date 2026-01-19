import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'One-Shots',
  description: 'Browse and manage one-shot adventures for your tabletop games.',
}

export default function OneshotsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

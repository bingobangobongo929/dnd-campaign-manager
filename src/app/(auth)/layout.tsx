import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Multiloop - Your tabletop adventures, organized.',
  openGraph: {
    title: 'Sign In | Multiloop',
    description: 'Sign in to Multiloop - Track campaigns, build characters, and chronicle your epic TTRPG journeys.',
    type: 'website',
    siteName: 'Multiloop',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | Multiloop',
    description: 'Sign in to Multiloop - Track campaigns, build characters, and chronicle your epic TTRPG journeys.',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

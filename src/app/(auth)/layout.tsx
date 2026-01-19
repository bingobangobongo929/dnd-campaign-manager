import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiloop.app'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Multiloop - Your tabletop adventures, organized.',
  openGraph: {
    title: 'Sign In | Multiloop',
    description: 'Sign in to Multiloop - Track campaigns, build characters, and chronicle your epic TTRPG journeys.',
    type: 'website',
    siteName: 'Multiloop',
    images: [
      {
        url: `${siteUrl}/login-og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Sign in to Multiloop',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In | Multiloop',
    description: 'Sign in to Multiloop - Track campaigns, build characters, and chronicle your epic TTRPG journeys.',
    images: [`${siteUrl}/login-og-image.png`],
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

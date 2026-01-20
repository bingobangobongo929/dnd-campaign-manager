import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  title: 'Multiloop - Your Tabletop Adventures, Organized',
  description: 'Track campaigns, build characters, and chronicle your epic TTRPG journeys. The ultimate companion for Dungeon Masters and players.',
  openGraph: {
    title: 'Multiloop - Your Tabletop Adventures, Organized',
    description: 'Track campaigns, build characters, and chronicle your epic TTRPG journeys. The ultimate companion for Dungeon Masters and players.',
    type: 'website',
    url: 'https://multiloop.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Multiloop - TTRPG Campaign Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multiloop - Your Tabletop Adventures, Organized',
    description: 'Track campaigns, build characters, and chronicle your epic TTRPG journeys.',
    images: ['/og-image.png'],
  },
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect('/home')
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Multiloop',
    description: 'Track campaigns, build characters, and chronicle your epic TTRPG journeys. The ultimate companion for Dungeon Masters and players.',
    url: 'https://multiloop.app',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '42',
    },
    featureList: [
      'Campaign Management',
      'Character Vault',
      'Session Notes',
      'One-Shot Library',
      'AI Assistant',
      'Secure & Private',
    ],
  }

  // Show landing page for non-authenticated users
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}

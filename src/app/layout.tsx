import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"
import { Providers } from "@/components/providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // For iOS safe areas
  themeColor: '#0a0a0f',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://multiloop.app'),
  title: {
    default: "Multiloop",
    template: "%s | Multiloop",
  },
  description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
  keywords: ["D&D", "Dungeons & Dragons", "TTRPG", "campaign manager", "character tracker", "tabletop RPG", "Multiloop"],
  authors: [{ name: "Multiloop" }],
  // iOS Web App settings
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Multiloop',
  },
  // App manifest
  manifest: '/manifest.json',
  openGraph: {
    title: "Multiloop",
    description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
    type: "website",
    siteName: "Multiloop",
    locale: "en_US",
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Multiloop - Track your TTRPG adventures',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Multiloop",
    description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  // Additional iOS icons
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
        style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(26, 26, 36, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f3f4f6',
            },
          }}
        />
      </body>
    </html>
  )
}

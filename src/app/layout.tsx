import type { Metadata } from "next"
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://campaign-manager.vercel.app'),
  title: {
    default: "Campaign Manager",
    template: "%s | Campaign Manager",
  },
  description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
  keywords: ["D&D", "Dungeons & Dragons", "TTRPG", "campaign manager", "character tracker", "tabletop RPG"],
  authors: [{ name: "Campaign Manager" }],
  openGraph: {
    title: "Campaign Manager",
    description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
    type: "website",
    siteName: "Campaign Manager",
    locale: "en_US",
    // OG image is auto-generated from opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Campaign Manager",
    description: "Your tabletop adventures, organized. Track campaigns, build characters, and chronicle your epic journeys.",
    // Twitter image is auto-generated from opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
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

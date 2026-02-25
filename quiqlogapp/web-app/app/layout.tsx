import type { Metadata } from 'next'
import { Space_Grotesk, Work_Sans } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-work-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Quiqlog — Create How-To Guides Instantly',
    template: '%s | Quiqlog',
  },
  description: 'Record your screen, capture clicks, and instantly turn them into beautiful shareable how-to guides. No writing required.',
  keywords: ['how-to guides', 'screen recorder', 'documentation', 'tutorials'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Quiqlog',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${workSans.variable}`}>
      <body className="font-body antialiased bg-background text-text-primary min-h-screen">
        {children}
      </body>
    </html>
  )
}

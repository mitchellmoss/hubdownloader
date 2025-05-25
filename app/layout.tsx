import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GoogleAdSense from '@/components/GoogleAdSense'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lyricless - Extract Video URLs from Any Website',
  description: 'Free online tool to extract video URLs from websites. Support for MP4, WebM, HLS, and DASH streams. No registration required.',
  keywords: ['video downloader', 'url extractor', 'video extractor', 'download videos', 'extract video links'],
  metadataBase: new URL('http://127.0.0.1:3000'),
  openGraph: {
    title: 'Lyricless - Video URL Extractor',
    description: 'Extract direct video URLs from any website instantly',
    type: 'website',
    locale: 'en_US',
    siteName: 'Lyricless',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lyricless - Video URL Extractor',
    description: 'Extract direct video URLs from any website instantly',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <GoogleAdSense />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GoogleAdSense from '@/components/GoogleAdSense'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HubDownloader - Extract Video URLs from Any Website',
  description: 'Free online tool to extract video URLs from websites. Support for MP4, WebM, HLS, and DASH streams. No registration required.',
  keywords: ['video downloader', 'url extractor', 'video extractor', 'download videos', 'extract video links'],
  openGraph: {
    title: 'HubDownloader - Video URL Extractor',
    description: 'Extract direct video URLs from any website instantly',
    type: 'website',
    locale: 'en_US',
    url: 'https://hubdownloader.com',
    siteName: 'HubDownloader',
    images: [{
      url: 'https://hubdownloader.com/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'HubDownloader - Video URL Extractor'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HubDownloader - Video URL Extractor',
    description: 'Extract direct video URLs from any website instantly',
    images: ['https://hubdownloader.com/og-image.jpg'],
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
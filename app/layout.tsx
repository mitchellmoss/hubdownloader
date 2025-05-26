import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GoogleAdSense from '@/components/GoogleAdSense'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getMetadataBase, SITE_NAME, SITE_DESCRIPTION } from '@/lib/config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${SITE_NAME} - Extract Video URLs from Any Website`,
  description: SITE_DESCRIPTION,
  keywords: ['video downloader', 'url extractor', 'video extractor', 'download videos', 'extract video links'],
  metadataBase: getMetadataBase(),
  openGraph: {
    title: `${SITE_NAME} - Video URL Extractor`,
    description: 'Extract direct video URLs from any website instantly',
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Extract Video URLs Instantly`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Video URL Extractor`,
    description: 'Extract direct video URLs from any website instantly',
    images: ['/twitter-image'],
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
  alternates: {
    canonical: '/',
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
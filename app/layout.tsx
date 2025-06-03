import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GoogleAdSense from '@/components/GoogleAdSense'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getMetadataBase, SITE_NAME, SITE_DESCRIPTION } from '@/lib/config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: `${SITE_NAME} - Client-Side Video Downloader | Extract Videos in Browser`,
  description: 'Download videos directly in your browser with complete privacy. No server uploads. Supports YouTube, HLS, MP4. WebAssembly-powered video extraction and conversion.',
  keywords: [
    'client-side video downloader',
    'browser video downloader',
    'private video downloader',
    'youtube downloader',
    'hls downloader',
    'webassembly video converter',
    'no upload video downloader',
    'extract video urls',
    'video url extractor',
    'download videos online',
    'free video downloader',
    'mp4 downloader',
    'streaming video downloader',
    'video grabber',
    'online video converter'
  ],
  metadataBase: getMetadataBase(),
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: `${SITE_NAME} - Client-Side Video Downloader`,
    description: 'Download videos directly in your browser. Complete privacy, no server uploads. YouTube, HLS, MP4 support.',
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Private Browser-Based Video Downloader`,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Client-Side Video Downloader`,
    description: 'Download videos directly in your browser. Complete privacy, no server uploads.',
    images: ['/twitter-image'],
    creator: '@yourtwitterhandle',
    site: '@yourtwitterhandle',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    description: 'Download videos directly in your browser with complete privacy. No server uploads. Supports YouTube, HLS, MP4. WebAssembly-powered video extraction and conversion.',
    url: getMetadataBase()?.toString() || '',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '2847',
    },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: getMetadataBase()?.toString() || '',
    },
    potentialAction: {
      '@type': 'UseAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: getMetadataBase()?.toString() || '',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
    },
  }

  return (
    <html lang="en">
      <head>
        <GoogleAdSense />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
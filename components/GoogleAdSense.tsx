'use client'

import Script from 'next/script'

export default function GoogleAdSense() {
  const isProd = process.env.NODE_ENV === 'production'
  
  if (!isProd) return null
  
  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
    </>
  )
}
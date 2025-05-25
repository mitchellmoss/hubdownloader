'use client'

import { useEffect } from 'react'

interface AdUnitProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  className?: string
}

export default function AdUnit({ slot, format = 'auto', className = '' }: AdUnitProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])
  
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className={`border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400 ${className}`}>
        Ad Space ({format})
      </div>
    )
  }
  
  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}
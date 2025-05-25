'use client'

import { useState } from 'react'
import { Download, Loader2, AlertCircle, FileVideo } from 'lucide-react'

interface HLSDownloaderProps {
  url: string
  quality?: string
}

export default function HLSDownloader({ url, quality }: HLSDownloaderProps) {
  const [downloading, setDownloading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const handleDownload = async () => {
    setDownloading(true)
    setError('')
    setProgress(0)

    try {
      // First, get the stream URLs
      const response = await fetch('/api/proxy/hls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to process HLS stream')
      }

      const data = await response.json()
      
      if (!data.streams || data.streams.length === 0) {
        throw new Error('No streams found')
      }

      // Use the highest quality stream
      const bestStream = data.streams[0]
      
      // Start downloading the stream
      const downloadResponse = await fetch(`/api/proxy/hls?url=${encodeURIComponent(bestStream.url)}`)
      
      if (!downloadResponse.ok) {
        throw new Error('Failed to download stream')
      }

      // Get the blob
      const blob = await downloadResponse.blob()
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `video_${quality || 'best'}.ts`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      
      setProgress(100)
    } catch (err) {
      console.error('Download error:', err)
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleConvertDownload = async () => {
    setConverting(true)
    setError('')

    try {
      // Use the conversion endpoint
      const response = await fetch('/api/convert/hls-to-mp4', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Conversion failed')
      }

      // Get the blob
      const blob = await response.blob()
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `video_${quality || 'best'}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Conversion error:', err)
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading || converting}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Download</span>
              <span className="sm:hidden">Download</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleConvertDownload}
          disabled={downloading || converting}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
        >
          {converting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Converting...</span>
            </>
          ) : (
            <>
              <FileVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Convert to MP4</span>
              <span className="sm:hidden">MP4</span>
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Quick: Downloads raw stream (.ts) | MP4: Converts on server (requires ffmpeg)
      </p>
    </div>
  )
}
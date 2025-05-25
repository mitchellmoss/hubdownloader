'use client'

import { useState } from 'react'
import { Download, Loader2, AlertCircle, Info } from 'lucide-react'

interface YouTubeDownloaderProps {
  url: string
  quality?: string
  hasAudio?: boolean
  title?: string
}

export default function YouTubeDownloader({ url, quality, hasAudio = true, title }: YouTubeDownloaderProps) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  
  const handleDownload = async () => {
    setDownloading(true)
    setError('')
    
    try {
      // Direct download attempt
      const a = document.createElement('a')
      a.href = url
      a.download = `${title || 'video'}_${quality || 'best'}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download. Try right-clicking and "Save As".')
    } finally {
      setDownloading(false)
    }
  }
  
  if (url.includes('youtube.com/watch')) {
    // This is a YouTube page URL, not a direct video URL
    return (
      <div className="space-y-3">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                YouTube Download Requires Additional Tools
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                YouTube videos cannot be downloaded directly from the browser. 
                For best results, install yt-dlp:
              </p>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                # macOS/Linux<br />
                pip install yt-dlp<br />
                yt-dlp "{url}"<br />
                <br />
                # Windows<br />
                pip install yt-dlp<br />
                yt-dlp.exe "{url}"
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Or use online YouTube downloaders like y2mate.com
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Download {quality || 'Video'}</span>
          </>
        )}
      </button>
      
      {!hasAudio && (
        <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Video only - no audio track
        </p>
      )}
      
      {error && (
        <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        If download doesn't start, right-click and select "Save As"
      </p>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Copy, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import AdUnit from '@/components/AdUnit'
import HLSDownloader from '@/components/HLSDownloader'
import YouTubeDownloader from '@/components/YouTubeDownloader'

interface VideoResult {
  url: string
  type: string
  quality?: string
  format?: string
  size?: string
  title?: string
  hasAudio?: boolean
  isHLS?: boolean
  downloadInstructions?: string
}

interface ExtractionResult {
  id: string
  sourceUrl: string
  videos: VideoResult[]
  extractedAt: string
}

export default function ExtractResultPage() {
  const params = useParams()
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchResult()
  }, [params.id])

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/extract/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch results')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getVideoInfo = (video: VideoResult) => {
    const url = new URL(video.url)
    const filename = url.pathname.split('/').pop() || 'video'
    const extension = filename.split('.').pop()?.toUpperCase() || video.format?.toUpperCase() || 'VIDEO'
    
    return { filename, extension }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading extraction results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error Loading Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Results not found'}</p>
          <a href="/" className="text-blue-600 hover:text-blue-700 underline">
            Try another URL
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Extraction Results</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Found {result.videos.length} video{result.videos.length !== 1 ? 's' : ''} from{' '}
          <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
            {new URL(result.sourceUrl).hostname}
          </a>
        </p>
      </div>

      {/* Top Ad */}
      <div className="mb-8">
        <AdUnit slot="2345678901" format="horizontal" />
      </div>

      {/* Results */}
      <div className="grid gap-4 mb-8">
        {result.videos.map((video, index) => {
          const { filename, extension } = getVideoInfo(video)
          const isCopied = copiedUrl === video.url
          
          // Debug log
          console.log('Video:', { 
            url: video.url, 
            type: video.type, 
            isHLS: video.isHLS,
            format: video.format,
            condition: video.isHLS || video.format === 'm3u8'
          })

          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                      {extension}
                    </span>
                    {video.quality && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                        {video.quality}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-3">
                    {video.url}
                  </p>
                  {/* Direct video file instructions */}
                  {!video.isHLS && video.format !== 'm3u8' && video.format !== 'mpd' && (
                    <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs">
                      <p className="font-semibold text-green-800 dark:text-green-200">Direct Video File</p>
                      <p className="text-green-700 dark:text-green-300 mt-1">
                        Click the download button to save this video directly to your device.
                        If the download doesn't start, right-click on the download button and select "Save link as..."
                      </p>
                    </div>
                  )}
                  {(video.isHLS || video.format === 'm3u8') && (
                    <div className="mt-2 space-y-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs">
                        <p className="font-semibold text-yellow-800 dark:text-yellow-200">HLS Stream</p>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          {video.downloadInstructions || 'Use the download button below or yt-dlp'}
                        </p>
                      </div>
                      
                      <HLSDownloader 
                        url={video.url} 
                        quality={video.quality}
                        sourceUrl={result.sourceUrl}
                      />
                      
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                          Alternative: Use yt-dlp
                        </summary>
                        <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          yt-dlp "{video.url}"
                        </code>
                      </details>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(video.url)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  {video.type !== 'youtube' && (
                    <>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <a
                        href={video.url}
                        download
                        className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                        title="Download"
                        onClick={(e) => {
                          // For direct video files, let browser handle the download
                          // For HLS/DASH, we might need special handling
                          if (video.isHLS || video.format === 'm3u8' || video.format === 'mpd') {
                            e.preventDefault()
                            window.open(video.url, '_blank')
                          }
                        }}
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
              
              {isCopied && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Copied to clipboard!
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
        <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">How to Download:</h3>
        
        {/* Check if we have direct video files */}
        {result.videos.some(v => !v.isHLS && v.format !== 'm3u8' && v.format !== 'mpd') && (
          <div className="mb-4">
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">For Direct Video Files (MP4, WebM, etc.):</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside ml-4">
              <li>Click the blue download button to save the video</li>
              <li>If the download doesn't start automatically, right-click on the download button and select "Save link as..."</li>
              <li>The video will be saved directly to your Downloads folder</li>
            </ol>
          </div>
        )}
        
        {/* Check if we have streaming formats */}
        {result.videos.some(v => v.isHLS || v.format === 'm3u8' || v.format === 'mpd') && (
          <div>
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">For Streaming Formats (HLS/DASH):</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside ml-4">
              <li>Use the built-in downloader for HLS streams</li>
              <li>Or copy the URL and use yt-dlp or similar tools</li>
              <li>These formats require special handling for best results</li>
            </ol>
          </div>
        )}
        
        {result.videos.some(v => v.isHLS || v.format === 'm3u8') && (
          <a 
            href="/hls-guide" 
            className="inline-block mt-3 text-blue-600 hover:text-blue-700 underline font-semibold"
          >
            📖 Complete Guide for Downloading HLS Streams
          </a>
        )}
      </div>

      {/* Bottom Ad */}
      <div className="flex justify-center">
        <AdUnit slot="3456789012" format="rectangle" />
      </div>
    </div>
  )
}
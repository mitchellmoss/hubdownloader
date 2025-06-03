'use client'

import { useState } from 'react'

export default function TestYouTubePage() {
  const [videoUrl, setVideoUrl] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [status, setStatus] = useState('')

  const testExtraction = async () => {
    setStatus('Extracting...')
    
    try {
      // Call Puppeteer endpoint
      const response = await fetch('/api/youtube/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=aj3uBl9hFxY' })
      })
      
      const data = await response.json()
      console.log('Extraction result:', data)
      
      if (data.videos && data.videos.length > 0) {
        setVideoUrl(data.videos[0].url)
        setStatus(`Found ${data.videos.length} videos. First one is ${data.videos[0].quality}`)
      } else {
        setStatus('No videos found')
      }
    } catch (error) {
      console.error('Extraction failed:', error)
      setStatus('Extraction failed: ' + error)
    }
  }

  const testDownload = async () => {
    if (!videoUrl) {
      setStatus('No video URL to download')
      return
    }

    setDownloading(true)
    setStatus('Downloading...')

    try {
      // Try direct download first
      const response = await fetch(videoUrl)
      
      if (!response.ok) {
        throw new Error('Direct download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Create download link
      const a = document.createElement('a')
      a.href = url
      a.download = 'test-video.mp4'
      a.click()
      
      setStatus('Download complete!')
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Direct download failed, trying proxy...')
      
      try {
        // Try with CORS proxy
        const proxyUrl = `/api/proxy/cors?url=${encodeURIComponent(videoUrl)}`
        const response = await fetch(proxyUrl)
        
        if (!response.ok) {
          throw new Error('Proxy download failed')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // Create download link
        const a = document.createElement('a')
        a.href = url
        a.download = 'test-video.mp4'
        a.click()
        
        setStatus('Download complete via proxy!')
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch (proxyError) {
        console.error('Proxy download failed:', proxyError)
        setStatus('Download failed: ' + proxyError)
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">YouTube Download Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testExtraction}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          1. Extract YouTube Video
        </button>

        <button
          onClick={testDownload}
          disabled={!videoUrl || downloading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          2. Download Video
        </button>

        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono text-sm">Status: {status}</p>
          {videoUrl && (
            <p className="font-mono text-xs mt-2 break-all">
              Video URL: {videoUrl.substring(0, 100)}...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
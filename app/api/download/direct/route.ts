import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/simple-rate-limit'
import { createFileRoutingDecision, estimateFileSize, createDownloadResponse } from '@/lib/file-routing'
import { createPresignedUrlResponse } from '@/lib/presigned-urls'

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Check rate limit (20 requests per minute for downloads)
  const rateLimit = await checkRateLimit(request, 20, 60000)
  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      'Too many download requests. Please wait before trying again.',
      rateLimit.resetAt
    )
  }

  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get('url')
  
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter required' },
      { status: 400 }
    )
  }
  
  try {
    console.log('Direct proxy download for:', url)
    
    // Extract filename from URL
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const urlFilename = pathname.split('/').pop() || 'video'
    
    // Determine the filename and content type
    let filename = urlFilename
    let contentType = 'application/octet-stream'
    
    // Map extensions to content types
    const extensionMap: { [key: string]: { type: string, filename: string } } = {
      '.mp4': { type: 'video/mp4', filename: urlFilename || 'video.mp4' },
      '.webm': { type: 'video/webm', filename: urlFilename || 'video.webm' },
      '.avi': { type: 'video/x-msvideo', filename: urlFilename || 'video.avi' },
      '.mov': { type: 'video/quicktime', filename: urlFilename || 'video.mov' },
      '.mkv': { type: 'video/x-matroska', filename: urlFilename || 'video.mkv' },
      '.flv': { type: 'video/x-flv', filename: urlFilename || 'video.flv' },
      '.m3u8': { type: 'application/x-mpegURL', filename: urlFilename || 'playlist.m3u8' },
      '.mpd': { type: 'application/dash+xml', filename: urlFilename || 'manifest.mpd' },
      '.ts': { type: 'video/mp2t', filename: urlFilename || 'video.ts' },
    }
    
    // Check for extension in URL
    for (const [ext, info] of Object.entries(extensionMap)) {
      if (pathname.toLowerCase().includes(ext) || url.toLowerCase().includes(ext)) {
        contentType = info.type
        filename = info.filename
        break
      }
    }
    
    // Determine referer based on URL
    let referer = undefined
    if (url.includes('pornhub')) {
      referer = 'https://www.pornhub.com/'
    } else if (url.includes('xvideos')) {
      referer = 'https://www.xvideos.com/'
    } else if (url.includes('xhamster')) {
      referer = 'https://xhamster.com/'
    }
    
    // First, make a HEAD request to get file size without downloading
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(referer && { 'Referer': referer }),
      },
    })
    
    // Get file size from headers
    const fileSize = estimateFileSize(headResponse.headers)
    
    // Determine routing based on file size
    const { shouldUseDirect, decision } = createFileRoutingDecision(fileSize, filename, headResponse.headers)
    
    console.log(`File routing decision for ${filename}: ${decision.method} (${decision.reason})`)
    
    // If file should be served directly, return presigned URL
    if (shouldUseDirect) {
      return NextResponse.json(
        createPresignedUrlResponse(
          url, // Using URL as file path for remote files
          fileSize,
          url,
          filename
        )
      )
    }
    
    // For small files, continue with streaming through tunnel
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(referer && { 'Referer': referer }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
    }
    
    // Get the actual content type from response if available
    const responseContentType = response.headers.get('content-type')
    if (responseContentType && responseContentType.includes('video')) {
      contentType = responseContentType
    }
    
    // Get the content length if available
    const contentLength = response.headers.get('content-length')
    
    // Stream the response directly to the client
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    })
    
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }
    
    // Return the stream
    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
    
  } catch (error) {
    console.error('Direct download error:', error)
    return NextResponse.json(
      { error: 'Failed to download video' },
      { status: 500 }
    )
  }
}
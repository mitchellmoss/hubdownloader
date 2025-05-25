import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    
    // Determine the filename and content type
    let filename = 'video'
    let contentType = 'application/octet-stream'
    
    if (url.includes('.mp4')) {
      filename = 'video.mp4'
      contentType = 'video/mp4'
    } else if (url.includes('.m3u8')) {
      filename = 'playlist.m3u8'
      contentType = 'application/x-mpegURL'
    } else if (url.includes('.ts')) {
      filename = 'video.ts'
      contentType = 'video/mp2t'
    }
    
    // Fetch the video with appropriate headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': url.includes('pornhub') ? 'https://www.pornhub.com/' : undefined,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`)
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
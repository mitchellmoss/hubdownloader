import { NextRequest, NextResponse } from 'next/server'
import { validatePresignedUrl } from '@/lib/presigned-urls'

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

/**
 * This endpoint handles presigned URL downloads for the direct download server.
 * It validates the presigned URL and either proxies the file or serves it directly.
 */
export async function GET(request: NextRequest) {
  try {
    // Validate the presigned URL
    const validation = validatePresignedUrl(request.url)
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid presigned URL' },
        { status: 403 }
      )
    }
    
    const { filePath, fileSize, originalDomain } = validation.data!
    
    console.log(`Serving presigned download: ${filePath} (${fileSize} bytes)`)
    
    // Determine if this is a local file or remote URL
    const isRemoteUrl = filePath.startsWith('http://') || filePath.startsWith('https://')
    
    if (isRemoteUrl) {
      // For remote URLs, proxy the download
      const headers: HeadersInit = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
      
      // Add referer for specific domains
      if (originalDomain.includes('pornhub')) {
        headers['Referer'] = 'https://www.pornhub.com/'
      } else if (originalDomain.includes('xvideos')) {
        headers['Referer'] = 'https://www.xvideos.com/'
      } else if (originalDomain.includes('xhamster')) {
        headers['Referer'] = 'https://xhamster.com/'
      } else if (originalDomain) {
        headers['Referer'] = `https://${originalDomain}/`
      }
      
      const response = await fetch(filePath, { headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }
      
      // Extract filename from URL
      const urlFilename = new URL(filePath).pathname.split('/').pop() || 'download'
      
      // Determine content type
      let contentType = response.headers.get('content-type') || 'application/octet-stream'
      
      // Stream the response
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${urlFilename}"`,
          'Content-Length': fileSize.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*',
        },
      })
      
    } else {
      // For local files (e.g., converted MP4s), we would serve them directly
      // This would require file system access on the direct download server
      // For now, return an error as this needs server-specific implementation
      return NextResponse.json(
        { 
          error: 'Local file serving not implemented',
          note: 'This endpoint needs to be configured on the direct download server'
        },
        { status: 501 }
      )
    }
    
  } catch (error) {
    console.error('Presigned download error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Download failed'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
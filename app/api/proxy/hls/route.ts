import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, createRateLimitResponse } from '@/lib/simple-rate-limit'

const proxySchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
  // Check rate limit (30 requests per minute for proxy)
  const rateLimit = await checkRateLimit(request, 30, 60000)
  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      'Too many proxy requests. Please wait before trying again.',
      rateLimit.resetAt
    )
  }

  try {
    const body = await request.json()
    const { url } = proxySchema.parse(body)
    
    // Only allow HLS URLs
    if (!url.includes('.m3u8')) {
      return NextResponse.json(
        { error: 'Only HLS streams are supported' },
        { status: 400 }
      )
    }
    
    console.log('Proxying HLS stream:', url)
    
    // Determine the referer from the URL
    const urlObj = new URL(url)
    const referer = `${urlObj.protocol}//${urlObj.hostname}/`
    
    // Fetch the master playlist
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': referer,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch HLS stream: ${response.status}`)
    }
    
    const masterPlaylist = await response.text()
    
    // Parse the master playlist to find the best quality stream
    const lines = masterPlaylist.split('\n')
    const streams: Array<{ url: string, bandwidth: number, resolution: string }> = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/)
        const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/)
        
        if (bandwidthMatch && i + 1 < lines.length) {
          const streamUrl = lines[i + 1].trim()
          if (streamUrl && !streamUrl.startsWith('#')) {
            // Construct full URL
            const baseUrl = url.substring(0, url.lastIndexOf('/'))
            const fullStreamUrl = streamUrl.startsWith('http') 
              ? streamUrl 
              : `${baseUrl}/${streamUrl}`
            
            streams.push({
              url: fullStreamUrl,
              bandwidth: parseInt(bandwidthMatch[1]),
              resolution: resolutionMatch ? resolutionMatch[1] : 'unknown',
            })
          }
        }
      }
    }
    
    // Sort by bandwidth (highest quality first)
    streams.sort((a, b) => b.bandwidth - a.bandwidth)
    
    if (streams.length === 0) {
      // This might be a segment playlist, not a master playlist
      // Check if it contains .ts segments directly
      const hasSegments = lines.some(line => line.trim().endsWith('.ts'))
      
      if (hasSegments) {
        console.log('Direct segment playlist detected, using original URL')
        // Return the original URL as the only stream
        return NextResponse.json({
          streams: [{
            url: url,
            quality: 'Direct',
            bandwidth: 0,
          }],
          masterUrl: url,
        })
      }
      
      return NextResponse.json(
        { error: 'No video streams found in playlist' },
        { status: 404 }
      )
    }
    
    // Return the available streams
    return NextResponse.json({
      streams: streams.map(s => ({
        url: s.url,
        quality: s.resolution,
        bandwidth: s.bandwidth,
      })),
      masterUrl: url,
    })
    
  } catch (error) {
    console.error('HLS proxy error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error:', errorMessage)
    
    return NextResponse.json(
      { error: `Failed to process HLS stream: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET endpoint to stream the actual video data
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
    // Determine the referer from the URL
    const urlObj = new URL(url)
    const referer = `${urlObj.protocol}//${urlObj.hostname}/`
    
    // Fetch the segment playlist
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': referer,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`)
    }
    
    const playlist = await response.text()
    const baseUrl = url.substring(0, url.lastIndexOf('/'))
    
    // Parse segment playlist and get all .ts segments
    const segments: string[] = []
    const lines = playlist.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        // Check for various segment formats (.ts, .m4s, or just paths)
        if (trimmed.includes('.ts') || trimmed.includes('.m4s') || trimmed.match(/^[a-zA-Z0-9_\-]+$/)) {
          const segmentUrl = trimmed.startsWith('http') 
            ? trimmed 
            : `${baseUrl}/${trimmed}`
          segments.push(segmentUrl)
        }
      }
    }
    
    console.log(`Found ${segments.length} segments to download`)
    
    // Debug: Show first few segments
    if (segments.length > 0) {
      console.log('First segment:', segments[0])
      console.log('Playlist preview:', playlist.substring(0, 500))
    }
    
    // Create a readable stream that fetches and concatenates all segments
    const stream = new ReadableStream({
      async start(controller) {
        let successfulSegments = 0
        let totalBytes = 0
        
        try {
          for (let i = 0; i < segments.length; i++) {
            console.log(`Fetching segment ${i + 1}/${segments.length}: ${segments[i]}`)
            
            const segmentResponse = await fetch(segments[i], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer,
                'Origin': referer,
              },
            })
            
            if (!segmentResponse.ok) {
              console.error(`Failed to fetch segment ${i + 1}:`, segmentResponse.status, segmentResponse.statusText)
              continue
            }
            
            const segmentData = await segmentResponse.arrayBuffer()
            const bytes = segmentData.byteLength
            
            if (bytes === 0) {
              console.warn(`Segment ${i + 1} is empty (0 bytes)`)
              continue
            }
            
            console.log(`Segment ${i + 1} downloaded: ${bytes} bytes`)
            totalBytes += bytes
            successfulSegments++
            
            controller.enqueue(new Uint8Array(segmentData))
          }
          
          console.log(`Download complete: ${successfulSegments}/${segments.length} segments, ${totalBytes} total bytes`)
          
          if (successfulSegments === 0) {
            throw new Error('No segments were successfully downloaded')
          }
          
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      },
    })
    
    // Return the stream as a downloadable video file
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'video/mp2t',
        'Content-Disposition': 'attachment; filename="video.ts"',
        'Cache-Control': 'no-cache',
      },
    })
    
  } catch (error) {
    console.error('Stream proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    )
  }
}
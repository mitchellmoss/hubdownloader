import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const proxySchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
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
    
    // Fetch the master playlist
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
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
    
    return NextResponse.json(
      { error: 'Failed to process HLS stream' },
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
    // Fetch the segment playlist
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.pornhub.com/',
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
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('.ts')) {
        const segmentUrl = trimmed.startsWith('http') 
          ? trimmed 
          : `${baseUrl}/${trimmed}`
        segments.push(segmentUrl)
      }
    }
    
    console.log(`Found ${segments.length} segments to download`)
    
    // Create a readable stream that fetches and concatenates all segments
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (let i = 0; i < segments.length; i++) {
            console.log(`Fetching segment ${i + 1}/${segments.length}`)
            
            const segmentResponse = await fetch(segments[i], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.pornhub.com/',
              },
            })
            
            if (!segmentResponse.ok) {
              console.error(`Failed to fetch segment ${i + 1}:`, segmentResponse.status)
              continue
            }
            
            const segmentData = await segmentResponse.arrayBuffer()
            controller.enqueue(new Uint8Array(segmentData))
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
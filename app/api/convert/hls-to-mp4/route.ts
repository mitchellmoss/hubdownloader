import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { downloadHLSToMP4, cleanupHLSDownload } from '@/lib/hls-downloader'

const convertSchema = z.object({
  url: z.string().url(),
  sourceUrl: z.string().url().optional(),  // Original page URL (e.g. YouTube URL)
  quality: z.string().optional(),  // User's selected quality (e.g. "720p", "1080p")
})

export async function POST(request: NextRequest) {
  let outputFile: string | null = null
  
  try {
    const body = await request.json()
    const { url, sourceUrl, quality } = convertSchema.parse(body)
    
    // Only allow HLS URLs
    if (!url.includes('.m3u8')) {
      return NextResponse.json(
        { error: 'Only HLS streams are supported' },
        { status: 400 }
      )
    }
    
    console.log('Starting HLS to MP4 conversion:')
    console.log('  HLS URL:', url)
    console.log('  Source URL:', sourceUrl || 'NOT PROVIDED')
    console.log('  Quality:', quality || 'best (default)')
    console.log('  Raw body quality:', body.quality)  // Debug the raw value
    if (sourceUrl) {
      console.log('  Using source URL for yt-dlp (better quality)')
    } else {
      console.log('  WARNING: No source URL provided, using HLS URL directly')
    }
    
    // Download and convert HLS to MP4
    // If we have a sourceUrl (original YouTube URL), use that with yt-dlp for better results
    outputFile = await downloadHLSToMP4({
      url: sourceUrl || url,  // Prefer sourceUrl for yt-dlp
      hlsUrl: url,  // Keep the HLS URL as fallback
      quality,  // Pass user's quality selection
      onProgress: (percent, message) => {
        console.log(`Progress: ${percent.toFixed(1)}% - ${message}`)
      }
    })
    
    // Get file stats
    const stats = await stat(outputFile)
    console.log(`Conversion complete. File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
    
    // Stream the file to the response
    const fileStream = createReadStream(outputFile)
    const stream = new ReadableStream({
      async start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        
        fileStream.on('end', () => {
          console.log('File streaming completed')
          controller.close()
          // Clean up after streaming
          if (outputFile) {
            cleanupHLSDownload(outputFile).catch(console.error)
          }
        })
        
        fileStream.on('error', (error) => {
          console.error('File streaming error:', error)
          controller.error(error)
          if (outputFile) {
            cleanupHLSDownload(outputFile).catch(console.error)
          }
        })
      },
      
      cancel() {
        fileStream.destroy()
        if (outputFile) {
          cleanupHLSDownload(outputFile).catch(console.error)
        }
      }
    })
    
    // Return the stream as MP4
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="video.mp4"',
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      },
    })
    
  } catch (error) {
    console.error('Conversion error:', error)
    
    // Clean up on error
    if (outputFile) {
      cleanupHLSDownload(outputFile).catch(console.error)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Conversion failed'
    
    // Check if yt-dlp is needed
    if (errorMessage.includes('incomplete')) {
      return NextResponse.json(
        { 
          error: 'Failed to download complete video. For better results, install yt-dlp: brew install yt-dlp',
          details: errorMessage
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { downloadHLSToMP4, cleanupHLSDownload } from '@/lib/hls-downloader'

const convertSchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
  let outputFile: string | null = null
  
  try {
    const body = await request.json()
    const { url } = convertSchema.parse(body)
    
    // Only allow HLS URLs
    if (!url.includes('.m3u8')) {
      return NextResponse.json(
        { error: 'Only HLS streams are supported' },
        { status: 400 }
      )
    }
    
    console.log('Starting HLS to MP4 conversion:', url)
    
    // Download and convert HLS to MP4
    outputFile = await downloadHLSToMP4({
      url,
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
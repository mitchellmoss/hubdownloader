import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { spawn } from 'child_process'
import { Readable } from 'stream'

const convertSchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
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
    
    console.log('Converting HLS to MP4:', url)
    
    // Use ffmpeg to convert HLS to MP4
    const ffmpeg = spawn('ffmpeg', [
      '-i', url,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-movflags', 'frag_keyframe+empty_moov',
      '-f', 'mp4',
      '-'
    ])
    
    // Create a readable stream from ffmpeg output
    const stream = new ReadableStream({
      start(controller) {
        ffmpeg.stdout.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        
        ffmpeg.stdout.on('end', () => {
          controller.close()
        })
        
        ffmpeg.stderr.on('data', (data) => {
          console.log('FFmpeg:', data.toString())
        })
        
        ffmpeg.on('error', (error) => {
          console.error('FFmpeg error:', error)
          controller.error(error)
        })
      },
      
      cancel() {
        ffmpeg.kill()
      }
    })
    
    // Return the stream as MP4
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="video.mp4"',
        'Cache-Control': 'no-cache',
      },
    })
    
  } catch (error) {
    console.error('Conversion error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to convert video. Make sure ffmpeg is installed.' },
      { status: 500 }
    )
  }
}
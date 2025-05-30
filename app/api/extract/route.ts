import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { extractVideoUrls } from '@/lib/puppeteer'
import { simpleExtractVideoUrls } from '@/lib/simple-extractor'
import { extractAdultVideoUrls } from '@/lib/adult-extractor'
import { extractYouTubeVideo } from '@/lib/youtube-extractor'
import { checkRateLimit, createRateLimitResponse } from '@/lib/simple-rate-limit'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

// In-memory storage for demo (replace with database in production)
const extractionResults = new Map<string, any>()

// Clean up old results after 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  for (const [id, result] of extractionResults.entries()) {
    if (new Date(result.extractedAt).getTime() < oneHourAgo) {
      extractionResults.delete(id)
    }
  }
}, 10 * 60 * 1000) // Check every 10 minutes

const extractSchema = z.object({
  url: z.string().url(),
})

export async function POST(request: NextRequest) {
  // Declare variables at function scope for error tracking
  let id: string | undefined
  let url: string | undefined
  
  try {
    // Check rate limit (10 requests per minute)
    const rateLimit = await checkRateLimit(request, 10, 60000)
    if (!rateLimit.allowed) {
      return createRateLimitResponse(
        'Too many extraction requests. Please wait before trying again.',
        rateLimit.resetAt
      )
    }
    
    const body = await request.json()
    
    // Validate input
    const parsed = extractSchema.parse(body)
    url = parsed.url
    
    // Generate unique ID
    id = nanoid()
    
    // Extract video URLs
    let videos: Array<{ url: string; quality?: string; type?: string; isHLS?: boolean }> = []
    
    // Check if it's YouTube
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
    
    // Check if it's an adult site URL
    const isAdultSite = url.includes('pornhub.com') || 
                       url.includes('xvideos.com') || 
                       url.includes('xhamster.com')
    
    if (isYouTube) {
      console.log('Detected YouTube, using specialized extractor')
      try {
        videos = await extractYouTubeVideo(url)
      } catch (error) {
        console.error('YouTube extractor failed:', error)
        videos = []
      }
      
      // Always try main extractor for YouTube to catch HLS streams
      if (!videos || videos.length === 0) {
        console.log('YouTube extractor returned no results, using main extractor to find HLS streams')
        try {
          videos = await extractVideoUrls(url)
        } catch (error) {
          console.error('Main extractor also failed:', error)
          videos = []
        }
      }
    } else if (isAdultSite) {
      console.log('Detected adult site, using specialized extractor')
      videos = await extractAdultVideoUrls(url)
      
      // If adult extractor fails, try main extractor
      if (!videos || videos.length === 0) {
        console.log('Adult extractor returned no results, trying main extractor')
        try {
          videos = await extractVideoUrls(url)
        } catch (error) {
          console.error('Main extractor also failed:', error)
          videos = []
        }
      }
    } else {
      // For non-adult sites, use regular extractors
      try {
        videos = await extractVideoUrls(url)
      } catch (mainError) {
        console.error('Main extractor failed, trying simple extractor:', mainError)
        // Fallback to simple extractor
        videos = await simpleExtractVideoUrls(url)
      }
    }
    
    // Get request metadata
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Detect video format
    let format: string | null = null
    if (videos.length > 0) {
      const firstVideo = videos[0]
      if (firstVideo.isHLS || firstVideo.url.includes('.m3u8')) {
        format = 'hls'
      } else if (firstVideo.url.includes('.mpd')) {
        format = 'dash'
      } else if (firstVideo.url.includes('.mp4')) {
        format = 'mp4'
      } else if (firstVideo.url.includes('.webm')) {
        format = 'webm'
      } else {
        format = 'other'
      }
    }
    
    // Store in database
    const extraction = await prisma.extraction.create({
      data: {
        id,
        sourceUrl: url,
        videoCount: videos.length,
        videos: JSON.stringify(videos),
        format,
        success: true,
        userIp: ip,
        userAgent,
      },
    })
    
    // Return extraction ID
    return NextResponse.json({ id, videoCount: videos.length })
    
  } catch (error) {
    console.error('Extraction error:', error)
    
    // Try to save failed extraction to database
    try {
      if (id && url) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'
        
        await prisma.extraction.create({
          data: {
            id,
            sourceUrl: url,
            videoCount: 0,
            videos: JSON.stringify([]),
            format: null,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            userIp: ip,
            userAgent,
          },
        })
      }
    } catch (dbError) {
      console.error('Failed to save error to database:', dbError)
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }
    
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Page took too long to load. Please try again.' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to extract videos. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// Remove this export - it's not a valid Next.js route export
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, createRateLimitResponse } from '@/lib/simple-rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check rate limit (60 requests per minute for results)
  const rateLimit = await checkRateLimit(request, 60, 60000)
  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      'Too many requests. Please wait before trying again.',
      rateLimit.resetAt
    )
  }

  try {
    const extraction = await prisma.extraction.findUnique({
      where: { id: params.id }
    })
    
    if (!extraction) {
      return NextResponse.json(
        { error: 'Extraction result not found' },
        { status: 404 }
      )
    }
    
    // Parse videos JSON and format response
    const result = {
      id: extraction.id,
      sourceUrl: extraction.sourceUrl,
      videos: JSON.parse(extraction.videos),
      extractedAt: extraction.createdAt.toISOString(),
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching extraction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch extraction result' },
      { status: 500 }
    )
  }
}
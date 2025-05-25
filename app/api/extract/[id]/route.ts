import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { rateLimitMiddleware, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check rate limit for results endpoint
  const rateLimitResponse = await rateLimitMiddleware(request, RATE_LIMIT_CONFIGS.results)
  if (rateLimitResponse) {
    return rateLimitResponse
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
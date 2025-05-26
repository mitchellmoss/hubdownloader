import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get IP from request
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1'
    
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    
    // Get current rate limits for this IP
    const rateLimits = await prisma.rateLimit.findMany({
      where: {
        key: {
          contains: ip
        },
        expiresAt: {
          gte: now
        }
      },
      orderBy: {
        expiresAt: 'desc'
      }
    })
    
    // Calculate remaining requests for each endpoint
    const limits = {
      extraction: { used: 0, limit: 10, remaining: 10 },
      conversion: { used: 0, limit: 5, remaining: 5 },
      proxy: { used: 0, limit: 30, remaining: 30 },
      download: { used: 0, limit: 20, remaining: 20 },
      results: { used: 0, limit: 60, remaining: 60 }
    }
    
    // Since we're using a single rate limit table, we can't distinguish between endpoints
    // In a production app, you'd want to add an endpoint field to the RateLimit model
    const currentUsage = rateLimits[0]?.count || 0
    
    return NextResponse.json({
      ip,
      status: 'Rate limits are active',
      limits: {
        extraction: {
          used: currentUsage,
          limit: 10,
          remaining: Math.max(0, 10 - currentUsage),
          resetsAt: rateLimits[0] ? rateLimits[0].expiresAt.toISOString() : null
        },
        conversion: {
          used: 0,
          limit: 5,
          remaining: 5,
          resetsAt: null
        },
        proxy: {
          used: 0,
          limit: 30,
          remaining: 30,
          resetsAt: null
        },
        download: {
          used: 0,
          limit: 20,
          remaining: 20,
          resetsAt: null
        },
        results: {
          used: 0,
          limit: 60,
          remaining: 60,
          resetsAt: null
        }
      },
      headers: {
        'X-RateLimit-Limit': 'Varies by endpoint',
        'X-RateLimit-Remaining': 'Check individual endpoints',
        'X-RateLimit-Reset': 'Check individual endpoints'
      }
    })
  } catch (error) {
    console.error('Rate limit status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate limit status' },
      { status: 500 }
    )
  }
}
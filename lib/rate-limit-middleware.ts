import { prisma } from './db'
import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number // in milliseconds
  message?: string
  keyGenerator?: (request: NextRequest) => string
}

const defaultKeyGenerator = (request: NextRequest): string => {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         '127.0.0.1'
}

export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const {
    maxRequests,
    windowMs,
    message = 'Too many requests. Please try again later.',
    keyGenerator = defaultKeyGenerator
  } = config

  const identifier = keyGenerator(request)
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  try {
    // Clean up old rate limit records
    await prisma.rateLimit.deleteMany({
      where: {
        window: {
          lt: windowStart
        }
      }
    })

    // Get current window's requests
    const rateLimit = await prisma.rateLimit.findFirst({
      where: {
        identifier,
        window: {
          gte: windowStart
        }
      },
      orderBy: {
        window: 'desc'
      }
    })

    if (!rateLimit) {
      // Create new rate limit record
      await prisma.rateLimit.create({
        data: {
          identifier,
          count: 1,
          window: now
        }
      })
      return null // Allow request
    }

    // Check if limit exceeded
    if (rateLimit.count >= maxRequests) {
      // Calculate retry after
      const retryAfter = Math.ceil((rateLimit.window.getTime() + windowMs - now.getTime()) / 1000)
      
      const response = NextResponse.json(
        { 
          error: message,
          retryAfter 
        },
        { status: 429 }
      )
      
      // Add rate limit headers
      response.headers.set('Retry-After', retryAfter.toString())
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', new Date(rateLimit.window.getTime() + windowMs).toISOString())
      
      return response
    }

    // Increment count
    await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { count: rateLimit.count + 1 }
    })

    // Add rate limit headers to help clients
    const remaining = maxRequests - rateLimit.count - 1
    const reset = new Date(rateLimit.window.getTime() + windowMs)

    // Return null to continue with the request, but we'll need to add headers in the actual response
    // Store them in the request for later use
    (request as any).rateLimitHeaders = {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toISOString()
    }

    return null // Allow request
  } catch (error) {
    console.error('Rate limit check error:', error)
    return null // Allow request on error
  }
}

// Preset configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  extraction: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many extraction requests. Please wait before trying again.'
  },
  conversion: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many conversion requests. Please wait before trying again.'
  },
  download: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many download requests. Please wait before trying again.'
  },
  proxy: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many proxy requests. Please wait before trying again.'
  },
  results: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please wait before trying again.'
  }
}
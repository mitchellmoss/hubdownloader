import { prisma } from './db'
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<RateLimitResult> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1'
  
  const now = new Date()
  const windowEnd = new Date(now.getTime() + windowMs)
  const key = `extract_${ip}`
  
  try {
    // Clean expired records
    await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })
    
    // Get current rate limit
    const current = await prisma.rateLimit.findUnique({
      where: {
        key
      }
    })
    
    if (!current || current.expiresAt < now) {
      // First request in window or expired
      await prisma.rateLimit.upsert({
        where: { key },
        update: {
          count: 1,
          expiresAt: windowEnd
        },
        create: {
          key,
          count: 1,
          expiresAt: windowEnd
        }
      })
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: windowEnd
      }
    }
    
    // Check if exceeded
    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.expiresAt
      }
    }
    
    // Increment count
    await prisma.rateLimit.update({
      where: { key },
      data: { count: current.count + 1 }
    })
    
    return {
      allowed: true,
      remaining: maxRequests - current.count - 1,
      resetAt: current.expiresAt
    }
  } catch (error) {
    console.error('Rate limit error:', error)
    // Allow on error
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now.getTime() + windowMs)
    }
  }
}

export function createRateLimitResponse(message: string, resetAt: Date): NextResponse {
  const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000)
  
  return new NextResponse(
    JSON.stringify({ 
      error: message,
      retryAfter 
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': resetAt.toISOString()
      }
    }
  )
}
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
  const windowStart = new Date(now.getTime() - windowMs)
  
  try {
    // Clean old records
    await prisma.rateLimit.deleteMany({
      where: {
        window: {
          lt: windowStart
        }
      }
    })
    
    // Get current rate limit
    const current = await prisma.rateLimit.findFirst({
      where: {
        identifier: ip,
        window: {
          gte: windowStart
        }
      },
      orderBy: {
        window: 'desc'
      }
    })
    
    if (!current) {
      // First request in window
      await prisma.rateLimit.create({
        data: {
          identifier: ip,
          count: 1,
          window: now
        }
      })
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now.getTime() + windowMs)
      }
    }
    
    // Check if exceeded
    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(current.window.getTime() + windowMs)
      }
    }
    
    // Increment count
    await prisma.rateLimit.update({
      where: { id: current.id },
      data: { count: current.count + 1 }
    })
    
    return {
      allowed: true,
      remaining: maxRequests - current.count - 1,
      resetAt: new Date(current.window.getTime() + windowMs)
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
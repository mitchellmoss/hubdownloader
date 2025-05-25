import { prisma } from './db'
import { NextRequest } from 'next/server'

export async function checkRateLimit(request: NextRequest): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             '127.0.0.1'
  
  const now = new Date()
  const windowStart = new Date(now.getTime() - 60 * 1000) // 1 minute window
  
  try {
    // Get or create rate limit record
    const rateLimit = await prisma.rateLimit.findFirst({
      where: {
        identifier: ip,
        window: {
          gte: windowStart,
        },
      },
    })
    
    if (!rateLimit) {
      // Create new rate limit record
      await prisma.rateLimit.upsert({
        where: { identifier: ip },
        update: { count: 1, window: now },
        create: {
          identifier: ip,
          count: 1,
          window: now,
        },
      })
      return true
    }
    
    // Check if limit exceeded (10 requests per minute)
    if (rateLimit.count >= 10) {
      return false
    }
    
    // Increment count
    await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: { count: rateLimit.count + 1 },
    })
    
    return true
  } catch (error) {
    console.error('Rate limit check error:', error)
    return true // Allow request on error
  }
}
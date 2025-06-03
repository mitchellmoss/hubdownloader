/**
 * Minimal extraction endpoint for client-side architecture
 * Only handles rate limiting and basic validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleRateLimit } from '@/lib/simple-rate-limit';
import { nanoid } from 'nanoid';

const extractSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await simpleRateLimit(request, 'extract', 20); // 20 requests/minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
          }
        }
      );
    }

    // Parse request
    const body = await request.json();
    const { url } = extractSchema.parse(body);

    // Generate extraction ID
    const extractionId = nanoid();

    // Return extraction ID and URL for client-side processing
    return NextResponse.json({
      id: extractionId,
      url,
      message: 'Process this URL client-side',
      timestamp: Date.now()
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
      }
    });

  } catch (error) {
    console.error('Extract API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
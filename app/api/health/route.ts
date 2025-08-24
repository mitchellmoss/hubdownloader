import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check - just return OK status
    // Avoid heavy operations like Puppeteer for health checks
    return NextResponse.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'lyricless'
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
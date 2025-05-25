import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Puppeteer launch...')
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: process.platform === 'darwin' 
        ? ['--disable-gpu', '--disable-dev-shm-usage']
        : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    })
    
    console.log('Browser launched successfully')
    
    const page = await browser.newPage()
    await page.goto('https://example.com')
    const title = await page.title()
    
    await browser.close()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Puppeteer is working correctly',
      pageTitle: title,
      platform: process.platform
    })
  } catch (error) {
    console.error('Puppeteer test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      platform: process.platform
    }, { status: 500 })
  }
}
/**
 * YouTube video download endpoint using Puppeteer
 * This bypasses CORS and IP restrictions by downloading server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const { url, quality = '360p' } = await request.json();
    
    if (!url || !url.includes('youtube.com/watch')) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Starting YouTube download for: ${url}`);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    let videoData: Buffer | null = null;
    let videoUrl: string | null = null;

    // Intercept video requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      // Allow all requests
      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      
      // Check if this is a video URL
      if (url.includes('googlevideo.com/videoplayback') && 
          url.includes('mime=video') &&
          (url.includes('itag=18') || url.includes('itag=22'))) { // 360p or 720p
        
        console.log('Found video URL:', url.substring(0, 100) + '...');
        
        try {
          // Download the video data
          const buffer = await response.buffer();
          if (buffer.length > 1000000) { // Only save if > 1MB
            videoData = buffer;
            videoUrl = url;
            console.log(`Downloaded video: ${buffer.length} bytes`);
          }
        } catch (err) {
          console.error('Failed to download video:', err);
        }
      }
    });

    // Navigate to YouTube
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait a bit for video to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to click play button if needed
    try {
      await page.click('button[aria-label*="Play"]', { timeout: 2000 });
    } catch (err) {
      // Video might already be playing
    }

    // Wait for video data
    await new Promise(resolve => setTimeout(resolve, 5000));

    await browser.close();

    if (videoData) {
      // Return the video as a stream
      return new NextResponse(videoData, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="youtube-video.mp4"',
          'Content-Length': videoData.length.toString(),
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to capture video data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('YouTube download error:', error);
    return NextResponse.json(
      { error: 'Download failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
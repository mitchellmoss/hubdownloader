/**
 * YouTube video download endpoint that extracts and downloads in one step
 * This avoids URL expiration issues
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

    console.log(`Starting YouTube download for: ${url} at ${quality}`);
    
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
    
    // Set up request interception to find video URL
    await page.setRequestInterception(true);
    
    let targetVideoUrl: string | null = null;
    
    page.on('request', (request) => {
      request.continue();
    });

    // Also monitor responses to get video URLs
    page.on('response', async (response) => {
      const url = response.url();
      
      // Check if this is a video request
      if (url.includes('googlevideo.com/videoplayback') && 
          url.includes('mime=video')) {
        
        console.log('Found potential video URL:', url.substring(0, 100) + '...');
        
        // Check for specific quality
        if (url.includes('itag=18')) { // 360p
          targetVideoUrl = url;
          console.log('Found 360p video URL');
        } else if (url.includes('itag=22')) { // 720p
          if (!targetVideoUrl || quality === '720p') {
            targetVideoUrl = url;
            console.log('Found 720p video URL');
          }
        } else if (!targetVideoUrl) {
          // Accept any video URL if we haven't found one yet
          targetVideoUrl = url;
          console.log('Found video URL (unknown quality)');
        }
      }
    });

    // Navigate to YouTube
    console.log('Navigating to YouTube...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait a bit for video to load
    console.log('Waiting for video to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Try to click play button if needed
    try {
      console.log('Attempting to click play button...');
      await page.click('button[aria-label*="Play"]', { timeout: 3000 });
      console.log('Clicked play button');
    } catch (err) {
      console.log('Could not click play button - video might be playing already');
    }

    // Wait for video URL to be captured
    console.log('Waiting for video URL to be captured...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await browser.close();
    browser = null;

    if (!targetVideoUrl) {
      return NextResponse.json(
        { error: 'Failed to find video URL' },
        { status: 500 }
      );
    }

    console.log('Found video URL, downloading...');

    // Now download the video using the fresh URL
    const videoResponse = await fetch(targetVideoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!videoResponse.ok) {
      console.error('Failed to download video:', videoResponse.status);
      return NextResponse.json(
        { error: `Failed to download video: ${videoResponse.status}` },
        { status: 500 }
      );
    }

    // Get the video stream
    const stream = videoResponse.body;
    if (!stream) {
      return NextResponse.json(
        { error: 'No video stream' },
        { status: 500 }
      );
    }

    // Return the video stream
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="youtube-video.mp4"',
        'Cache-Control': 'no-cache',
        // Forward content length if available
        ...(videoResponse.headers.get('content-length') ? {
          'Content-Length': videoResponse.headers.get('content-length')!
        } : {})
      }
    });

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
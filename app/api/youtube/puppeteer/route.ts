/**
 * Puppeteer-based YouTube extraction endpoint
 * Uses headless browser to extract video URLs from YouTube
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { z } from 'zod';

const requestSchema = z.object({
  url: z.string().url().refine(url => url.includes('youtube.com') || url.includes('youtu.be')),
});

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    console.log('Starting Puppeteer extraction for:', url);

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    
    const videoUrls: Array<{
      url: string;
      quality?: string;
      format?: string;
    }> = [];

    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images, fonts, and stylesheets to speed up loading
      if (['image', 'font', 'stylesheet'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Intercept video requests
    page.on('response', async (response) => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      // Check for video URLs
      if (url.includes('googlevideo.com/videoplayback') || 
          url.includes('.m3u8') ||
          contentType.includes('video/') ||
          contentType.includes('application/x-mpegURL')) {
        
        // Extract quality from URL
        let quality = 'unknown';
        const itagMatch = url.match(/itag=(\d+)/);
        if (itagMatch) {
          const itag = parseInt(itagMatch[1]);
          // Common YouTube itags
          const itagMap: Record<number, string> = {
            18: '360p',
            22: '720p',
            37: '1080p',
            43: '360p',
            44: '480p',
            45: '720p',
            46: '1080p',
          };
          quality = itagMap[itag] || quality;
        }

        // Check for HLS
        const format = url.includes('.m3u8') ? 'hls' : 'mp4';

        // Only add if it's a complete video URL with parameters
        if (url.includes('mime=video') && url.length > 200) {
          videoUrls.push({ url, quality, format });
          console.log(`Found video: ${quality} ${format}`);
          console.log(`URL length: ${url.length}`);
          console.log(`URL preview: ${url.substring(0, 150)}...`);
        }
      }
    });

    // Navigate to YouTube page
    console.log('Navigating to YouTube...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to click play button if video is paused
    try {
      await page.click('button.ytp-large-play-button', { timeout: 2000 });
      console.log('Clicked play button');
    } catch (e) {
      console.log('Play button not found or video already playing');
    }

    // Wait for more video URLs to be captured
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extract video title
    let title = 'Unknown';
    try {
      title = await page.$eval('h1.ytd-video-primary-info-renderer', el => el.textContent?.trim() || 'Unknown');
    } catch (e) {
      try {
        title = await page.title();
      } catch (e2) {
        console.log('Could not extract title');
      }
    }

    // If no videos found, try to extract from page source
    if (videoUrls.length === 0) {
      console.log('No videos intercepted, trying page evaluation...');
      
      const pageVideos = await page.evaluate(() => {
        const videos: any[] = [];
        
        // Try to find ytInitialPlayerResponse
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          if (text.includes('ytInitialPlayerResponse')) {
            const match = text.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
            if (match) {
              try {
                const playerResponse = JSON.parse(match[1]);
                const streamingData = playerResponse.streamingData || {};
                
                // Add formats
                if (streamingData.formats) {
                  streamingData.formats.forEach((f: any) => {
                    if (f.url) {
                      videos.push({
                        url: f.url,
                        quality: f.qualityLabel || f.quality || 'unknown',
                        format: 'mp4'
                      });
                    }
                  });
                }
                
                // Add HLS if available
                if (streamingData.hlsManifestUrl) {
                  videos.push({
                    url: streamingData.hlsManifestUrl,
                    quality: 'auto',
                    format: 'hls'
                  });
                }
              } catch (e) {
                console.error('Failed to parse player response');
              }
            }
          }
        }
        
        return videos;
      });
      
      videoUrls.push(...pageVideos);
    }

    await browser.close();

    // Filter and deduplicate
    const uniqueUrls = Array.from(new Map(
      videoUrls.map(v => [v.url, v])
    ).values());

    // Sort by quality preference (prefer lower quality for faster downloads)
    const sortedUrls = uniqueUrls.sort((a, b) => {
      const qualityOrder = ['360p', '480p', '720p', '1080p', 'auto', 'unknown'];
      const aIndex = qualityOrder.indexOf(a.quality || 'unknown');
      const bIndex = qualityOrder.indexOf(b.quality || 'unknown');
      return aIndex - bIndex;
    });

    console.log(`Found ${sortedUrls.length} video URLs`);

    return NextResponse.json({
      success: true,
      title,
      videos: sortedUrls,
      message: sortedUrls.length > 0 ? 'Videos found' : 'No videos found'
    });

  } catch (error) {
    console.error('Puppeteer extraction failed:', error);
    
    if (browser) {
      await browser.close();
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
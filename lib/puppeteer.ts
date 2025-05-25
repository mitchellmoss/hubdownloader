import puppeteer, { Browser, Page } from 'puppeteer'

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    try {
      const args = [
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ]
      
      // Add platform-specific args
      if (process.platform !== 'darwin') {
        args.push('--no-sandbox', '--disable-setuid-sandbox')
      }
      
      browser = await puppeteer.launch({
        headless: true,
        args,
      })
    } catch (error) {
      console.error('Failed to launch Puppeteer browser:', error)
      throw new Error('Failed to launch browser. Make sure Chrome/Chromium is installed.')
    }
  }
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

interface VideoInfo {
  url: string
  type: string
  format?: string
  quality?: string
  isHLS?: boolean
  title?: string
  downloadInstructions?: string
}

export async function extractVideoUrls(url: string): Promise<VideoInfo[]> {
  console.log('Starting extraction for:', url)
  const videoUrls: VideoInfo[] = []
  const seenUrls = new Set<string>()
  
  let browser: Browser | null = null
  let page: Page | null = null
  
  try {
    // Create a fresh browser instance for each extraction
    const args = [
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-extensions',
    ]
    
    if (process.platform !== 'darwin') {
      args.push('--no-sandbox', '--disable-setuid-sandbox')
    }
    
    browser = await puppeteer.launch({
      headless: true,
      args,
    })
    
    page = await browser.newPage()
    
    // Enable console logging from the page
    page.on('console', (msg) => {
      console.log('PAGE LOG:', msg.text())
    })
    
    page.on('pageerror', (error) => {
      console.error('PAGE ERROR:', error.message)
    })
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    // Enable request interception
    await page.setRequestInterception(true)
    
    // Capture video requests
    page.on('request', (request) => {
      const resourceType = request.resourceType()
      const requestUrl = request.url()
      
      // Filter out ads, analytics, and non-video URLs
      const excludePatterns = [
        /\/ads?[\/?]/i,
        /\/analytics/i,
        /\/track/i,
        /\/pixel/i,
        /google-analytics/i,
        /doubleclick/i,
        /facebook\.com/i,
        /twitter\.com/i,
        /_xa\/ads/i,
        /etahub\.com/i,
        /trafficjunky/i,
        /\/events\?/i,
        /\/collect\?/i,
        /camsoda\.com/i,
        /nsimg\.net/i,
        // YouTube specific excludes
        /\/generate_204/i,
        /\/api\/stats/i,
        /\/qoe\?/i,
        /\.svg$/i,
        /ServiceLogin/i,
        /\/s\/search\/audio\//i,
      ]
      
      const shouldExclude = excludePatterns.some(pattern => pattern.test(requestUrl))
      
      // Check for video resources
      const videoExtensions = /\.(mp4|webm|m3u8|mpd|avi|mov|mkv|flv|ts|m4s)/i
      const videoKeywords = /(video|stream|media|playlist\.m3u8|manifest\.mpd|\.mp4\?|\.webm\?)/i
      
      if (!shouldExclude &&
          (resourceType === 'media' || 
          ((resourceType === 'xhr' || resourceType === 'fetch' || resourceType === 'other') && 
           (requestUrl.match(videoExtensions) || requestUrl.match(videoKeywords))))) {
        
        if (!seenUrls.has(requestUrl)) {
          seenUrls.add(requestUrl)
          
          const extension = requestUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]
          
          // Check if it's an HLS stream
          const isHLS = extension?.toLowerCase() === 'm3u8' || requestUrl.includes('playlist/index.m3u8')
          
          // Try to extract quality from YouTube HLS URLs
          let quality = undefined
          if (requestUrl.includes('googlevideo.com') && requestUrl.includes('/itag/')) {
            const itagMatch = requestUrl.match(/\/itag\/(\d+)/)
            if (itagMatch) {
              const itag = itagMatch[1]
              // Map common YouTube itags to quality
              const qualityMap: { [key: string]: string } = {
                '269': '144p',
                '230': '360p',
                '232': '720p',
                '270': '1080p',
              }
              quality = qualityMap[itag]
            }
          }
          
          videoUrls.push({
            url: requestUrl,
            type: resourceType,
            format: extension?.toLowerCase(),
            quality,
            isHLS,
            title: isHLS && requestUrl.includes('youtube') ? 'YouTube Video' : undefined,
            downloadInstructions: isHLS ? 'This is an HLS stream. Use the download options below.' : undefined,
          })
        }
      }
      
      request.continue()
    })
    
    // Monitor responses for video content
    page.on('response', async (response) => {
      try {
        const headers = response.headers()
        const contentType = headers['content-type'] || ''
        const requestUrl = response.url()
        
        if ((contentType.includes('video/') || 
             contentType.includes('application/x-mpegURL') ||
             contentType.includes('application/dash+xml')) &&
            !seenUrls.has(requestUrl)) {
          
          seenUrls.add(requestUrl)
          
          videoUrls.push({
            url: requestUrl,
            type: 'response',
            format: contentType.split('/')[1]?.split(';')[0],
          })
        }
      } catch (err) {
        // Ignore response processing errors
      }
    })
    
    // Navigate to the page with timeout
    console.log('Navigating to page...')
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    console.log('Page loaded, waiting for dynamic content...')
    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Also check for video elements in the DOM
    const domVideos = await page.evaluate(() => {
      const videos: VideoInfo[] = []
      
      // Check HTML5 video elements
      document.querySelectorAll('video').forEach(video => {
        if (video.src) {
          videos.push({ url: video.src, type: 'dom-video', format: 'unknown' })
        }
        
        // Check source elements
        video.querySelectorAll('source').forEach(source => {
          if (source.src) {
            const format = source.type?.split('/')[1] || 'unknown'
            videos.push({ url: source.src, type: 'dom-source', format })
          }
        })
      })
      
      // Check iframes that might contain videos
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src && (iframe.src.includes('youtube') || 
                          iframe.src.includes('vimeo') || 
                          iframe.src.includes('video'))) {
          videos.push({ url: iframe.src, type: 'iframe', format: 'embed' })
        }
      })
      
      return videos
    })
    
    // Add DOM videos to the list
    domVideos.forEach(video => {
      if (!seenUrls.has(video.url)) {
        seenUrls.add(video.url)
        videoUrls.push(video)
      }
    })
    
    console.log(`Found ${videoUrls.length} videos`)
    
  } catch (error) {
    console.error('Error during extraction:', error)
    throw error
  } finally {
    if (page) {
      await page.close()
    }
    if (browser) {
      await browser.close()
    }
  }
  
  return videoUrls
}
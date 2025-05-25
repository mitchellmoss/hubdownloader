import puppeteer from 'puppeteer'

interface VideoInfo {
  url: string
  type: string
  format?: string
}

export async function simpleExtractVideoUrls(url: string): Promise<VideoInfo[]> {
  console.log('Simple extraction starting for:', url)
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    const page = await browser.newPage()
    const videos: VideoInfo[] = []
    
    // Intercept network requests
    await page.setRequestInterception(true)
    
    page.on('request', (request) => {
      const url = request.url()
      
      // Simple check for video files
      if (url.includes('.mp4') || url.includes('.webm') || url.includes('.m3u8')) {
        videos.push({
          url: url,
          type: 'network',
          format: url.match(/\.(mp4|webm|m3u8)/)?.[1]
        })
      }
      
      request.continue()
    })
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Check for video elements in DOM
    const domVideos = await page.evaluate(() => {
      const found: any[] = []
      
      // Find all video elements
      document.querySelectorAll('video').forEach(video => {
        if (video.src) {
          found.push({ url: video.src, type: 'video-element' })
        }
        // Check source elements
        video.querySelectorAll('source').forEach(source => {
          if (source.src) {
            found.push({ url: source.src, type: 'source-element' })
          }
        })
      })
      
      return found
    })
    
    // Combine all found videos
    const allVideos = [...videos, ...domVideos]
    
    // Remove duplicates
    const uniqueVideos = Array.from(
      new Map(allVideos.map(v => [v.url, v])).values()
    )
    
    console.log('Simple extraction found:', uniqueVideos.length, 'videos')
    return uniqueVideos
    
  } finally {
    await browser.close()
  }
}
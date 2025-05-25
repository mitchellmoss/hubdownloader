interface VideoInfo {
  url: string
  type: string
  format?: string
  quality?: string
  title?: string
  size?: number
  hasAudio?: boolean
  isHLS?: boolean
  downloadInstructions?: string
}

interface YouTubeVideoInfo {
  videoId: string
  title: string
  formats: Array<{
    url: string
    quality: string
    qualityLabel: string
    mimeType: string
    itag: number
    hasAudio: boolean
    hasVideo: boolean
  }>
}

export async function extractYouTubeVideo(url: string): Promise<VideoInfo[]> {
  console.log('Extracting YouTube video:', url)
  
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }
    
    // Try to use yt-dlp first (most reliable)
    const ytdlpResult = await extractWithYtDlp(url)
    if (ytdlpResult.length > 0) {
      return ytdlpResult
    }
    
    // Fallback to youtube-dl-exec if available
    const ytdlResult = await extractWithYoutubeDl(url)
    if (ytdlResult.length > 0) {
      return ytdlResult
    }
    
    // Final fallback: direct API approach
    const apiResults = await extractWithAPI(videoId)
    
    // If we got some results, return them
    if (apiResults.length > 0) {
      return apiResults
    }
    
    // If all else fails, return empty array - the main Puppeteer extractor
    // will catch the HLS streams from YouTube
    return []
    
  } catch (error) {
    console.error('YouTube extraction error:', error)
    throw error
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

async function extractWithYtDlp(url: string): Promise<VideoInfo[]> {
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    // Check if yt-dlp is available
    try {
      const { stdout: whichOutput } = await execAsync('which yt-dlp')
      console.log('yt-dlp found at:', whichOutput.trim())
    } catch (error) {
      console.log('yt-dlp not found:', error)
      return []
    }
    
    console.log('Running yt-dlp -J for:', url)
    
    // Get video info with yt-dlp
    const { stdout, stderr } = await execAsync(`yt-dlp -J --no-warnings "${url}"`)
    
    if (stderr) {
      console.error('yt-dlp stderr:', stderr)
    }
    
    console.log('yt-dlp output length:', stdout.length)
    const data = JSON.parse(stdout)
    
    const videos: VideoInfo[] = []
    
    // Process formats
    if (data.formats) {
      console.log(`Found ${data.formats.length} formats from yt-dlp`)
      
      // Group formats by quality
      const qualityGroups = new Map<string, any>()
      
      for (const format of data.formats) {
        if (!format.url) {
          console.log('Skipping format without URL:', format.format_id)
          continue
        }
        
        const height = format.height || 0
        const hasVideo = format.vcodec !== 'none'
        const hasAudio = format.acodec !== 'none'
        
        // Skip audio-only formats unless specifically needed
        if (!hasVideo && hasAudio) {
          // Store audio-only format for potential merging
          continue
        }
        
        const qualityLabel = format.format_note || `${height}p` || 'unknown'
        
        // Skip HLS formats if we have better options
        const isHLS = format.url.includes('.m3u8') || format.url.includes('/manifest/hls')
        
        // Get existing format for this quality
        const existing = qualityGroups.get(qualityLabel)
        
        // Prefer formats in this order:
        // 1. Non-HLS with audio
        // 2. Non-HLS without audio  
        // 3. HLS with audio
        // 4. HLS without audio
        const shouldReplace = !existing || 
          (!existing.hasAudio && hasAudio) || // New has audio, old doesn't
          (existing.isHLS && !isHLS) || // New is not HLS, old is
          (existing.isHLS && !isHLS && hasAudio) // New is not HLS with audio
        
        if (shouldReplace) {
          qualityGroups.set(qualityLabel, {
            url: format.url,
            quality: qualityLabel,
            ext: format.ext,
            filesize: format.filesize,
            hasAudio,
            hasVideo,
            height,
            formatId: format.format_id,
            isHLS
          })
        }
      }
      
      // Sort by quality (height)
      const sortedQualities = Array.from(qualityGroups.entries())
        .sort((a, b) => (b[1].height || 0) - (a[1].height || 0))
      
      console.log(`Grouped into ${qualityGroups.size} quality levels`)
      
      // Log format selection for debugging
      qualityGroups.forEach((format, quality) => {
        console.log(`Quality ${quality}: ${format.isHLS ? 'HLS' : 'Direct'}, Audio: ${format.hasAudio}, Format ID: ${format.formatId}`)
      })
      
      for (const [quality, format] of sortedQualities) {
        // Use the isHLS flag we already determined
        const actualFormat = format.isHLS ? 'm3u8' : (format.ext || 'mp4')
        
        videos.push({
          url: format.url,
          type: 'direct',
          format: actualFormat,
          quality: quality,
          title: data.title || 'YouTube Video',
          size: format.filesize,
          hasAudio: format.hasAudio,
          isHLS: format.isHLS,
          downloadInstructions: format.isHLS 
            ? (format.hasAudio 
              ? 'HLS stream with audio. Use the download options below.'
              : '⚠️ HLS stream (video only). For audio, use a non-HLS format.')
            : (format.hasAudio 
              ? 'Click to download video with audio' 
              : 'Video only - no audio track')
        })
      }
      
      console.log(`Returning ${videos.length} videos from yt-dlp`)
    } else {
      console.log('No formats found in yt-dlp output')
    }
    
    return videos
    
  } catch (error) {
    console.error('yt-dlp extraction failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
    }
    return []
  }
}

async function extractWithYoutubeDl(url: string): Promise<VideoInfo[]> {
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    // Check if youtube-dl is available
    try {
      await execAsync('which youtube-dl')
    } catch {
      console.log('youtube-dl not found')
      return []
    }
    
    // Get video info with youtube-dl
    const { stdout } = await execAsync(`youtube-dl -J --no-warnings "${url}"`)
    const data = JSON.parse(stdout)
    
    // Process similar to yt-dlp
    const videos: VideoInfo[] = []
    
    if (data.formats) {
      const qualityGroups = new Map<string, any>()
      
      for (const format of data.formats) {
        if (!format.url || format.acodec === 'none') continue
        
        const height = format.height || 0
        const qualityLabel = `${height}p`
        
        if (!qualityGroups.has(qualityLabel) || format.acodec !== 'none') {
          qualityGroups.set(qualityLabel, format)
        }
      }
      
      const sortedQualities = Array.from(qualityGroups.entries())
        .sort((a, b) => (b[1].height || 0) - (a[1].height || 0))
      
      for (const [quality, format] of sortedQualities) {
        videos.push({
          url: format.url,
          type: 'direct',
          format: format.ext || 'mp4',
          quality: quality,
          title: data.title || 'YouTube Video',
          size: format.filesize
        })
      }
    }
    
    return videos
    
  } catch (error) {
    console.error('youtube-dl extraction failed:', error)
    return []
  }
}

async function extractWithAPI(videoId: string): Promise<VideoInfo[]> {
  // This is a fallback method that extracts basic info
  // Note: Direct API access is limited and may not work for all videos
  
  const videos: VideoInfo[] = []
  
  try {
    // Try to get video info page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    const html = await response.text()
    
    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/)
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'YouTube Video'
    
    // Look for ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/)
    
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1])
        
        if (playerResponse.streamingData && playerResponse.streamingData.formats) {
          for (const format of playerResponse.streamingData.formats) {
            if (format.url) {
              videos.push({
                url: format.url,
                type: 'direct',
                format: 'mp4',
                quality: format.qualityLabel || format.quality || 'unknown',
                title: title
              })
            }
          }
        }
        
        // Also check adaptiveFormats
        if (playerResponse.streamingData && playerResponse.streamingData.adaptiveFormats) {
          for (const format of playerResponse.streamingData.adaptiveFormats) {
            if (format.url && format.mimeType && format.mimeType.includes('video')) {
              videos.push({
                url: format.url,
                type: 'direct',
                format: 'mp4',
                quality: format.qualityLabel || `${format.height}p` || 'unknown',
                title: title,
                hasAudio: false,
                downloadInstructions: 'Video only - no audio track'
              })
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse player response:', e)
      }
    }
    
    // Return empty array if no direct URLs found
    // The main Puppeteer extractor will catch the HLS streams
    
  } catch (error) {
    console.error('API extraction failed:', error)
  }
  
  return videos
}
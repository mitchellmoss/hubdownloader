import { PornHub } from 'pornhub.js'

interface VideoInfo {
  url: string
  type: string
  format?: string
  quality?: string
  title?: string
  isHLS?: boolean
  downloadInstructions?: string
}

async function fetchGetMediaUrl(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.pornhub.com/'
      }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch get_media URL:', response.status)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching get_media URL:', error)
    return null
  }
}

export async function extractAdultVideoUrls(url: string): Promise<VideoInfo[]> {
  console.log('Adult extractor starting for:', url)
  
  try {
    const pornhub = new PornHub()
    
    // Extract video ID from URL
    const urlMatch = url.match(/viewkey=([a-zA-Z0-9]+)/)
    if (!urlMatch) {
      console.error('Invalid URL format')
      return []
    }
    
    const videoId = urlMatch[1]
    console.log('Extracted video ID:', videoId)
    
    // Get video info
    const videoInfo = await pornhub.video(videoId)
    
    if (!videoInfo) {
      console.error('No video info found')
      return []
    }
    
    // Debug: Log the entire video info structure
    console.log('Video info structure:', JSON.stringify(videoInfo, null, 2))
    
    const videos: VideoInfo[] = []
    
    // First, check mediaDefinitions for GET_MEDIA URLs and direct MP4 URLs
    if (videoInfo.mediaDefinitions && Array.isArray(videoInfo.mediaDefinitions)) {
      console.log('Checking mediaDefinitions...')
      
      // Look for GET_MEDIA URL first
      const getMediaDef = videoInfo.mediaDefinitions.find((media: any) => 
        media.videoUrl && media.videoUrl.includes('get_media')
      )
      
      if (getMediaDef && getMediaDef.videoUrl) {
        console.log('Found GET_MEDIA URL:', getMediaDef.videoUrl)
        
        // Fetch the actual video URLs from GET_MEDIA endpoint
        const mediaData = await fetchGetMediaUrl(getMediaDef.videoUrl)
        
        if (mediaData) {
          console.log('GET_MEDIA response:', JSON.stringify(mediaData, null, 2))
          
          // Process the response to extract MP4 URLs
          if (mediaData.videoUrl) {
            // Single video URL
            videos.push({
              url: mediaData.videoUrl,
              type: 'direct',
              format: 'mp4',
              quality: mediaData.quality || 'HD',
              title: videoInfo.title
            })
          } else if (Array.isArray(mediaData)) {
            // Multiple quality options
            mediaData.forEach((item: any) => {
              if (item.videoUrl && !item.videoUrl.includes('.m3u8')) {
                videos.push({
                  url: item.videoUrl,
                  type: 'direct',
                  format: item.format || 'mp4',
                  quality: item.quality || item.text || 'unknown',
                  title: videoInfo.title
                })
              }
            })
          } else if (mediaData.formats) {
            // Another possible structure
            Object.entries(mediaData.formats).forEach(([quality, url]: [string, any]) => {
              if (url && typeof url === 'string' && !url.includes('.m3u8')) {
                videos.push({
                  url: url,
                  type: 'direct',
                  format: 'mp4',
                  quality: quality,
                  title: videoInfo.title
                })
              }
            })
          }
        }
      }
      
      // If no GET_MEDIA or it failed, check other media definitions
      if (videos.length === 0) {
        videoInfo.mediaDefinitions.forEach((media: any) => {
          console.log('Media definition:', media)
          
          // Look for direct MP4 URLs
          if (media.videoUrl && !media.videoUrl.includes('.m3u8') && !media.videoUrl.includes('get_media')) {
            videos.push({
              url: media.videoUrl,
              type: 'direct',
              format: 'mp4',
              quality: media.quality || 'unknown',
              title: videoInfo.title
            })
          }
        })
      }
    }
    
    // If no MP4s found, use the HLS streams from mediaDefinitions
    if (videos.length === 0 && videoInfo.mediaDefinitions) {
      console.log('No direct MP4s found, using HLS streams...')
      videoInfo.mediaDefinitions.forEach((media: any) => {
        // Only include HLS video URLs, not the GET_MEDIA endpoints
        if (media.videoUrl && media.format === 'hls' && media.videoUrl.includes('.m3u8')) {
          videos.push({
            url: media.videoUrl,
            type: 'stream',
            format: 'm3u8',
            quality: `${media.quality}p`,
            title: videoInfo.title,
            isHLS: true,
            downloadInstructions: 'This is an HLS stream. Use the download options below.'
          })
        }
      })
    }
    
    // Also check downloadURLs as a fallback
    if (videos.length === 0 && videoInfo.downloadURLs) {
      console.log('Checking downloadURLs as fallback...')
      for (const [quality, url] of Object.entries(videoInfo.downloadURLs)) {
        if (url && typeof url === 'string') {
          const isHLS = url.includes('.m3u8')
          videos.push({
            url: url,
            type: 'download',
            format: isHLS ? 'm3u8' : 'mp4',
            quality: quality,
            title: videoInfo.title,
            isHLS: isHLS,
            downloadInstructions: isHLS ? 'This is an HLS stream. Use the download options below.' : undefined
          })
        }
      }
    }
    
    console.log(`Adult extractor found ${videos.length} videos`)
    return videos
    
  } catch (error) {
    console.error('Adult extractor error:', error)
    // Return empty array instead of throwing to allow fallback
    return []
  }
}
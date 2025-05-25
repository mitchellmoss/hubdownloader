export async function parseHLSManifest(m3u8Url: string): Promise<string[]> {
  try {
    const response = await fetch(m3u8Url)
    const text = await response.text()
    
    // Extract base URL
    const urlParts = m3u8Url.split('/')
    urlParts.pop() // Remove filename
    const baseUrl = urlParts.join('/')
    
    const directUrls: string[] = []
    
    // Parse master playlist for quality variants
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for stream info
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        // Extract resolution
        const resMatch = line.match(/RESOLUTION=(\d+x\d+)/)
        const resolution = resMatch ? resMatch[1] : 'unknown'
        
        // Next line should be the playlist URL
        if (i + 1 < lines.length) {
          const playlistUrl = lines[i + 1].trim()
          if (playlistUrl && !playlistUrl.startsWith('#')) {
            // Construct full URL
            const fullUrl = playlistUrl.startsWith('http') 
              ? playlistUrl 
              : `${baseUrl}/${playlistUrl}`
            
            directUrls.push(fullUrl)
          }
        }
      }
    }
    
    return directUrls
  } catch (error) {
    console.error('Error parsing HLS manifest:', error)
    return []
  }
}
import { extractVideoUrls } from './puppeteer'
import { extractYouTubeVideo } from './youtube-extractor'
import { extractAdultVideo } from './adult-extractor'

interface VPNStatus {
  isActive: boolean
  ip?: string
  location?: string
}

/**
 * Check if we're running through VPN
 */
async function checkVPNStatus(): Promise<VPNStatus> {
  try {
    // Check if we're in Docker with VPN
    const isDockerVPN = process.env.VPN_CHECK_URL || false
    
    if (!isDockerVPN) {
      return { isActive: false }
    }
    
    // Get current IP through VPN
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    
    // Get location info
    const locationResponse = await fetch(`http://ip-api.com/json/${data.ip}`)
    const locationData = await locationResponse.json()
    
    return {
      isActive: true,
      ip: data.ip,
      location: `${locationData.city}, ${locationData.country}`
    }
  } catch (error) {
    console.error('VPN check failed:', error)
    return { isActive: false }
  }
}

/**
 * Extract videos with VPN awareness
 */
export async function extractWithVPN(url: string) {
  // Check VPN status
  const vpnStatus = await checkVPNStatus()
  
  if (vpnStatus.isActive) {
    console.log(`🔒 Extracting through VPN: ${vpnStatus.location} (${vpnStatus.ip})`)
  } else {
    console.log('⚠️  Extracting without VPN protection')
  }
  
  // Try YouTube extractor first
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videos = await extractYouTubeVideo(url)
    if (videos.length > 0) {
      return { videos, vpnStatus }
    }
  }
  
  // Try adult site extractors
  const adultDomains = ['pornhub.com', 'xvideos.com', 'xhamster.com']
  if (adultDomains.some(domain => url.includes(domain))) {
    const videos = await extractAdultVideo(url)
    if (videos.length > 0) {
      return { videos, vpnStatus }
    }
  }
  
  // Fallback to general Puppeteer extractor
  const videos = await extractVideoUrls(url)
  return { videos, vpnStatus }
}

/**
 * Rotate VPN endpoint if multiple are available
 */
export async function rotateVPNEndpoint() {
  // This would be implemented if you have multiple VPN containers
  console.log('VPN rotation not implemented in single-container setup')
}
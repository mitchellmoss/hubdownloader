/**
 * Background service worker for enhanced video extraction
 * Intercepts all network requests to detect video URLs
 */

const videoPatterns = [
  '*://*/*.mp4*',
  '*://*/*.webm*',
  '*://*/*.m3u8*',
  '*://*/*.mpd*',
  '*://*/*.ts*',
  '*://*/*.mov*',
  '*://*/*.avi*',
  '*://*/*.flv*',
  '*://*/videoplayback*',
  '*://*/video/*',
  '*://*/stream/*'
];

const detectedVideos = new Map(); // tabId -> Set of video URLs

// Listen for video requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'media' || isVideoUrl(details.url)) {
      const tabId = details.tabId;
      if (tabId > 0) {
        if (!detectedVideos.has(tabId)) {
          detectedVideos.set(tabId, new Set());
        }
        
        const videos = detectedVideos.get(tabId);
        videos.add(details.url);
        
        // Update badge
        chrome.action.setBadgeText({
          tabId: tabId,
          text: videos.size.toString()
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: '#4CAF50'
        });
        
        // Send to content script
        chrome.tabs.sendMessage(tabId, {
          type: 'VIDEO_DETECTED',
          url: details.url,
          method: details.method,
          frameId: details.frameId
        });
      }
    }
  },
  { urls: videoPatterns },
  ['requestBody']
);

// Check if URL is likely a video
function isVideoUrl(url) {
  const videoExtensions = ['.mp4', '.webm', '.m3u8', '.mpd', '.ts', '.mov', '.avi', '.flv'];
  const videoKeywords = ['video', 'stream', 'media', 'playback'];
  
  const urlLower = url.toLowerCase();
  
  // Check extensions
  if (videoExtensions.some(ext => urlLower.includes(ext))) {
    return true;
  }
  
  // Check keywords
  if (videoKeywords.some(keyword => urlLower.includes(keyword))) {
    return true;
  }
  
  // Check for common CDN patterns
  if (urlLower.includes('cloudfront.net') || 
      urlLower.includes('akamaihd.net') || 
      urlLower.includes('googlevideo.com')) {
    return true;
  }
  
  return false;
}

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedVideos.delete(tabId);
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_VIDEOS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId && detectedVideos.has(tabId)) {
        sendResponse({
          videos: Array.from(detectedVideos.get(tabId))
        });
      } else {
        sendResponse({ videos: [] });
      }
    });
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'CLEAR_VIDEOS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        detectedVideos.delete(tabId);
        chrome.action.setBadgeText({ tabId: tabId, text: '' });
      }
    });
  }
});
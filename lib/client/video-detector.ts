/**
 * Client-side video detection and extraction
 * Runs entirely in the browser without server dependencies
 */

export interface VideoInfo {
  url: string;
  quality?: string;
  format?: string;
  isHLS?: boolean;
  isDASH?: boolean;
  size?: number;
  headers?: Record<string, string>;
}

export class ClientVideoDetector {
  private detectedVideos: VideoInfo[] = [];
  private observer: PerformanceObserver | null = null;

  /**
   * Start monitoring for video resources
   */
  startDetection() {
    // Monitor performance entries for video resources
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.checkResourceForVideo(resource.name);
          }
        }
      });
      
      this.observer.observe({ entryTypes: ['resource'] });
    }

    // Check existing video elements
    this.scanDOMForVideos();

    // Monitor DOM mutations for new video elements
    this.observeDOMMutations();

    // Intercept fetch and XHR requests
    this.interceptNetworkRequests();
  }

  /**
   * Stop monitoring
   */
  stopDetection() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * Get all detected videos
   */
  getDetectedVideos(): VideoInfo[] {
    return [...this.detectedVideos];
  }

  /**
   * Check if a URL is a video resource
   */
  private checkResourceForVideo(url: string) {
    const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.m3u8', '.mpd', '.ts'];
    const videoMimeTypes = ['video/', 'application/x-mpegURL', 'application/dash+xml'];
    
    // Check file extension
    const hasVideoExtension = videoExtensions.some(ext => url.includes(ext));
    
    // Check URL patterns
    const hasVideoPattern = /\.(mp4|webm|m3u8|mpd|ts|mov|avi)(\?|$)/i.test(url);
    
    if (hasVideoExtension || hasVideoPattern) {
      this.addVideo({
        url,
        format: this.detectFormat(url),
        isHLS: url.includes('.m3u8'),
        isDASH: url.includes('.mpd'),
        quality: this.detectQuality(url)
      });
    }
  }

  /**
   * Scan DOM for video elements
   */
  private scanDOMForVideos() {
    // Find HTML5 video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.src) {
        this.addVideo({
          url: video.src,
          format: 'mp4',
          quality: this.detectQualityFromElement(video)
        });
      }

      // Check source elements
      const sources = video.querySelectorAll('source');
      sources.forEach(source => {
        if (source.src) {
          this.addVideo({
            url: source.src,
            format: this.detectFormat(source.src),
            quality: source.getAttribute('label') || source.getAttribute('size') || undefined
          });
        }
      });
    });

    // Find iframe embeds
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      if (iframe.src && this.isVideoEmbed(iframe.src)) {
        // Extract video ID and platform
        const videoInfo = this.parseEmbedUrl(iframe.src);
        if (videoInfo) {
          this.addVideo(videoInfo);
        }
      }
    });
  }

  /**
   * Monitor DOM for new video elements
   */
  private observeDOMMutations() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLVideoElement) {
            this.scanDOMForVideos();
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Intercept network requests
   */
  private interceptNetworkRequests() {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      // Check if response is video
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('video')) {
        this.addVideo({
          url,
          format: this.detectFormatFromMimeType(contentType)
        });
      }
      
      this.checkResourceForVideo(url);
      return response;
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args: any[]) {
      const url = args[1];
      if (typeof url === 'string') {
        this.addEventListener('load', () => {
          const contentType = this.getResponseHeader('content-type');
          if (contentType && contentType.includes('video')) {
            window.clientVideoDetector?.addVideo({
              url,
              format: window.clientVideoDetector?.detectFormatFromMimeType(contentType)
            });
          }
          window.clientVideoDetector?.checkResourceForVideo(url);
        });
      }
      return originalOpen.apply(this, args);
    };
  }

  /**
   * Add video to detected list
   */
  private addVideo(video: VideoInfo) {
    // Avoid duplicates
    if (!this.detectedVideos.some(v => v.url === video.url)) {
      this.detectedVideos.push(video);
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('videoDetected', { detail: video }));
    }
  }

  /**
   * Detect video format from URL
   */
  private detectFormat(url: string): string {
    if (url.includes('.mp4')) return 'mp4';
    if (url.includes('.webm')) return 'webm';
    if (url.includes('.m3u8')) return 'hls';
    if (url.includes('.mpd')) return 'dash';
    if (url.includes('.avi')) return 'avi';
    if (url.includes('.mov')) return 'mov';
    return 'unknown';
  }

  /**
   * Detect format from MIME type
   */
  private detectFormatFromMimeType(mimeType: string): string {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('x-mpegURL')) return 'hls';
    if (mimeType.includes('dash')) return 'dash';
    return 'unknown';
  }

  /**
   * Detect quality from URL patterns
   */
  private detectQuality(url: string): string | undefined {
    // Common quality patterns
    const patterns = [
      /(\d{3,4})p/i,
      /quality[=_](\d{3,4})/i,
      /res[=_](\d{3,4})/i,
      /height[=_](\d{3,4})/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] + 'p';
      }
    }

    return undefined;
  }

  /**
   * Detect quality from video element
   */
  private detectQualityFromElement(video: HTMLVideoElement): string | undefined {
    if (video.videoHeight) {
      return video.videoHeight + 'p';
    }
    return undefined;
  }

  /**
   * Check if URL is a video embed
   */
  private isVideoEmbed(url: string): boolean {
    const embedPatterns = [
      /youtube\.com\/embed/,
      /player\.vimeo\.com/,
      /dailymotion\.com\/embed/,
      /facebook\.com\/plugins\/video/
    ];

    return embedPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Parse embed URL to extract video info
   */
  private parseEmbedUrl(url: string): VideoInfo | null {
    // YouTube
    if (url.includes('youtube.com/embed/')) {
      const videoId = url.match(/embed\/([^?]+)/)?.[1];
      if (videoId) {
        return {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          format: 'youtube'
        };
      }
    }

    // Add more platforms as needed
    return null;
  }
}

// Make available globally
declare global {
  interface Window {
    clientVideoDetector?: ClientVideoDetector;
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  window.clientVideoDetector = new ClientVideoDetector();
}
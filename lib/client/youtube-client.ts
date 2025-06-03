/**
 * Client-side YouTube video extraction
 * Uses YouTube's public APIs and player response parsing
 */

export interface YouTubeFormat {
  itag: number;
  url: string;
  mimeType: string;
  bitrate?: number;
  width?: number;
  height?: number;
  quality: string;
  qualityLabel?: string;
  audioQuality?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export class YouTubeClient {
  private corsProxy: string = '/api/proxy/cors';

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/,
      /youtube\.com\/v\/([^?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get video info using YouTube's embed API
   */
  async getVideoInfo(videoId: string): Promise<{
    title: string;
    author: string;
    duration: number;
    formats: YouTubeFormat[];
  }> {
    // YouTube's get_video_info endpoint is deprecated (returns 410)
    // Skip directly to using Puppeteer via the unified extractor
    console.log('YouTube client-side extraction is limited, server-side extraction required');
    
    // Return minimal info to trigger Puppeteer fallback
    try {
      // Get basic info from oembed
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedResponse = await this.fetchWithCORS(oembedUrl);
      const oembedData = JSON.parse(oembedResponse);

      return {
        title: oembedData.title || 'Unknown',
        author: oembedData.author_name || 'Unknown',
        duration: 0,
        formats: [] // Empty formats will trigger Puppeteer fallback
      };
    } catch (error) {
      // Return empty to trigger Puppeteer
      return {
        title: 'Unknown',
        author: 'Unknown',
        duration: 0,
        formats: []
      };
    }
  }

  /**
   * Alternative method using YouTube's innertube API
   */
  private async getVideoInfoViaInnertube(videoId: string): Promise<{
    title: string;
    author: string;
    duration: number;
    formats: YouTubeFormat[];
  }> {
    try {
      // Get basic info from oembed first
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedResponse = await this.fetchWithCORS(oembedUrl);
      const oembedData = JSON.parse(oembedResponse);

      // For client-side, we're limited without the full API
      // Return a format that tells the user to use server-side extraction
      return {
        title: oembedData.title || 'Unknown',
        author: oembedData.author_name || 'Unknown',
        duration: 0,
        formats: [{
          itag: 0,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          mimeType: 'text/html',
          quality: 'server',
          qualityLabel: 'Server-side extraction required',
          hasVideo: true,
          hasAudio: true
        }]
      };
    } catch (error) {
      console.error('Innertube fallback failed:', error);
      return this.getVideoInfoFallback(videoId);
    }
  }

  /**
   * Parse YouTube format object
   */
  private parseFormat(format: any, hasVideo: boolean, hasAudio: boolean): YouTubeFormat {
    return {
      itag: format.itag,
      url: format.url || '',
      mimeType: format.mimeType || '',
      bitrate: format.bitrate,
      width: format.width,
      height: format.height,
      quality: format.quality || this.getQualityFromItag(format.itag),
      qualityLabel: format.qualityLabel || this.getQualityLabel(format),
      audioQuality: format.audioQuality,
      hasVideo,
      hasAudio
    };
  }

  /**
   * Fallback method using oEmbed API
   */
  private async getVideoInfoFallback(videoId: string): Promise<{
    title: string;
    author: string;
    duration: number;
    formats: YouTubeFormat[];
  }> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await this.fetchWithCORS(oembedUrl);
    const data = JSON.parse(response);

    // oEmbed doesn't provide formats, so return minimal info
    return {
      title: data.title || 'Unknown',
      author: data.author_name || 'Unknown',
      duration: 0, // Not available in oEmbed
      formats: [{
        itag: 0,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        mimeType: 'text/html',
        quality: 'embed',
        qualityLabel: 'Embed Only',
        hasVideo: true,
        hasAudio: true
      }]
    };
  }

  /**
   * Get quality from itag
   */
  private getQualityFromItag(itag: number): string {
    const itagMap: Record<number, string> = {
      // Video + Audio
      18: '360p',
      22: '720p',
      
      // Video only
      137: '1080p',
      136: '720p',
      135: '480p',
      134: '360p',
      133: '240p',
      160: '144p',
      
      // Audio only
      140: 'audio',
      141: 'audio',
      171: 'audio',
      249: 'audio',
      250: 'audio',
      251: 'audio'
    };

    return itagMap[itag] || 'unknown';
  }

  /**
   * Get quality label
   */
  private getQualityLabel(format: any): string {
    if (format.qualityLabel) return format.qualityLabel;
    if (format.height) return `${format.height}p`;
    if (format.audioQuality) return format.audioQuality;
    return this.getQualityFromItag(format.itag);
  }

  /**
   * Find best format for download
   */
  findBestFormat(formats: YouTubeFormat[], preferredQuality?: string): YouTubeFormat | null {
    // If specific quality requested
    if (preferredQuality) {
      const exact = formats.find(f => 
        f.hasVideo && f.hasAudio && 
        (f.quality === preferredQuality || f.qualityLabel === preferredQuality)
      );
      if (exact) return exact;
    }

    // Find best format with both audio and video
    const combined = formats
      .filter(f => f.hasVideo && f.hasAudio)
      .sort((a, b) => (b.height || 0) - (a.height || 0));
    
    if (combined.length > 0) {
      return combined[0];
    }

    // If no combined format, user will need to merge
    return null;
  }

  /**
   * Find formats that need merging
   */
  findFormatsForMerging(
    formats: YouTubeFormat[], 
    preferredQuality?: string
  ): { video: YouTubeFormat | null; audio: YouTubeFormat | null } {
    // Find best video
    let videoFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
    
    if (preferredQuality) {
      videoFormats = videoFormats.filter(f => 
        f.quality === preferredQuality || f.qualityLabel === preferredQuality
      );
    }
    
    const video = videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0] || null;

    // Find best audio
    const audio = formats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] || null;

    return { video, audio };
  }

  /**
   * Fetch with CORS proxy
   */
  private async fetchWithCORS(url: string): Promise<string> {
    try {
      // Try direct fetch first
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Expected to fail due to CORS
    }

    // Use CORS proxy
    const proxyUrl = `${this.corsProxy}?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    return await response.text();
  }
}
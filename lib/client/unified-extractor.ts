/**
 * Unified client-side video extractor
 * Combines all client-side extraction methods
 */

import { ClientVideoDetector, VideoInfo } from './video-detector';
import { HLSClient } from './hls-client';
import { FFmpegClient } from './ffmpeg-client';
import { YouTubeClient } from './youtube-client';

export interface ExtractedVideo {
  url: string;
  title?: string;
  quality?: string;
  format: string;
  size?: number;
  isHLS?: boolean;
  isDASH?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
  needsMerging?: boolean;
  audioUrl?: string;
  directDownloadable: boolean;
}

export interface ExtractionResult {
  videos: ExtractedVideo[];
  title?: string;
  duration?: number;
  thumbnail?: string;
  error?: string;
}

export class UnifiedExtractor {
  private videoDetector: ClientVideoDetector;
  private hlsClient: HLSClient;
  private ffmpegClient: FFmpegClient;
  private youtubeClient: YouTubeClient;

  constructor() {
    this.videoDetector = new ClientVideoDetector();
    this.hlsClient = new HLSClient();
    this.ffmpegClient = new FFmpegClient();
    this.youtubeClient = new YouTubeClient();
  }

  /**
   * Extract videos from any URL
   */
  async extract(url: string): Promise<ExtractionResult> {
    try {
      // Check if it's YouTube
      if (this.isYouTubeUrl(url)) {
        return await this.extractYouTube(url);
      }

      // For other sites, use general extraction
      return await this.extractGeneral(url);
    } catch (error) {
      console.error('Extraction failed:', error);
      return {
        videos: [],
        error: error instanceof Error ? error.message : 'Extraction failed'
      };
    }
  }

  /**
   * Extract YouTube videos
   */
  private async extractYouTube(url: string): Promise<ExtractionResult> {
    const videoId = this.youtubeClient.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      const info = await this.youtubeClient.getVideoInfo(videoId);
      const videos: ExtractedVideo[] = [];

      // Process formats
      for (const format of info.formats) {
        if (format.url) {
          videos.push({
            url: format.url,
            title: info.title,
            quality: format.qualityLabel || format.quality,
            format: this.getFormatFromMimeType(format.mimeType),
            isHLS: format.mimeType.includes('x-mpegURL'),
            hasAudio: format.hasAudio,
            hasVideo: format.hasVideo,
            needsMerging: format.hasVideo && !format.hasAudio,
            directDownloadable: format.hasAudio && format.hasVideo && !format.mimeType.includes('x-mpegURL')
          });
        }
      }

      // Find best format combinations
      const bestCombined = this.youtubeClient.findBestFormat(info.formats);
      if (!bestCombined) {
        // Need to merge separate streams
        const { video, audio } = this.youtubeClient.findFormatsForMerging(info.formats);
        if (video && audio) {
          videos.unshift({
            url: video.url,
            audioUrl: audio.url,
            title: info.title,
            quality: video.qualityLabel || video.quality,
            format: 'mp4',
            hasAudio: true,
            hasVideo: true,
            needsMerging: true,
            directDownloadable: false
          });
        }
      }

      // If no real formats found, try Puppeteer
      if (videos.length === 0 || (videos.length === 1 && videos[0].quality === 'server')) {
        console.log('Client-side extraction limited, trying Puppeteer...');
        return await this.extractYouTubeWithPuppeteer(url);
      }

      return {
        videos: videos.filter(v => v.url && v.quality !== 'server'),
        title: info.title,
        duration: info.duration
      };
    } catch (error) {
      console.error('Client-side YouTube extraction failed, trying Puppeteer...', error);
      return await this.extractYouTubeWithPuppeteer(url);
    }
  }

  /**
   * Extract YouTube videos using Puppeteer endpoint
   */
  private async extractYouTubeWithPuppeteer(url: string): Promise<ExtractionResult> {
    try {
      // Store the YouTube URL for later use in download
      sessionStorage.setItem('current_youtube_url', url);
      
      const response = await fetch('/api/youtube/puppeteer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Puppeteer extraction failed');
      }

      const data = await response.json();
      
      const videos: ExtractedVideo[] = data.videos.map((v: any) => ({
        url: v.url,
        title: data.title,
        quality: v.quality,
        format: v.format,
        isHLS: v.format === 'hls',
        hasAudio: true,
        hasVideo: true,
        needsMerging: false,
        directDownloadable: v.format !== 'hls'
      }));

      return {
        videos,
        title: data.title
      };
    } catch (error) {
      console.error('Puppeteer extraction failed:', error);
      throw new Error('Failed to extract YouTube video. Please try again.');
    }
  }

  /**
   * Extract videos from general websites
   */
  private async extractGeneral(url: string): Promise<ExtractionResult> {
    return new Promise((resolve) => {
      const videos: ExtractedVideo[] = [];
      const timeout = setTimeout(() => {
        this.videoDetector.stopDetection();
        resolve({
          videos: this.processDetectedVideos(videos),
          title: document.title
        });
      }, 10000); // 10 second timeout

      // Listen for detected videos
      window.addEventListener('videoDetected', (event: CustomEvent<VideoInfo>) => {
        const video = event.detail;
        videos.push({
          url: video.url,
          quality: video.quality,
          format: video.format || 'unknown',
          isHLS: video.isHLS,
          isDASH: video.isDASH,
          size: video.size,
          hasAudio: true,
          hasVideo: true,
          directDownloadable: !video.isHLS && !video.isDASH
        });
      });

      // Start detection
      this.videoDetector.startDetection();

      // Navigate to the URL in an iframe (if same-origin) or open in new tab
      if (this.isSameOrigin(url)) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          setTimeout(() => {
            clearTimeout(timeout);
            this.videoDetector.stopDetection();
            document.body.removeChild(iframe);
            resolve({
              videos: this.processDetectedVideos(videos),
              title: iframe.contentDocument?.title || 'Unknown'
            });
          }, 3000);
        };
      } else {
        // For cross-origin, user needs to visit the page
        resolve({
          videos: [],
          error: 'Please visit the target page and run the extractor from there'
        });
      }
    });
  }

  /**
   * Process detected videos to remove duplicates and sort by quality
   */
  private processDetectedVideos(videos: ExtractedVideo[]): ExtractedVideo[] {
    // Remove duplicates
    const unique = videos.filter((video, index, self) =>
      index === self.findIndex(v => v.url === video.url)
    );

    // Sort by quality (highest first)
    return unique.sort((a, b) => {
      const qualityA = this.parseQuality(a.quality);
      const qualityB = this.parseQuality(b.quality);
      return qualityB - qualityA;
    });
  }

  /**
   * Download video with progress
   */
  async downloadVideo(
    video: ExtractedVideo,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Special handling for YouTube videos
      if (video.url.includes('googlevideo.com')) {
        return await this.downloadYouTubeVideo(video, onProgress);
      }
      
      if (video.needsMerging && video.audioUrl) {
        // Download and merge separate streams
        return await this.downloadAndMerge(video, onProgress);
      } else if (video.isHLS) {
        // Download HLS stream
        return await this.downloadHLS(video.url, onProgress);
      } else {
        // Direct download
        return await this.downloadDirect(video.url, onProgress);
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Download YouTube video with fresh URL
   */
  private async downloadYouTubeVideo(
    video: ExtractedVideo,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      console.log('Downloading YouTube video...');
      
      // Get the stored YouTube URL to re-extract if needed
      const youtubeUrl = sessionStorage.getItem('current_youtube_url');
      if (!youtubeUrl) {
        throw new Error('YouTube URL not found. Please extract the video again.');
      }

      // For YouTube, we need to use the server-side yt-dlp endpoint
      // because YouTube URLs are IP-restricted and expire quickly
      const response = await fetch('/api/youtube/yt-dlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: youtubeUrl
        })
      });
      
      console.log('Download response:', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Download error:', errorData);
        throw new Error(`YouTube download failed: ${errorData.error || response.status}`);
      }

      return await this.processDownloadResponse(response, onProgress);
    } catch (error) {
      console.error('YouTube download error:', error);
      throw new Error('Failed to download YouTube video. Please try again.');
    }
  }

  /**
   * Download and merge separate audio/video streams
   */
  private async downloadAndMerge(
    video: ExtractedVideo,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!video.audioUrl) {
      throw new Error('No audio URL for merging');
    }

    // Download video and audio in parallel
    const [videoBlob, audioBlob] = await Promise.all([
      this.downloadDirect(video.url, (p) => onProgress?.(p * 0.4)),
      this.downloadDirect(video.audioUrl, (p) => onProgress?.(0.4 + p * 0.4))
    ]);

    // Merge with FFmpeg
    if (onProgress) onProgress(0.8);
    const merged = await this.ffmpegClient.mergeAudioVideo(
      videoBlob,
      audioBlob,
      'output.mp4',
      (p) => onProgress?.(0.8 + p * 0.2)
    );

    return merged;
  }

  /**
   * Download HLS stream
   */
  private async downloadHLS(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    // Download HLS segments
    const tsBlob = await this.hlsClient.downloadHLS(url, (p) => onProgress?.(p * 0.7));
    
    // Convert to MP4
    if (onProgress) onProgress(0.7);
    const mp4Blob = await this.ffmpegClient.convertToMP4(
      tsBlob,
      'output.mp4',
      (p) => onProgress?.(0.7 + p * 0.3)
    );

    return mp4Blob;
  }

  /**
   * Direct download
   */
  private async downloadDirect(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Try direct download first
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Direct download failed: ${response.status}`);
      }

      return await this.processDownloadResponse(response, onProgress);
    } catch (error) {
      console.log('Direct download failed, trying with CORS proxy...');
      
      // Fallback to CORS proxy
      const proxyUrl = `/api/proxy/cors?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy download failed: ${response.status}`);
      }

      return await this.processDownloadResponse(response, onProgress);
    }
  }

  /**
   * Process download response
   */
  private async processDownloadResponse(
    response: Response,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (onProgress && contentLength > 0) {
        onProgress(receivedLength / contentLength);
      }
    }

    // Combine chunks
    const combined = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      combined.set(chunk, position);
      position += chunk.length;
    }

    return new Blob([combined], { type: response.headers.get('content-type') || 'video/mp4' });
  }

  /**
   * Create download link
   */
  createDownloadLink(blob: Blob, filename: string): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Save blob to file
   */
  saveBlob(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.href = this.createDownloadLink(blob, filename);
    link.download = filename;
    link.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /**
   * Utilities
   */
  private isYouTubeUrl(url: string): boolean {
    return /youtube\.com|youtu\.be/.test(url);
  }

  private isSameOrigin(url: string): boolean {
    try {
      const targetUrl = new URL(url);
      return targetUrl.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  private getFormatFromMimeType(mimeType: string): string {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('x-mpegURL')) return 'hls';
    if (mimeType.includes('dash')) return 'dash';
    return 'unknown';
  }

  private parseQuality(quality?: string): number {
    if (!quality) return 0;
    const match = quality.match(/(\d+)p?/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Load FFmpeg if needed
   */
  async ensureFFmpegLoaded(): Promise<void> {
    if (!this.ffmpegClient.isLoaded()) {
      await this.ffmpegClient.load();
    }
  }
}
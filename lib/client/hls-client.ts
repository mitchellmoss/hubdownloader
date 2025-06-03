/**
 * Client-side HLS stream parser and downloader
 * Handles HLS manifests and segments in the browser
 */

import { m3u8Parser } from 'm3u8-parser';

export interface HLSVariant {
  bandwidth: number;
  resolution?: { width: number; height: number };
  uri: string;
  codecs?: string;
}

export interface HLSSegment {
  uri: string;
  duration: number;
  byterange?: { offset: number; length: number };
}

export class HLSClient {
  private corsProxy: string = '/api/proxy/cors'; // Minimal CORS proxy endpoint

  /**
   * Parse HLS master playlist
   */
  async parseMasterPlaylist(url: string): Promise<HLSVariant[]> {
    try {
      const manifest = await this.fetchWithCORS(url);
      const parser = new m3u8Parser.Parser();
      parser.push(manifest);
      parser.end();

      const variants: HLSVariant[] = [];
      
      if (parser.manifest.playlists) {
        for (const playlist of parser.manifest.playlists) {
          variants.push({
            bandwidth: playlist.attributes?.BANDWIDTH || 0,
            resolution: playlist.attributes?.RESOLUTION,
            uri: this.resolveUrl(url, playlist.uri),
            codecs: playlist.attributes?.CODECS
          });
        }
      }

      // Sort by bandwidth (quality)
      return variants.sort((a, b) => b.bandwidth - a.bandwidth);
    } catch (error) {
      console.error('Failed to parse master playlist:', error);
      return [];
    }
  }

  /**
   * Parse variant playlist to get segments
   */
  async parseVariantPlaylist(url: string): Promise<HLSSegment[]> {
    try {
      const manifest = await this.fetchWithCORS(url);
      const parser = new m3u8Parser.Parser();
      parser.push(manifest);
      parser.end();

      const segments: HLSSegment[] = [];
      
      if (parser.manifest.segments) {
        for (const segment of parser.manifest.segments) {
          segments.push({
            uri: this.resolveUrl(url, segment.uri),
            duration: segment.duration,
            byterange: segment.byterange
          });
        }
      }

      return segments;
    } catch (error) {
      console.error('Failed to parse variant playlist:', error);
      return [];
    }
  }

  /**
   * Download HLS stream as concatenated segments
   */
  async downloadHLS(
    playlistUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const segments = await this.parseVariantPlaylist(playlistUrl);
    if (segments.length === 0) {
      throw new Error('No segments found in playlist');
    }

    const chunks: Uint8Array[] = [];
    let downloadedSegments = 0;

    // Download segments in parallel batches
    const batchSize = 5;
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const promises = batch.map(segment => this.downloadSegment(segment.uri));
      
      const results = await Promise.all(promises);
      chunks.push(...results);
      
      downloadedSegments += batch.length;
      if (onProgress) {
        onProgress(downloadedSegments / segments.length);
      }
    }

    // Concatenate all segments
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const concatenated = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    return new Blob([concatenated], { type: 'video/mp2t' });
  }

  /**
   * Download a single segment
   */
  private async downloadSegment(url: string): Promise<Uint8Array> {
    const response = await this.fetchWithCORS(url, { responseType: 'arraybuffer' });
    return new Uint8Array(response as ArrayBuffer);
  }

  /**
   * Fetch with CORS proxy if needed
   */
  private async fetchWithCORS(
    url: string,
    options?: { responseType?: 'text' | 'arraybuffer' }
  ): Promise<string | ArrayBuffer> {
    try {
      // Try direct fetch first
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (options?.responseType === 'arraybuffer') {
        return await response.arrayBuffer();
      }
      return await response.text();
    } catch (error) {
      // Fallback to CORS proxy
      console.log('Direct fetch failed, using CORS proxy');
      
      const proxyUrl = `${this.corsProxy}?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy fetch failed: HTTP ${response.status}`);
      }

      if (options?.responseType === 'arraybuffer') {
        return await response.arrayBuffer();
      }
      return await response.text();
    }
  }

  /**
   * Resolve relative URLs
   */
  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }

    const base = new URL(baseUrl);
    return new URL(relativeUrl, base).toString();
  }

  /**
   * Get quality label from variant
   */
  getQualityLabel(variant: HLSVariant): string {
    if (variant.resolution) {
      return `${variant.resolution.height}p`;
    }
    
    // Estimate quality from bandwidth
    if (variant.bandwidth > 5000000) return '1080p';
    if (variant.bandwidth > 2500000) return '720p';
    if (variant.bandwidth > 1000000) return '480p';
    if (variant.bandwidth > 500000) return '360p';
    return '240p';
  }

  /**
   * Create a download link for blob
   */
  createDownloadLink(blob: Blob, filename: string): string {
    return URL.createObjectURL(blob);
  }
}
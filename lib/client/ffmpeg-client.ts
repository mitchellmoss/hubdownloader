/**
 * Client-side video conversion using FFmpeg.wasm
 * Handles HLS to MP4 conversion and other video processing in the browser
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export class FFmpegClient {
  private ffmpeg: FFmpeg;
  private loaded = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * Load FFmpeg.wasm
   */
  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded) return;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    this.ffmpeg.on('progress', ({ progress }) => {
      if (onProgress) {
        onProgress(progress);
      }
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
  }

  /**
   * Convert HLS/TS blob to MP4
   */
  async convertToMP4(
    inputBlob: Blob,
    outputFilename: string = 'output.mp4',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    try {
      // Write input blob to FFmpeg filesystem
      const inputName = 'input.ts';
      const inputData = new Uint8Array(await inputBlob.arrayBuffer());
      await this.ffmpeg.writeFile(inputName, inputData);

      // Set up progress callback
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(progress);
        });
      }

      // Convert to MP4
      await this.ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'copy', // Copy video codec (no re-encoding)
        '-c:a', 'aac',  // Convert audio to AAC if needed
        '-movflags', 'faststart', // Optimize for streaming
        outputFilename
      ]);

      // Read output file
      const outputData = await this.ffmpeg.readFile(outputFilename);
      
      // Clean up
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputFilename);

      // Return as blob
      return new Blob([outputData], { type: 'video/mp4' });
    } catch (error) {
      console.error('FFmpeg conversion failed:', error);
      throw error;
    }
  }

  /**
   * Merge separate audio and video streams
   */
  async mergeAudioVideo(
    videoBlob: Blob,
    audioBlob: Blob,
    outputFilename: string = 'output.mp4',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    try {
      // Write input files
      const videoData = new Uint8Array(await videoBlob.arrayBuffer());
      const audioData = new Uint8Array(await audioBlob.arrayBuffer());
      
      await this.ffmpeg.writeFile('video.mp4', videoData);
      await this.ffmpeg.writeFile('audio.mp4', audioData);

      // Set up progress callback
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(progress);
        });
      }

      // Merge audio and video
      await this.ffmpeg.exec([
        '-i', 'video.mp4',
        '-i', 'audio.mp4',
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-movflags', 'faststart',
        outputFilename
      ]);

      // Read output
      const outputData = await this.ffmpeg.readFile(outputFilename);
      
      // Clean up
      await this.ffmpeg.deleteFile('video.mp4');
      await this.ffmpeg.deleteFile('audio.mp4');
      await this.ffmpeg.deleteFile(outputFilename);

      return new Blob([outputData], { type: 'video/mp4' });
    } catch (error) {
      console.error('FFmpeg merge failed:', error);
      throw error;
    }
  }

  /**
   * Extract thumbnail from video
   */
  async extractThumbnail(
    videoBlob: Blob,
    timeInSeconds: number = 1
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    try {
      const videoData = new Uint8Array(await videoBlob.arrayBuffer());
      await this.ffmpeg.writeFile('input.mp4', videoData);

      // Extract frame at specified time
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', timeInSeconds.toString(),
        '-vframes', '1',
        '-f', 'image2',
        'thumbnail.jpg'
      ]);

      const thumbnailData = await this.ffmpeg.readFile('thumbnail.jpg');
      
      // Clean up
      await this.ffmpeg.deleteFile('input.mp4');
      await this.ffmpeg.deleteFile('thumbnail.jpg');

      return new Blob([thumbnailData], { type: 'image/jpeg' });
    } catch (error) {
      console.error('Thumbnail extraction failed:', error);
      throw error;
    }
  }

  /**
   * Get video metadata
   */
  async getMetadata(videoBlob: Blob): Promise<{
    duration?: number;
    width?: number;
    height?: number;
    codec?: string;
  }> {
    if (!this.loaded) {
      await this.load();
    }

    try {
      const videoData = new Uint8Array(await videoBlob.arrayBuffer());
      await this.ffmpeg.writeFile('input.mp4', videoData);

      // Use ffprobe-like functionality
      let output = '';
      this.ffmpeg.on('log', ({ message }) => {
        output += message + '\n';
      });

      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-f', 'null',
        '-'
      ]);

      // Parse output for metadata
      const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
      const resolutionMatch = output.match(/(\d{3,4})x(\d{3,4})/);
      const codecMatch = output.match(/Video: (\w+)/);

      await this.ffmpeg.deleteFile('input.mp4');

      return {
        duration: durationMatch 
          ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3])
          : undefined,
        width: resolutionMatch ? parseInt(resolutionMatch[1]) : undefined,
        height: resolutionMatch ? parseInt(resolutionMatch[2]) : undefined,
        codec: codecMatch?.[1]
      };
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Check if FFmpeg is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Terminate FFmpeg instance
   */
  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.loaded = false;
    }
  }
}
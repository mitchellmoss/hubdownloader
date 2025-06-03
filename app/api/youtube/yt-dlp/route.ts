/**
 * YouTube download using yt-dlp
 * This is a server-side solution for YouTube downloads
 */

import { NextRequest, NextResponse } from 'next/server';
import youtubedl from 'youtube-dl-exec';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url || !url.includes('youtube.com/watch')) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Downloading YouTube video: ${url}`);
    
    // Create temp file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `youtube-${Date.now()}.mp4`);
    
    try {
      // Download video using yt-dlp
      const ytdlpPath = '/opt/homebrew/bin/yt-dlp'; // Use system yt-dlp
      await youtubedl(url, {
        output: tempFile,
        format: '18/22/best[height<=480]/best', // Try specific formats first
        noCheckCertificates: true,
        noWarnings: true,
        youtubeDl: ytdlpPath,
        extractAudio: false,
        // Add cookies if needed
        addHeader: [
          'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language: en-US,en;q=0.9',
        ]
      });
      
      // Check if file was created
      if (!fs.existsSync(tempFile)) {
        throw new Error('Download failed - no file created');
      }
      
      const fileSize = fs.statSync(tempFile).size;
      console.log(`Downloaded video: ${fileSize} bytes`);
      
      // Read the file and stream it back
      const fileStream = fs.createReadStream(tempFile);
      const webStream = Readable.toWeb(fileStream) as ReadableStream;
      
      // Clean up temp file after streaming
      fileStream.on('end', () => {
        fs.unlink(tempFile, (err) => {
          if (err) console.error('Failed to delete temp file:', err);
        });
      });
      
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSize.toString(),
          'Content-Disposition': 'attachment; filename="youtube-video.mp4"',
          'Cache-Control': 'no-cache',
        }
      });
      
    } catch (downloadError) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      throw downloadError;
    }
    
  } catch (error) {
    console.error('YouTube download error:', error);
    return NextResponse.json(
      { error: 'Download failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
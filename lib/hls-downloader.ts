import { spawn } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

interface HLSDownloadOptions {
  url: string  // Primary URL to try (could be sourceUrl or HLS URL)
  hlsUrl?: string  // Fallback HLS URL if primary fails
  quality?: string  // User's selected quality (e.g. "720p", "1080p")
  onProgress?: (percent: number, message: string) => void
}

export async function downloadHLSToMP4(options: HLSDownloadOptions): Promise<string> {
  const { url, hlsUrl, quality, onProgress } = options
  const tempDir = join(tmpdir(), `hls_${randomBytes(8).toString('hex')}`)
  const outputFile = join(tempDir, 'output.mp4')
  
  // Create temp directory
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true })
  }
  
  try {
    // First, try using yt-dlp which handles HMAC authentication better
    const ytdlpPath = await findYtDlp()
    
    if (ytdlpPath) {
      console.log('Using yt-dlp for HLS download...')
      // Try with primary URL first (might be original YouTube URL)
      const result = await downloadWithYtDlp(ytdlpPath, url, outputFile, quality, onProgress)
      if (result) return outputFile
      
      // If we have a different HLS URL, try that too
      if (hlsUrl && hlsUrl !== url) {
        console.log('Primary URL failed, trying HLS URL with yt-dlp...')
        const hlsResult = await downloadWithYtDlp(ytdlpPath, hlsUrl, outputFile, quality, onProgress)
        if (hlsResult) return outputFile
      }
    }
    
    // Fallback to ffmpeg with segment retry logic
    console.log('Falling back to ffmpeg...')
    // Use HLS URL for ffmpeg since it doesn't understand YouTube URLs
    await downloadWithFFmpeg(hlsUrl || url, outputFile, tempDir, onProgress)
    
    return outputFile
  } catch (error) {
    // Clean up on error
    try {
      if (existsSync(outputFile)) unlinkSync(outputFile)
      if (existsSync(tempDir)) {
        const fs = require('fs')
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    } catch (e) {
      console.error('Cleanup error:', e)
    }
    throw error
  }
}

async function findYtDlp(): Promise<string | null> {
  const { exec } = require('child_process')
  const { promisify } = require('util')
  const execAsync = promisify(exec)
  
  try {
    // Check if yt-dlp is installed
    await execAsync('which yt-dlp')
    return 'yt-dlp'
  } catch {
    try {
      // Check for youtube-dl as fallback
      await execAsync('which youtube-dl')
      return 'youtube-dl'
    } catch {
      return null
    }
  }
}

async function downloadWithYtDlp(
  ytdlpPath: string,
  url: string,
  outputFile: string,
  quality?: string,
  onProgress?: (percent: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`yt-dlp: Processing URL: ${url}`)
    
    // Determine appropriate referer based on URL
    let referer = 'https://www.youtube.com/'
    let useAdultSiteOptions = false
    
    if (url.includes('pornhub.com')) {
      referer = 'https://www.pornhub.com/'
      useAdultSiteOptions = true
    } else if (url.includes('xvideos.com')) {
      referer = 'https://www.xvideos.com/'
      useAdultSiteOptions = true
    } else if (url.includes('xhamster.com')) {
      referer = 'https://xhamster.com/'
      useAdultSiteOptions = true
    }
    
    // Build format selector based on quality
    let formatSelector = 'bestvideo+bestaudio/best'
    console.log(`Quality parameter received: "${quality}"`)
    
    // For adult sites, we need to ensure audio is included
    if (useAdultSiteOptions) {
      console.log('Using adult site options for better audio/video handling')
      if (quality && quality !== 'best' && quality !== 'HLS Stream' && quality !== 'Direct') {
        // Extract numeric resolution from quality string (e.g. "720p" -> "720", "1080p60" -> "1080")
        const resolution = quality.match(/\d+/)?.[0]
        console.log(`Extracted resolution: "${resolution}" from quality: "${quality}"`)
        
        if (resolution) {
          // For adult sites, prioritize formats with both video and audio
          formatSelector = `best[height<=?${resolution}]/bestvideo[height<=?${resolution}]+bestaudio`
          console.log(`Using adult site format selector for ${quality}: ${formatSelector}`)
        }
      } else {
        // For adult sites without specific quality, prefer combined formats
        formatSelector = 'best/bestvideo+bestaudio'
      }
    } else {
      // Non-adult sites (YouTube, etc.)
      if (quality && quality !== 'best' && quality !== 'HLS Stream' && quality !== 'Direct') {
        // Extract numeric resolution from quality string (e.g. "720p" -> "720", "1080p60" -> "1080")
        const resolution = quality.match(/\d+/)?.[0]
        console.log(`Extracted resolution: "${resolution}" from quality: "${quality}"`)
        
        if (resolution) {
          // Select best video with height <= requested + best audio
          // This ensures we don't exceed the user's requested quality
          formatSelector = `bestvideo[height<=?${resolution}]+bestaudio/best[height<=?${resolution}]`
          console.log(`Using quality-specific format selector for ${quality}: ${formatSelector}`)
        } else {
          console.log(`Could not extract resolution from quality: "${quality}"`)
        }
      } else {
        console.log(`Using default format selector (quality was: "${quality}")`);
      }
    }
    
    const args = [
      // Format selection based on user's quality choice
      '-f', formatSelector,
      '--merge-output-format', 'mp4',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--referer', referer,
      '--concurrent-fragments', '4',
      '--retries', '10',
      '--fragment-retries', '10',
      '--retry-sleep', '3',
      '-o', outputFile,
    ]
    
    // Add additional options for adult sites
    if (useAdultSiteOptions) {
      args.push(
        '--no-playlist',  // Don't download playlists, just the video
        '--prefer-free-formats',  // Prefer formats that contain both video and audio
        '--remux-video', 'mp4',  // Ensure mp4 output
      )
    }
    
    args.push(url)
    
    const ytdlp = spawn(ytdlpPath, args)
    
    ytdlp.stdout.on('data', (data) => {
      const output = data.toString()
      console.log('yt-dlp:', output)
      
      // Parse progress
      const progressMatch = output.match(/(\d+\.?\d*)%/)
      if (progressMatch && onProgress) {
        onProgress(parseFloat(progressMatch[1]), output.trim())
      }
    })
    
    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp error:', data.toString())
    })
    
    ytdlp.on('close', (code) => {
      if (code === 0 && existsSync(outputFile)) {
        console.log('yt-dlp download completed successfully')
        resolve(true)
      } else {
        console.error('yt-dlp failed with code:', code)
        resolve(false)
      }
    })
    
    ytdlp.on('error', (error) => {
      console.error('yt-dlp spawn error:', error)
      resolve(false)
    })
  })
}

async function downloadWithFFmpeg(
  url: string,
  outputFile: string,
  tempDir: string,
  onProgress?: (percent: number, message: string) => void
): Promise<void> {
  // Download segments with retry logic
  const segmentListFile = join(tempDir, 'segments.txt')
  
  // First get the playlist
  const playlistResult = await new Promise<boolean>((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', url,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_list', segmentListFile,
      '-segment_time', '10',
      '-reset_timestamps', '1',
      '-y',
      join(tempDir, 'segment%03d.ts')
    ])
    
    let stderr = ''
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('Segment download failed:', stderr)
      }
      resolve(code === 0)
    })
  })
  
  // Determine appropriate referer from URL
  let referer = 'https://www.youtube.com/'
  if (url.includes('pornhub.com')) {
    referer = 'https://www.pornhub.com/'
  } else if (url.includes('xvideos.com')) {
    referer = 'https://www.xvideos.com/'
  } else if (url.includes('xhamster.com')) {
    referer = 'https://xhamster.com/'
  }

  // Now try to download with more aggressive retry logic
  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-http_persistent', '0',  // Disable persistent connections
    '-multiple_requests', '1',
    '-seekable', '0',
    '-headers', `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: ${referer}\r\n`,
    '-reconnect', '1',
    '-reconnect_at_eof', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '2',
    '-i', url,
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-bsf:a', 'aac_adtstoasc',
    '-movflags', 'faststart',
    '-max_muxing_queue_size', '9999',
    '-err_detect', 'ignore_err',
    '-fflags', '+genpts+ignidx+igndts',
    '-avoid_negative_ts', 'make_zero',
    '-max_error_rate', '1.0',  // Continue despite errors
    '-y',
    outputFile
  ]
  
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ffmpegArgs)
    
    let lastProgress = 0
    let stderr = ''
    
    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output
      
      // Parse progress
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/)
      if (timeMatch) {
        const hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])
        const seconds = parseInt(timeMatch[3])
        const totalSeconds = hours * 3600 + minutes * 60 + seconds
        
        // Estimate progress (assuming ~22 minute video)
        const estimatedProgress = Math.min((totalSeconds / 1320) * 100, 100)
        if (estimatedProgress > lastProgress) {
          lastProgress = estimatedProgress
          if (onProgress) {
            onProgress(estimatedProgress, `Processing: ${timeMatch[0]}`)
          }
        }
      }
      
      // Log errors but don't fail
      if (output.includes('HTTP error')) {
        console.log('FFmpeg HTTP error (continuing):', output.trim())
      }
    })
    
    ffmpeg.on('close', (code) => {
      if (code === 0 || existsSync(outputFile)) {
        console.log('FFmpeg completed, checking output file...')
        const fs = require('fs')
        const stats = fs.statSync(outputFile)
        console.log(`Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
        
        if (stats.size > 1024 * 1024) { // At least 1MB
          resolve()
        } else {
          reject(new Error('Output file too small, download likely incomplete'))
        }
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`))
      }
    })
    
    ffmpeg.on('error', reject)
  })
}

export async function cleanupHLSDownload(filePath: string) {
  try {
    const dir = require('path').dirname(filePath)
    if (dir.includes('hls_')) {
      const fs = require('fs')
      fs.rmSync(dir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}
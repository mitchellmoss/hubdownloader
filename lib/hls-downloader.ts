import { spawn } from 'child_process'
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

interface HLSDownloadOptions {
  url: string
  onProgress?: (percent: number, message: string) => void
}

export async function downloadHLSToMP4(options: HLSDownloadOptions): Promise<string> {
  const { url, onProgress } = options
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
      const result = await downloadWithYtDlp(ytdlpPath, url, outputFile, onProgress)
      if (result) return outputFile
    }
    
    // Fallback to ffmpeg with segment retry logic
    console.log('Falling back to ffmpeg...')
    await downloadWithFFmpeg(url, outputFile, tempDir, onProgress)
    
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
  onProgress?: (percent: number, message: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '-f', 'best',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      '--referer', 'https://www.pornhub.com/',
      '--concurrent-fragments', '4',
      '--retries', '10',
      '--fragment-retries', '10',
      '--retry-sleep', '3',
      '-o', outputFile,
      url
    ]
    
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
  
  // Now try to download with more aggressive retry logic
  const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-http_persistent', '0',  // Disable persistent connections
    '-multiple_requests', '1',
    '-seekable', '0',
    '-headers', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\nReferer: https://www.pornhub.com/\r\n',
    '-reconnect', '1',
    '-reconnect_at_eof', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '2',
    '-i', url,
    '-c', 'copy',
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
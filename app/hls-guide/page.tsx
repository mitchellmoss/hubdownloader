import { Metadata } from 'next'
import AdUnit from '@/components/AdUnit'

export const metadata: Metadata = {
  title: 'How to Download HLS Streams - HubDownloader',
  description: 'Complete guide on downloading HLS (.m3u8) video streams using yt-dlp, FFmpeg, and other tools.',
}

export default function HLSGuidePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">How to Download HLS Streams</h1>
      
      <AdUnit slot="5432109876" format="horizontal" className="mb-8" />
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">What are HLS Streams?</h2>
          <p>
            HLS (HTTP Live Streaming) files with .m3u8 extension are playlist files that contain 
            references to video segments. They require special tools to download the complete video.
          </p>
        </div>

        <h2>Method 1: Using yt-dlp (Recommended)</h2>
        <p>yt-dlp is the most reliable tool for downloading HLS streams.</p>
        
        <h3>Installation:</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h4>macOS:</h4>
          <code className="block">brew install yt-dlp</code>
          <p className="text-sm mt-2">Or using pip:</p>
          <code className="block">pip install yt-dlp</code>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h4>Windows:</h4>
          <code className="block">winget install yt-dlp</code>
          <p className="text-sm mt-2">Or download from: https://github.com/yt-dlp/yt-dlp/releases</p>
        </div>
        
        <h3>Usage:</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <p className="font-semibold mb-2">Basic download:</p>
          <code className="block">yt-dlp "YOUR_M3U8_URL_HERE"</code>
          
          <p className="font-semibold mb-2 mt-4">Download best quality:</p>
          <code className="block">yt-dlp -f best "YOUR_M3U8_URL_HERE"</code>
          
          <p className="font-semibold mb-2 mt-4">Save with custom filename:</p>
          <code className="block">yt-dlp -o "video.mp4" "YOUR_M3U8_URL_HERE"</code>
        </div>

        <h2>Method 2: Using FFmpeg</h2>
        <p>FFmpeg is another powerful tool for downloading HLS streams.</p>
        
        <h3>Installation:</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h4>macOS:</h4>
          <code className="block">brew install ffmpeg</code>
          
          <h4 className="mt-4">Windows:</h4>
          <p>Download from: https://ffmpeg.org/download.html</p>
        </div>
        
        <h3>Usage:</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <code className="block">ffmpeg -i "YOUR_M3U8_URL_HERE" -c copy output.mp4</code>
        </div>

        <h2>Method 3: Browser Extensions</h2>
        <ul>
          <li><strong>Video DownloadHelper</strong> - Firefox/Chrome extension</li>
          <li><strong>HLS Downloader</strong> - Chrome extension</li>
          <li><strong>Stream Recorder</strong> - Downloads HLS streams directly</li>
        </ul>

        <h2>Tips for HLS Downloads</h2>
        <ul>
          <li>Always use quotes around URLs containing special characters</li>
          <li>Some streams may be geo-restricted or time-limited</li>
          <li>If one method fails, try another tool</li>
          <li>For best results, download soon after extracting the URL</li>
        </ul>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 mt-8">
          <h3 className="text-xl font-semibold mb-2">Important Note</h3>
          <p>
            HLS URLs often expire after a certain time. If you get an error, try extracting 
            a fresh URL from the original page.
          </p>
        </div>
      </div>
      
      <AdUnit slot="6543210987" format="rectangle" className="mt-8" />
    </div>
  )
}
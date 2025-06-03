import ClientYouTubeDownloader from '@/components/ClientYouTubeDownloader'
import AdUnit from '@/components/AdUnit'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free Video Downloader - Extract YouTube, HLS & MP4 Videos Online',
  description: 'Download videos from YouTube and any website directly in your browser. 100% private, no uploads required. WebAssembly-powered video converter supporting HLS, MP4, WebM formats.',
  keywords: [
    'youtube video downloader',
    'free video downloader online',
    'hls video downloader',
    'browser video downloader',
    'download youtube videos',
    'video downloader no upload',
    'private video downloader',
    'extract video url',
    'mp4 video downloader',
    'webm video downloader',
    'streaming video downloader',
    'online video grabber',
    'video converter online',
    'download videos from any site',
    'client-side video extractor'
  ],
  alternates: {
    canonical: '/',
  },
}

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top Ad */}
      <div className="flex justify-center mb-8">
        <AdUnit slot="1234567890" format="horizontal" />
      </div>

      {/* Main Component */}
      <ClientYouTubeDownloader />

      {/* Features Section */}
      <div className="max-w-4xl mx-auto mt-12 grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center shadow-md">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">100% Private</h3>
          <p className="text-gray-600 dark:text-gray-400">
            All processing happens in your browser. No videos are sent to our servers.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center shadow-md">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">WebAssembly Powered</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Uses FFmpeg.wasm for high-performance video conversion right in your browser.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center shadow-md">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Multi-Format Support</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Extract MP4, WebM, HLS streams, and more. Automatic format detection.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-4xl mx-auto mt-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Paste Video URL</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter any video URL from YouTube or other supported sites
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Browser Extraction</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Our JavaScript analyzes the page and extracts all video sources
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Download & Convert</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Download directly or convert HLS/DASH streams to MP4 using WebAssembly
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ad */}
      <div className="flex justify-center mt-12">
        <AdUnit slot="0987654321" format="rectangle" />
      </div>

      {/* SEO Content & Internal Links */}
      <div className="max-w-4xl mx-auto mt-16 prose prose-lg">
        <h2 className="text-2xl font-bold mb-4">The Best Free Video Downloader for 2025</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Our client-side video downloader revolutionizes how you save videos from the internet. Unlike traditional video downloaders that upload your data to servers, our tool processes everything directly in your browser using cutting-edge WebAssembly technology.
        </p>
        
        <h3 className="text-xl font-semibold mb-3">Why Choose Our Video Downloader?</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400 mb-6">
          <li><strong>Complete Privacy:</strong> No video data ever leaves your browser</li>
          <li><strong>Lightning Fast:</strong> WebAssembly-powered conversion runs at native speed</li>
          <li><strong>Universal Support:</strong> Works with YouTube, HLS streams, MP4, WebM, and more</li>
          <li><strong>No Registration:</strong> Start downloading videos immediately, no account needed</li>
          <li><strong>Free Forever:</strong> No hidden fees, premium tiers, or download limits</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">Popular Use Cases</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div>
            <h4 className="font-semibold mb-2">Educational Content</h4>
            <p className="text-gray-600 dark:text-gray-400">Save educational videos for offline study and research</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Content Creation</h4>
            <p className="text-gray-600 dark:text-gray-400">Download source material for video editing projects</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Personal Archive</h4>
            <p className="text-gray-600 dark:text-gray-400">Build your personal collection of favorite videos</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Offline Viewing</h4>
            <p className="text-gray-600 dark:text-gray-400">Watch videos without internet connection</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-3">Learn More</h3>
          <nav className="space-y-2">
            <p><a href="/how-to" className="text-blue-600 hover:text-blue-700 underline">How to Download Videos</a> - Step-by-step guide for beginners</p>
            <p><a href="/hls-guide" className="text-blue-600 hover:text-blue-700 underline">HLS Stream Download Guide</a> - Advanced tutorial for streaming videos</p>
            <p><a href="/faq" className="text-blue-600 hover:text-blue-700 underline">Frequently Asked Questions</a> - Common questions answered</p>
            <p><a href="/examples" className="text-blue-600 hover:text-blue-700 underline">Examples & Tutorials</a> - See what's possible</p>
          </nav>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> Always respect copyright laws and website terms of service. Only download videos you have permission to access. Learn more about <a href="/dmca" className="text-blue-600 hover:text-blue-700 underline">DMCA compliance</a> and <a href="/terms" className="text-blue-600 hover:text-blue-700 underline">our terms of service</a>.
        </p>
      </div>
    </div>
  )
}
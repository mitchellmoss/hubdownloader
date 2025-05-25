import { Metadata } from 'next'
import AdUnit from '@/components/AdUnit'

export const metadata: Metadata = {
  title: 'How to Use Lyricless - Video URL Extractor',
  description: 'Learn how to extract video URLs from any website using Lyricless. Step-by-step guide for downloading videos.',
}

export default function HowToPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">How to Use Lyricless</h1>
      
      <AdUnit slot="4567890123" format="horizontal" className="mb-8" />
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h2>Step 1: Find a Video Page</h2>
        <p>
          Navigate to any website that contains a video you'd like to download. This could be a news site, 
          educational platform, or any other website with embedded videos.
        </p>
        
        <h2>Step 2: Copy the Page URL</h2>
        <p>
          Copy the full URL from your browser's address bar. Make sure you're on the actual page that 
          contains the video, not a general homepage or category page.
        </p>
        
        <h2>Step 3: Paste URL in Lyricless</h2>
        <p>
          Come back to Lyricless and paste the URL into the input field on our homepage. 
          Click the "Extract" button to start the process.
        </p>
        
        <h2>Step 4: Wait for Extraction</h2>
        <p>
          Our system will load the page and detect all video URLs automatically. This usually takes 
          between 5-15 seconds depending on the website's complexity.
        </p>
        
        <h2>Step 5: Download Your Video</h2>
        <p>
          Once extraction is complete, you'll see a list of all detected videos. Click the download 
          button next to the video you want, or copy the URL to use in your preferred download manager.
        </p>
        
        <h2>Supported Video Formats</h2>
        <ul>
          <li><strong>MP4</strong> - Most common video format, widely supported</li>
          <li><strong>WebM</strong> - Open format, great for web videos</li>
          <li><strong>HLS (.m3u8)</strong> - Streaming format used by many platforms</li>
          <li><strong>DASH (.mpd)</strong> - Adaptive streaming format</li>
        </ul>
        
        <h2>Tips for Better Results</h2>
        <ul>
          <li>Make sure the video is actually playing on the page before copying the URL</li>
          <li>Some sites may require you to be logged in to access videos</li>
          <li>For HLS/DASH streams, you may need a specialized downloader</li>
          <li>If no videos are found, try refreshing the page and extracting again</li>
        </ul>
        
        <h2>Troubleshooting</h2>
        <h3>No videos found?</h3>
        <p>
          Some websites use advanced protection methods. Try:
        </p>
        <ul>
          <li>Making sure the video loads and plays on the original page</li>
          <li>Checking if the site requires login or subscription</li>
          <li>Waiting a few seconds and trying again</li>
        </ul>
        
        <h3>Download doesn't start?</h3>
        <p>
          Right-click the download button and select "Save Link As" or copy the URL and paste it 
          into your browser's address bar.
        </p>
      </div>
      
      <AdUnit slot="5678901234" format="rectangle" className="mt-8" />
    </div>
  )
}
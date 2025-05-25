import { Metadata } from 'next'
import AdUnit from '@/components/AdUnit'

export const metadata: Metadata = {
  title: 'About HubDownloader - Video URL Extraction Service',
  description: 'Learn about HubDownloader, a free online tool for extracting video URLs from websites for personal use.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">About HubDownloader</h1>
      
      <AdUnit slot="8901234567" format="horizontal" className="mb-8" />
      
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <h2>What is HubDownloader?</h2>
        <p>
          HubDownloader is a free online service that helps you extract direct video URLs from web pages. 
          Instead of storing videos on our servers, we simply detect and provide you with the direct links 
          to videos that are already publicly accessible on the web.
        </p>
        
        <h2>Our Mission</h2>
        <p>
          We believe in making web content more accessible while respecting content creators and copyright 
          holders. Our tool is designed for personal use, educational purposes, and legitimate content archival.
        </p>
        
        <h2>How It Works</h2>
        <p>
          When you submit a URL, our system uses a headless browser to load the page just like you would 
          in your regular browser. We then detect any video content and provide you with the direct URLs. 
          No videos are downloaded to or stored on our servers.
        </p>
        
        <h2>Privacy & Security</h2>
        <p>
          Your privacy is important to us:
        </p>
        <ul>
          <li>We don't store the videos you extract</li>
          <li>We only keep minimal analytics for service improvement</li>
          <li>Extraction results are temporarily cached and automatically deleted</li>
          <li>We don't require registration or personal information</li>
        </ul>
        
        <h2>Legal & Ethical Use</h2>
        <p>
          HubDownloader is designed for legitimate purposes only:
        </p>
        <ul>
          <li>Personal archival of content you have rights to access</li>
          <li>Educational and research purposes</li>
          <li>Accessing content in areas with poor internet connectivity</li>
          <li>Creating backups of your own content</li>
        </ul>
        
        <p>
          <strong>Important:</strong> Users are responsible for complying with applicable laws and website 
          terms of service. Do not use this tool to violate copyright or access restricted content.
        </p>
        
        <h2>Contact Us</h2>
        <p>
          For questions, concerns, or DMCA requests, please contact us at:
        </p>
        <ul>
          <li>General inquiries: info@hubdownloader.com</li>
          <li>DMCA/Legal: dmca@hubdownloader.com</li>
          <li>Technical support: support@hubdownloader.com</li>
        </ul>
        
        <h2>Open Source</h2>
        <p>
          HubDownloader is built with modern web technologies including Next.js, TypeScript, and Puppeteer. 
          We believe in transparency and may open-source parts of our codebase in the future.
        </p>
      </div>
      
      <AdUnit slot="9012345678" format="rectangle" className="mt-8" />
    </div>
  )
}
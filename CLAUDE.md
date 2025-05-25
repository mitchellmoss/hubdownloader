# HubDownloader - General Purpose Video Downloader

## Project Overview
A web application that extracts direct video URLs from various sources (CDN links and HTML-embedded videos) and provides download links without storing videos on our server. Now supports YouTube, adult sites (PornHub, etc.), and general video extraction with HLS/DASH streaming support.

## Tech Stack
- **Full Stack**: Next.js 14 with App Router (TypeScript)
- **Backend API**: Next.js API Routes
- **URL Extraction**: Puppeteer for dynamic content
- **Video Processing**: yt-dlp and ffmpeg for HLS/DASH streams
- **Client-side**: Video URL detection scripts
- **Styling**: Tailwind CSS
- **Database**: SQLite via Prisma (for analytics, extraction history)
- **ORM**: Prisma
- **Ad Integration**: Google AdSense (prepared)
- **Analytics**: Google Analytics 4 (prepared)

## Core Features

### 1. Video URL Extraction
- **Direct CDN Links**: Detect .mp4, .webm, .m3u8 (HLS), .mpd (DASH)
- **HTML Embedded Videos**: Extract from HTML5 video tags, iframe embeds
- **Dynamic Content**: Use headless browser to capture dynamically loaded videos
- **Multi-quality Detection**: Find all available quality URLs
- **Direct Download Links**: Provide direct URLs to users for downloading

### 2. Supported Formats
- Direct video files (MP4, WebM, AVI, MOV)
- HLS Streams (.m3u8)
- DASH Streams (.mpd)
- Progressive HTTP downloads
- Blob URLs (with limitations)

### 3. User Interface
- Clean, modern design
- Paste URL input field
- Loading indicator while extracting URLs
- Display extracted video URLs with quality options
- One-click download buttons
- Copy URL to clipboard option
- Recent extractions history

### 4. Monetization
- Strategic ad placement (header, sidebar, between results)
- Non-intrusive ad experience
- Premium tier (ad-free, higher limits)

### 5. SEO Strategy
- Server-side rendering with Next.js App Router
- Structured data (Schema.org)
- Dynamic sitemap generation
- Meta tags optimization with Next.js metadata API
- Fast Core Web Vitals
- Mobile-first design
- Dynamic OG images for social sharing

## Technical Architecture

### API Routes (Next.js App Router)
```
POST /api/extract - Extract video URLs from a webpage
GET /api/proxy/[...url] - Optional proxy for CORS-blocked videos
POST /api/analytics - Track successful extractions
GET /api/history - Get user's extraction history
```

### Page Routes (SSR)
```
/ - Homepage with URL input form
/extract/[id] - Results page showing extracted URLs
/history - User's extraction history
/how-to - Tutorial pages (SEO)
/about - About page (SEO)
/faq - Frequently asked questions (SEO)
```

### URL Extraction Pipeline
1. **Page Load**: Load target page with Puppeteer/Playwright
2. **Network Monitoring**: Capture all network requests for video files
3. **DOM Analysis**: Parse HTML5 video/source tags
4. **JavaScript Execution**: Wait for dynamic content to load
5. **URL Collection**: Aggregate all found video URLs
6. **Response**: Return list of direct video URLs to client

### Security Considerations
- Rate limiting per IP (10 requests/minute)
- URL validation and sanitization
- Timeout for page loading (30 seconds max)
- Memory limits for headless browser
- No execution of untrusted scripts
- SQLite for analytics only (no sensitive data)
- Regular browser instance recycling

## Current Implementation Status

### Completed Features ✅
- **Core Infrastructure**
  - Next.js 14 with App Router and TypeScript
  - Tailwind CSS styling with dark mode support
  - SQLite database via Prisma for extraction history
  - Rate limiting (10 requests/minute per IP)
  
- **Video Extraction**
  - Puppeteer integration for dynamic content extraction
  - YouTube video extraction with yt-dlp support
  - Adult site extraction (PornHub, xVideos, xHamster)
  - HLS stream detection and download support
  - Quality detection for multi-quality videos
  - Network request interception for video URLs
  - **Quality-specific downloads** - respects user's resolution choice (480p, 720p, 1080p, etc.)
  
- **HLS/DASH Support**
  - HLS downloader component with quick download (.ts)
  - Convert to MP4 functionality using ffmpeg
  - yt-dlp integration for better compatibility
  - Progress tracking and error handling
  - **Audio+Video merging** for YouTube videos
  - **Quality-aware format selection** using yt-dlp format selectors
  
- **UI/UX Features**
  - Responsive design with mobile support
  - Copy URL to clipboard
  - Loading states and error messages
  - Format-specific download instructions
  - Debug logging in development
  - **Long URL handling** with proper text wrapping
  
### Specialized Extractors
1. **YouTube Extractor** (`lib/youtube-extractor.ts`)
   - Attempts yt-dlp first for best results
   - Falls back to Puppeteer for HLS streams
   - Detects quality from itag parameters
   - Properly marks HLS streams
   - Prioritizes non-HLS formats with audio

2. **Adult Site Extractor** (`lib/adult-extractor.ts`)
   - Uses pornhub.js package for PornHub
   - Falls back to Puppeteer when needed
   - Handles HLS streams properly
   - Filters out ads and tracking URLs

3. **General Puppeteer Extractor** (`lib/puppeteer.ts`)
   - Catches all video formats (mp4, webm, m3u8, mpd)
   - Filters out ads, analytics, and non-video URLs
   - Detects HLS streams automatically

### Pending Features 🚧
- [ ] AdSense integration (placeholders ready)
- [ ] Google Analytics 4 setup
- [ ] User accounts and saved extractions
- [ ] Premium tier (ad-free, higher limits)
- [ ] Browser pool management for scaling
- [ ] Request queuing system
- [ ] Analytics dashboard
- [ ] API documentation

## Legal Considerations
- Clear terms of service
- DMCA compliance
- User responsibility disclaimer
- Copyright notice
- Privacy policy

## Performance Targets
- < 3s page load time
- < 15s URL extraction time
- Handle 50 concurrent extractions
- Browser memory < 500MB per instance
- 95% uptime

## Deployment Requirements
- **Server**: VPS with 4GB+ RAM (DigitalOcean/AWS/Hetzner)
- **Dependencies**: 
  - Node.js 18+
  - Chrome/Chromium for Puppeteer
  - ffmpeg for video conversion
  - yt-dlp for enhanced extraction (optional but recommended)
- **Process Manager**: PM2 for Node.js
- **Reverse Proxy**: Nginx with proper headers for video streaming
- **SSL**: Let's Encrypt for HTTPS
- **Database**: SQLite (file-based, included in deployment)

## Installation Instructions
```bash
# Clone repository
git clone https://github.com/mitchellmoss/hubdownloader.git
cd hubdownloader

# Install dependencies
npm install

# Setup database
npx prisma migrate deploy

# Install system dependencies
sudo apt update
sudo apt install -y chromium-browser ffmpeg
pip install yt-dlp

# Build and start
npm run build
npm start
```

## SEO Keywords Target
- "video downloader"
- "download online videos"
- "save videos from website"
- "free video download tool"
- "web video downloader"

## Revenue Model
1. Display ads (primary)
   - Header banner
   - Sidebar ads
   - Between extraction results
2. Optional donations
   - Buy me a coffee integration
   - Crypto donations

## Success Metrics
- Monthly active users
- Average extractions per user
- Ad revenue per user
- Server costs vs revenue
- Page load speed
- Extraction success rate

## Known Issues & Solutions

### HLS Download Issues
- **HMAC Authentication Errors**: Some sites use time-based tokens. Use yt-dlp for better handling
- **Incomplete Downloads**: Install yt-dlp for more reliable HLS downloads
- **Conversion Failures**: Ensure ffmpeg is installed and up to date

### YouTube Extraction
- YouTube URLs are best handled with yt-dlp installed
- Falls back to HLS stream detection via Puppeteer
- Quality is detected from itag parameters in URLs

### Development Notes
- Run with `npm run dev` for hot reload
- Check browser console for extraction debug logs
- Database file is at `prisma/dev.db`
- Logs show extraction flow: YouTube → Adult → Puppeteer

## Testing Checklist
- [ ] YouTube video extraction (with/without yt-dlp)
- [ ] Adult site video extraction
- [ ] HLS stream download (.ts format)
- [ ] HLS to MP4 conversion
- [ ] Rate limiting (>10 requests/minute)
- [ ] Mobile responsive design
- [ ] Error handling for invalid URLs
- [ ] Quality-specific downloads (480p, 720p, 1080p)
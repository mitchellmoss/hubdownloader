# HubDownloader - General Purpose Video Downloader

## Project Overview
A web application that extracts direct video URLs from various sources (CDN links and HTML-embedded videos) and provides download links without storing videos on our server.

## Tech Stack
- **Full Stack**: Next.js 14 with App Router (TypeScript)
- **Backend API**: Next.js API Routes
- **URL Extraction**: Puppeteer/Playwright for dynamic content
- **Client-side**: Video URL detection scripts
- **Styling**: Tailwind CSS
- **Database**: SQLite (for analytics, user sessions)
- **ORM**: Prisma or Drizzle ORM
- **Ad Integration**: Google AdSense
- **Analytics**: Google Analytics 4

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

## Development Phases

### Phase 1: Core Functionality (Week 1-2)
- [ ] Setup Next.js 14 project with App Router
- [ ] Configure TypeScript and Tailwind CSS
- [ ] Setup SQLite for analytics
- [ ] Implement Puppeteer integration
- [ ] Create /api/extract endpoint
- [ ] Build SSR homepage with URL input
- [ ] Basic video URL detection (MP4, WebM)
- [ ] Results display page

### Phase 2: Advanced Features (Week 3-4)
- [ ] HLS/DASH stream URL detection
- [ ] Iframe embed extraction
- [ ] Network request interception
- [ ] Multiple quality detection
- [ ] Browser fingerprinting evasion
- [ ] Extraction history with SQLite

### Phase 3: UI/UX Enhancement (Week 5)
- [ ] Responsive design
- [ ] URL extraction progress indicator
- [ ] Copy-to-clipboard functionality
- [ ] Error handling and retry
- [ ] Loading states with skeleton UI
- [ ] Download instructions per format

### Phase 4: Monetization & SEO (Week 6)
- [ ] AdSense integration
- [ ] SEO optimizations
- [ ] Analytics setup
- [ ] Performance optimization
- [ ] CDN integration

### Phase 5: Scaling & Polish (Week 7-8)
- [ ] Browser pool management
- [ ] Request queuing system
- [ ] Analytics dashboard
- [ ] Rate limiting implementation
- [ ] API documentation
- [ ] Performance optimization

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

## Deployment
- Full Stack App: VPS (DigitalOcean 4GB RAM minimum)
- Browser Instances: Puppeteer with Chrome
- Database: SQLite file for analytics
- Process Manager: PM2 for Node.js
- Reverse Proxy: Nginx
- SSL: Let's Encrypt
- Domain: Choose SEO-friendly name
- Monitoring: Basic health checks

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
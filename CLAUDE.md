# Lyricless - Client-Side Video Downloader

## Project Overview
A web application that extracts and downloads videos entirely in the browser using WebAssembly and client-side JavaScript. No server-side video processing - complete privacy and performance.

## Client-Side Architecture (client-side-new branch)

### Tech Stack
- **Frontend**: Next.js 14 with App Router (TypeScript)
- **Client-Side Video Processing**: 
  - FFmpeg.wasm for video conversion
  - m3u8-parser for HLS parsing
  - Browser APIs for video detection
- **Minimal Backend**: 
  - CORS proxy endpoint only
  - Rate limiting
  - Analytics (optional)
- **Styling**: Tailwind CSS
- **Browser Extension**: Enhanced extraction capabilities

### Core Client-Side Modules

#### 1. Video Detector (`lib/client/video-detector.ts`)
- Monitors DOM for video elements
- Intercepts fetch/XHR requests
- Detects video URLs from network traffic
- Supports MP4, WebM, HLS, DASH formats
- Emits custom events for detected videos

#### 2. HLS Client (`lib/client/hls-client.ts`)
- Parses HLS master and variant playlists
- Downloads segments in parallel batches
- Concatenates segments into single blob
- Handles CORS with proxy fallback

#### 3. FFmpeg Client (`lib/client/ffmpeg-client.ts`)
- WebAssembly-based video processing
- HLS to MP4 conversion
- Audio/video stream merging
- Thumbnail extraction
- Metadata parsing

#### 4. YouTube Client (`lib/client/youtube-client.ts`)
- Extracts video info without yt-dlp
- Parses YouTube player response
- Handles separate audio/video streams
- Quality selection support

#### 5. Unified Extractor (`lib/client/unified-extractor.ts`)
- Combines all extraction methods
- Automatic site detection
- Progress tracking
- Download management

### Minimal Server Components

#### CORS Proxy (`api/proxy/cors/route.ts`)
- Bypasses CORS restrictions
- Whitelisted domains only
- Proper referer headers
- Minimal overhead

### Browser Extension (Optional)
- Enhanced network request interception
- Background video detection
- Badge notification
- Works on any website

## Key Advantages of Client-Side Architecture

### Privacy
- No video data sent to servers
- Complete user privacy
- No server logs of video URLs
- Local processing only

### Performance
- No server bandwidth costs
- Parallel processing
- Direct downloads
- WebAssembly speed

### Scalability
- No server infrastructure needed
- Handles unlimited users
- No video storage required
- Minimal hosting costs

### Security
- No server-side vulnerabilities
- No data breaches possible
- Client-isolated processing
- No stored user data

## Implementation Status ✅

### Completed
- [x] Client-side video detection
- [x] HLS parsing and downloading
- [x] FFmpeg.wasm integration
- [x] YouTube extraction without yt-dlp
- [x] CORS proxy endpoint
- [x] Unified extraction API
- [x] Progress tracking
- [x] Browser extension structure

### Pending
- [ ] Install dependencies (npm install)
- [ ] Test all extraction methods
- [ ] Optimize WebAssembly loading
- [ ] Add more site-specific extractors
- [ ] Improve CORS handling
- [ ] Add IndexedDB caching

## Usage Instructions

### Development
```bash
# Install new dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Browser Extension
1. Open Chrome/Edge
2. Go to chrome://extensions
3. Enable Developer Mode
4. Load unpacked from `/extension` folder

## Client-Side Limitations & Solutions

### Limitation 1: CORS
**Problem**: Can't fetch from most video sites directly
**Solution**: Minimal CORS proxy for manifest/metadata only

### Limitation 2: Site Access
**Problem**: Can't navigate to sites programmatically
**Solution**: Browser extension or user-initiated extraction

### Limitation 3: DRM Content
**Problem**: Can't extract DRM-protected videos
**Solution**: Clear messaging to users about limitations

### Limitation 4: Large Files
**Problem**: Memory constraints for large videos
**Solution**: Streaming download with chunks

## SEO & Marketing
- "Client-side video downloader"
- "Browser-based video extraction"
- "Private video downloader"
- "No upload video downloader"
- "WebAssembly video converter"

## Future Enhancements
1. **Service Worker**: Offline support
2. **WebRTC**: P2P video sharing
3. **IndexedDB**: Local video library
4. **PWA**: Installable app
5. **WebGPU**: Hardware acceleration
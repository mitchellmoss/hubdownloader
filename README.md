# Lyricless - Video URL Extractor

A web application that extracts direct video URLs from websites without storing them on the server.

## Features

- Extract video URLs from any website
- Support for MP4, WebM, HLS, and DASH formats
- No server-side video storage
- Rate limiting for abuse prevention
- SQLite database for analytics
- SEO optimized with Next.js 14 App Router
- Mobile responsive design

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Web Scraping**: Puppeteer
- **Package Manager**: npm

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome/Chromium (for Puppeteer)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/lyricless.git
cd lyricless
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Set up the database:
```bash
npm run db:push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Environment Variables

- `DATABASE_URL`: SQLite database connection string
- `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`: Google AdSense publisher ID (optional)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: Google Analytics ID (optional)
- `PRESIGNED_URL_SECRET`: Secret key for signing presigned URLs (required for production)
- `DIRECT_DOWNLOAD_DOMAIN`: Domain for direct file downloads (e.g., dl.lyricless.com)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Production Deployment

### VPS Deployment with Cloudflare Tunnel (Recommended)

This deployment uses a dual-architecture approach: Cloudflare Tunnel protects the main application while large file downloads bypass the tunnel for better performance.

1. Set up a VPS with at least 4GB RAM (DigitalOcean, Linode, etc.)

2. Install Node.js, PM2, and system dependencies:
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Chrome for Puppeteer
sudo apt-get update
sudo apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Video processing tools (optional but recommended)
sudo apt-get install -y ffmpeg
pip install yt-dlp
```

3. Clone and build the project:
```bash
git clone https://github.com/yourusername/lyricless.git
cd lyricless
npm install
npm run build
```

4. Set up environment variables:
```bash
# Generate a secure random string for PRESIGNED_URL_SECRET
export PRESIGNED_URL_SECRET=$(openssl rand -base64 32)
export DIRECT_DOWNLOAD_DOMAIN=dl.lyricless.com
```

5. Configure Cloudflare Tunnel:
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
sudo mv cloudflared /usr/local/bin
sudo chmod +x /usr/local/bin/cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create lyricless

# Configure tunnel (create config.yml)
cat > ~/.cloudflared/config.yml << EOF
url: http://localhost:3000
tunnel: <your-tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json
EOF

# Run tunnel as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

6. Set up Nginx for direct downloads (bypassing Cloudflare):
```bash
# Install Nginx
sudo apt-get install -y nginx

# Configure Nginx (see nginx-config.md for full configuration)
sudo nano /etc/nginx/sites-available/dl.lyricless.com
# Add configuration from nginx-config.md
sudo ln -s /etc/nginx/sites-available/dl.lyricless.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

7. Configure DNS:
```
# In your DNS provider:
# A record: app.lyricless.com → Cloudflare Tunnel (handled by Cloudflare)
# A record: dl.lyricless.com → Your server's IP (bypasses Cloudflare)
```

8. Start the application with PM2:
```bash
pm2 start npm --name "lyricless" -- start
pm2 save
pm2 startup
```

9. Set up SSL for direct download domain:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d dl.lyricless.com
```

### Architecture Benefits

- **IP Protection**: Main app (app.lyricless.com) is protected by Cloudflare
- **Performance**: Large files (>10MB) bypass Cloudflare for faster downloads
- **Cost Savings**: Reduced Cloudflare bandwidth usage
- **Scalability**: Can add CDN or multiple direct servers later

## Security Considerations

- Rate limiting is implemented (10 requests per minute per IP)
- Input validation on all API endpoints
- Puppeteer runs with security flags
- No execution of untrusted scripts
- Regular cleanup of temporary data

## Legal Notice

This tool is for educational and personal use only. Users are responsible for complying with all applicable laws and website terms of service. Do not use this tool to:

- Download copyrighted content without permission
- Violate website terms of service
- Access restricted or private content
- Engage in any illegal activities

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details
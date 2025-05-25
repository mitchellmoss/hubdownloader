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

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

## Production Deployment

### VPS Deployment (Recommended)

1. Set up a VPS with at least 4GB RAM (DigitalOcean, Linode, etc.)

2. Install Node.js and PM2:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

3. Install Chrome dependencies for Puppeteer:
```bash
sudo apt-get update
sudo apt-get install -y wget gnupg
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable
```

4. Clone and build the project:
```bash
git clone https://github.com/yourusername/lyricless.git
cd lyricless
npm install
npm run build
```

5. Start with PM2:
```bash
pm2 start npm --name "lyricless" -- start
pm2 save
pm2 startup
```

6. Set up Nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

7. Set up SSL with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

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
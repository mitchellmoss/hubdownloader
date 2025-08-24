# Lyricless - Docker Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Lyricless server-side video downloader application using Docker. The application includes Puppeteer for browser automation, yt-dlp for video extraction, FFmpeg for video processing, and SQLite for data persistence.

## 🏗️ Architecture

### Server-Side Components
- **Next.js 14**: Web application framework with App Router
- **Puppeteer**: Headless Chrome for dynamic content extraction
- **yt-dlp**: Advanced video extraction from various platforms
- **FFmpeg**: Video processing and conversion
- **SQLite + Prisma**: Database for analytics and extraction history
- **Nginx**: Reverse proxy with video streaming optimization

### Container Structure
```
lyricless-network
├── lyricless-app (Main Application)
├── nginx (Reverse Proxy)
├── redis (Optional - Caching)
├── prometheus (Optional - Monitoring)
└── grafana (Optional - Analytics)
```

## 📋 Prerequisites

### System Requirements
- **Docker**: Version 20.10+ 
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 20GB+ free space for video processing
- **CPU**: 2+ cores (4+ recommended for concurrent processing)

### Operating System Support
- ✅ Linux (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- ✅ macOS (Intel and Apple Silicon)
- ✅ Windows 10/11 with WSL2

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd lyricless
chmod +x deploy-docker.sh
```

### 2. Environment Configuration
```bash
# Copy and customize environment file
cp .env.docker.example .env.docker

# Edit configuration (required)
nano .env.docker
```

### 3. Deploy Production
```bash
# Setup and start production environment
./deploy-docker.sh setup production
./deploy-docker.sh build production
./deploy-docker.sh start production
```

### 4. Verify Deployment
```bash
# Check service status
./deploy-docker.sh status

# View logs
./deploy-docker.sh logs

# Perform health check
./deploy-docker.sh health
```

## 🔧 Detailed Configuration

### Environment Variables (.env.docker)

#### Core Application Settings
```env
NODE_ENV=production
APP_PORT=3000
DATABASE_URL=file:/app/data/database.db
```

#### Video Processing Configuration
```env
MAX_VIDEO_SIZE=500MB
MAX_CONCURRENT_DOWNLOADS=3
TEMP_DIR=/app/temp
DOWNLOADS_DIR=/app/downloads
CLEANUP_TEMP_FILES=true
CLEANUP_INTERVAL=3600
```

#### Browser Automation (Puppeteer)
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CHROME_FLAGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

#### Video Extraction (yt-dlp)
```env
YTDLP_MAX_QUALITY=1080p
YTDLP_CONCURRENT_FRAGMENTS=4
YTDLP_OUTPUT_TEMPLATE=/app/temp/%(title)s.%(ext)s
```

#### Security Settings
```env
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=3600000
CORS_ORIGINS=*
```

### Resource Limits

#### Production Limits
```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'      # 4 CPU cores
      memory: 4G       # 4GB RAM
    reservations:
      cpus: '1.0'      # 1 CPU core reserved
      memory: 512M     # 512MB RAM reserved
```

#### Development Limits
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # 2 CPU cores
      memory: 2G       # 2GB RAM
```

## 📁 Volume Management

### Persistent Data Volumes
```yaml
volumes:
  lyricless_data:     # SQLite database and app data
  lyricless_downloads: # User downloads
  lyricless_logs:     # Application logs
```

### Temporary Storage
```yaml
volumes:
  lyricless_temp:     # Temporary video processing (tmpfs)
  lyricless_cache:    # Next.js build cache
```

### Host Bind Mounts
```bash
# Customize these paths in .env.docker
DATA_PATH=./data
DOWNLOADS_PATH=./downloads
LOGS_PATH=./logs
```

## 🔒 Security Considerations

### Container Security
- ✅ Non-root user execution
- ✅ Read-only root filesystem where possible
- ✅ Minimal attack surface (Alpine Linux base)
- ✅ No-new-privileges security option
- ✅ Resource limits enforced

### Network Security
- ✅ Internal Docker network isolation
- ✅ Rate limiting on API endpoints
- ✅ CORS policy enforcement
- ✅ Security headers (Nginx)

### Data Security
- ✅ Temporary file cleanup
- ✅ Database file permissions
- ✅ Log rotation and cleanup
- ✅ SSL/TLS support (optional)

## 🛠️ Development Environment

### Development Setup
```bash
# Start development environment
./deploy-docker.sh setup development
./deploy-docker.sh build development
./deploy-docker.sh start development

# Access development server
open http://localhost:3000
```

### Development Features
- 🔥 Hot reload enabled
- 📝 Debug logging
- 🔧 Development tools included
- 💾 Volume mounts for code changes
- 🚫 Reduced security restrictions

### Development Commands
```bash
# Build development image
docker build -f Dockerfile.development -t lyricless:dev .

# Run with volume mounts
docker run -v $(pwd):/app -p 3000:3000 lyricless:dev
```

## 📊 Monitoring and Analytics

### Enable Monitoring Stack
```bash
# Start with monitoring profile
./deploy-docker.sh start production monitoring
```

### Monitoring Services
- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Visualization dashboard (http://localhost:3001)
- **Redis**: Caching and session storage

### Health Checks
```bash
# Built-in health check endpoint
curl http://localhost:3000/api/test

# Container health status
docker ps --filter "name=lyricless" --format "table {{.Names}}\t{{.Status}}"
```

## 🔄 Deployment Profiles

### Production Profile (Default)
```bash
./deploy-docker.sh start production
```
- Main application + Nginx
- Optimized for performance
- Security hardened
- Resource limits enforced

### Development Profile
```bash
./deploy-docker.sh start development
```
- Hot reload enabled
- Debug tools included
- Relaxed security settings

### Full Stack Profile
```bash
./deploy-docker.sh start production cache monitoring
```
- All services including Redis, Prometheus, Grafana
- Complete observability stack
- Production monitoring

## 📦 Backup and Maintenance

### Automated Backup
```bash
# Create backup
./deploy-docker.sh backup

# Backups stored in: backups/YYYYMMDD_HHMMSS.tar.gz
```

### Manual Operations
```bash
# Database backup
docker exec lyricless-app cp /app/data/database.db /backup/

# Log rotation
docker exec lyricless-app find /app/logs -name "*.log" -mtime +7 -delete

# Cleanup temporary files
docker exec lyricless-app find /app/temp -type f -mmin +60 -delete
```

### Update Deployment
```bash
# Update to latest version
./deploy-docker.sh update production

# This will:
# 1. Create backup
# 2. Pull latest images
# 3. Rebuild application
# 4. Restart services
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker logs lyricless-app

# Check system resources
df -h  # Disk space
free -h  # Memory usage
```

#### 2. Puppeteer Chrome Issues
```bash
# Check Chrome installation
docker exec lyricless-app chromium-browser --version

# Test Chrome flags
docker exec lyricless-app chromium-browser --no-sandbox --headless --dump-dom https://www.google.com
```

#### 3. Video Processing Failures
```bash
# Check FFmpeg
docker exec lyricless-app ffmpeg -version

# Check yt-dlp
docker exec lyricless-app yt-dlp --version
```

#### 4. Database Issues
```bash
# Check database file
docker exec lyricless-app ls -la /app/data/

# Test Prisma connection
docker exec lyricless-app npx prisma db push
```

#### 5. Network Issues
```bash
# Check network connectivity
docker network ls
docker network inspect lyricless-network

# Test internal communication
docker exec lyricless-app curl http://nginx/health
```

### Performance Optimization

#### Memory Usage
```bash
# Monitor memory usage
docker stats lyricless-app

# Increase memory limits if needed (docker-compose.production.yml)
memory: 8G  # Increase from 4G
```

#### Storage Optimization
```bash
# Clean up Docker system
docker system prune -a

# Monitor disk usage
du -sh data/ downloads/ logs/
```

#### Video Processing Optimization
```env
# Optimize concurrent processing
MAX_CONCURRENT_DOWNLOADS=5  # Increase for powerful servers
YTDLP_CONCURRENT_FRAGMENTS=8  # Increase download speed

# Optimize cleanup
CLEANUP_INTERVAL=1800  # Clean every 30 minutes
```

## 📋 Production Checklist

### Pre-Deployment
- [ ] Review and customize `.env.docker`
- [ ] Ensure adequate system resources
- [ ] Configure SSL certificates (if using HTTPS)
- [ ] Set up backup strategy
- [ ] Configure monitoring (optional)

### Deployment
- [ ] Build and test images
- [ ] Start services with production profile
- [ ] Verify all health checks pass
- [ ] Test video extraction functionality
- [ ] Configure reverse proxy/load balancer

### Post-Deployment
- [ ] Monitor resource usage
- [ ] Set up log rotation
- [ ] Configure backup automation
- [ ] Document custom configurations
- [ ] Plan update strategy

## 🆘 Support

### Getting Help
- Check logs: `./deploy-docker.sh logs`
- Health check: `./deploy-docker.sh health`
- Container status: `docker ps`
- Resource usage: `docker stats`

### Common Commands
```bash
# View all containers
docker ps -a

# Follow logs in real-time
docker logs -f lyricless-app

# Access container shell
docker exec -it lyricless-app sh

# Restart services
./deploy-docker.sh restart production
```

This deployment guide ensures a robust, scalable, and secure Docker deployment for your Lyricless video downloader application.
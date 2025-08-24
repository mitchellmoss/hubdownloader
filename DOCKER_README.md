# 🐳 Lyricless Docker Guide

Complete containerization guide for the client-side video downloader.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 4GB RAM available
- Node.js 20+ (for development)

### 1. Initial Setup
```bash
# Make setup script executable and run
chmod +x docker-setup.sh
./docker-setup.sh
```

### 2. Production Deployment
```bash
# Start production containers
docker compose up -d

# View logs
docker compose logs -f lyricless

# Stop containers
docker compose down
```

### 3. Development Environment
```bash
# Start development with hot reload
docker compose -f docker-compose.dev.yml up -d

# With Prisma Studio for database management
docker compose -f docker-compose.dev.yml --profile tools up -d

# View development logs
docker compose -f docker-compose.dev.yml logs -f lyricless-dev
```

## 📁 Docker Architecture

### Multi-Stage Build Optimization
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     base        │ -> │   dev-deps      │ -> │    builder      │ -> │    runner       │
│ Node.js + deps  │    │ All packages    │    │ Build Next.js   │    │ Production run  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Container Structure
- **Base Image**: Node.js 20 Alpine (minimal size)
- **Security**: Non-root user (uid 1001)
- **Health Checks**: Built-in application monitoring
- **Resource Limits**: Optimized for client-side processing

## 🔧 Configuration Files

### Docker Files
- `Dockerfile` - Production optimized multi-stage build
- `docker-compose.yml` - Production environment
- `docker-compose.dev.yml` - Development environment
- `.dockerignore` - Build context optimization

### Environment Files
- `.env.docker` - Production environment variables
- `.env.docker.dev` - Development environment variables

## 🎯 Client-Side Features in Docker

### WebAssembly Support
- FFmpeg.wasm integration
- Proper CORS headers for CDN access
- Cross-origin isolation headers
- Memory management for large video processing

### Browser Extension Access
- Extension files mounted in container
- Accessible at `/app/extension`
- Development hot reload supported

### Minimal Backend
- Only CORS proxy endpoint
- No server-side video processing
- Complete client-side privacy

## 🔒 Security Features

### Container Security
- Non-root execution (user: nextjs, uid: 1001)
- Read-only root filesystem
- No new privileges flag
- Resource limits and constraints

### Network Security
- Custom bridge network isolation
- Rate limiting on API endpoints
- Security headers (CSP, HSTS, XSS)
- CORS policies configured

## 📊 Performance Optimizations

### Image Size Reduction
- Multi-stage builds (~75% smaller)
- Optimized .dockerignore
- Alpine Linux base
- Standalone Next.js output

### Runtime Performance
- WebAssembly JIT compilation
- Client-side parallel processing
- Nginx caching and compression
- Resource-optimized containers

## 🛠 Development Workflow

### Hot Reload Development
```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View real-time logs
docker compose -f docker-compose.dev.yml logs -f lyricless-dev

# Access application
open http://localhost:3000

# Access Prisma Studio (if started with --profile tools)
open http://localhost:5555
```

### Database Management
```bash
# Run Prisma commands in container
docker compose -f docker-compose.dev.yml exec lyricless-dev npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec lyricless-dev npx prisma generate
docker compose -f docker-compose.dev.yml exec lyricless-dev npx prisma studio
```

### Debugging
```bash
# Enter container shell
docker compose -f docker-compose.dev.yml exec lyricless-dev sh

# View container stats
docker stats lyricless-dev

# Inspect container
docker inspect lyricless-dev
```

## 📋 Available Commands

### Setup Commands
```bash
./docker-setup.sh                 # Complete setup and test
./docker-setup.sh --build-only    # Only build images
./docker-setup.sh --test-prod     # Test production container
./docker-setup.sh --test-dev      # Test development container
./docker-setup.sh --cleanup       # Cleanup containers
```

### Docker Compose Commands
```bash
# Production
docker compose up -d                    # Start production
docker compose down                     # Stop production
docker compose logs -f lyricless       # View production logs
docker compose exec lyricless sh       # Enter production container

# Development
docker compose -f docker-compose.dev.yml up -d                        # Start development
docker compose -f docker-compose.dev.yml down                         # Stop development
docker compose -f docker-compose.dev.yml logs -f lyricless-dev        # View dev logs
docker compose -f docker-compose.dev.yml exec lyricless-dev sh        # Enter dev container
```

## 🔍 Troubleshooting

### Common Issues

#### Docker Daemon Not Running
```bash
# Check Docker status
docker info

# Start Docker Desktop
open /Applications/Docker.app
```

#### Build Failures
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t lyricless:latest .
```

#### WebAssembly Issues
```bash
# Check CORS headers
curl -I http://localhost:3000/api/proxy/cors

# Verify WebAssembly CDN access
curl -I https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $(id -u):$(id -g) data/

# Check container user
docker compose exec lyricless id
```

### Health Checks
```bash
# Check container health
docker compose ps

# Manual health check
curl -f http://localhost:3000/api/test

# View health check logs
docker inspect lyricless-app --format='{{json .State.Health}}'
```

## 🚀 Production Deployment

### Environment Setup
1. Copy `.env.docker` to `.env`
2. Update environment variables for production
3. Configure SSL certificates in `nginx/ssl/`
4. Set up proper DNS records

### Production Commands
```bash
# Build production image
docker build -t lyricless:latest .

# Start with Nginx reverse proxy
docker compose --profile production up -d

# Monitor logs
docker compose logs -f

# Rolling update
docker compose pull && docker compose up -d
```

### Monitoring
- Health checks run every 30 seconds
- Logs rotated automatically (max 5MB, 3 files)
- Resource limits prevent container resource exhaustion

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [WebAssembly in Browsers](https://webassembly.org/)
- [FFmpeg.wasm Documentation](https://ffmpegwasm.netlify.app/)

---

**Note**: This is a client-side video downloader. All video processing happens in the browser using WebAssembly. The Docker containers serve the web application and provide minimal backend services only.
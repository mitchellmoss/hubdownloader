# Lyricless - Docker Containerization Guide

## Overview

This guide provides comprehensive instructions for containerizing the Lyricless Next.js 14 video downloader application. The containerization supports both development and production environments with optimizations for WebAssembly execution, security, and performance.

## Quick Start

### Production Deployment

```bash
# Build and deploy
./scripts/docker/build.sh
./scripts/docker/deploy.sh

# Or use docker-compose directly
docker compose up -d
```

### Development Environment

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

## Architecture

### Client-Side Processing
- **WebAssembly Support**: FFmpeg.wasm for video conversion
- **HLS Processing**: Client-side HLS parsing and downloading
- **Browser Extension**: Accessible extension files for enhanced extraction
- **Minimal Backend**: Only CORS proxy endpoint on server

### Security Features
- Multi-stage builds with minimal attack surface
- Non-root user execution
- Read-only filesystems where possible
- Security headers and CORS configuration
- Rate limiting and resource constraints

## File Structure

```
├── Dockerfile.optimized      # Production-optimized Dockerfile
├── Dockerfile.dev           # Development Dockerfile
├── docker-compose.yml       # Production compose configuration
├── docker-compose.dev.yml   # Development compose configuration
├── .env.docker             # Production environment variables
├── .env.docker.dev         # Development environment variables
├── nginx/
│   └── nginx.conf          # Nginx reverse proxy configuration
└── scripts/docker/
    ├── build.sh           # Build script with optimizations
    └── deploy.sh          # Deployment script with health checks
```

## Configuration

### Environment Variables

#### Production (.env.docker)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=file:./prisma/dev.db
NEXT_TELEMETRY_DISABLED=1
RATE_LIMIT_ENABLED=true
MAX_VIDEO_SIZE=500MB
```

#### Development (.env.docker.dev)
```env
NODE_ENV=development
DEBUG_MODE=true
VERBOSE_LOGGING=true
WATCHPACK_POLLING=true
MAX_VIDEO_SIZE=1GB
```

### Docker Compose Services

#### Main Application (lyricless)
- **Resources**: 2 CPU cores, 2GB RAM limit
- **Volumes**: Database persistence, extension files, temp storage
- **Security**: Non-root user, read-only filesystem, security options
- **Health Checks**: API endpoint monitoring

#### Nginx Reverse Proxy (nginx)
- **Features**: Rate limiting, compression, caching
- **Security**: Security headers, request filtering
- **WebAssembly**: Special handling for .wasm files
- **SSL Ready**: HTTPS configuration template included

#### Development Tools (prisma-studio)
- **Database GUI**: Prisma Studio for development
- **Port**: 5555 (development only)
- **Hot Reload**: File watching enabled

## Building Images

### Production Build
```bash
# Using build script (recommended)
./scripts/docker/build.sh v1.0.0

# Manual build
docker build -f Dockerfile.optimized -t lyricless:latest .
```

### Development Build
```bash
# Development environment
docker build -f Dockerfile.dev -t lyricless:dev .
```

### Build Optimizations
- Multi-stage builds for smaller images
- Layer caching with .dockerignore
- Dependency caching with npm ci
- Security scanning integration
- BuildKit for improved performance

## Deployment

### Production Deployment
```bash
# Full deployment with health checks
./scripts/docker/deploy.sh deploy rolling

# Fresh deployment (removes all data)
./scripts/docker/deploy.sh deploy fresh

# Check status
./scripts/docker/deploy.sh status
```

### Deployment Modes
- **Rolling**: Update containers with zero downtime
- **Fresh**: Clean deployment removing all data
- **Blue-Green**: (Future) Parallel environment deployment

### Health Checks
- Application startup verification
- API endpoint testing
- WebAssembly functionality verification
- Resource usage monitoring

## WebAssembly Considerations

### FFmpeg.wasm Support
```javascript
// Client-side video processing
const ffmpeg = new FFmpeg();
await ffmpeg.load({
  coreURL: '/ffmpeg-core.js',
  wasmURL: '/ffmpeg-core.wasm'
});
```

### Next.js Configuration
```javascript
// next.config.mjs
webpack: (config) => {
  config.experiments = {
    asyncWebAssembly: true,
    layers: true
  };
  return config;
}
```

### Nginx Headers
```nginx
# WebAssembly specific headers
location ~* \.wasm$ {
    add_header Content-Type application/wasm;
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;
}
```

## Security Best Practices

### Container Security
- **Non-root execution**: User `nextjs` (UID 1001)
- **Read-only filesystem**: Prevents runtime modifications
- **Resource limits**: CPU and memory constraints
- **No shell access**: Distroless-style approach
- **Security scanning**: Integrated vulnerability checks

### Network Security
- **Rate limiting**: API endpoint protection
- **CORS policies**: Restricted origins
- **Security headers**: XSS, clickjacking protection
- **TLS ready**: HTTPS configuration available

### Data Protection
- **Volume encryption**: Host-level encryption recommended
- **Backup encryption**: Secure backup storage
- **Secret management**: Environment-based secrets
- **Access logging**: Request and error logging

## Monitoring and Logging

### Health Monitoring
```bash
# Container health status
docker compose ps

# Application logs
docker compose logs -f lyricless

# System resources
docker stats
```

### Log Management
- **Structured logging**: JSON format logs
- **Log rotation**: Size and time-based rotation
- **Error tracking**: Application error monitoring
- **Access logs**: Nginx request logging

### Metrics Collection
- Container resource usage
- Application performance metrics
- WebAssembly execution metrics
- Video processing statistics

## Troubleshooting

### Common Issues

#### WebAssembly Loading Errors
```bash
# Check WASM file accessibility
curl -I http://localhost:3000/ffmpeg-core.wasm

# Verify headers
docker compose logs nginx | grep wasm
```

#### Memory Issues
```bash
# Increase container memory
docker compose up -d --scale lyricless=0
docker compose up -d --memory=4g lyricless
```

#### Permission Errors
```bash
# Check volume permissions
docker compose exec lyricless ls -la /tmp/videos
docker compose exec lyricless id
```

### Debug Mode
```bash
# Enable debug logging
docker compose -f docker-compose.dev.yml up -d

# Connect to container
docker compose exec lyricless sh

# Check Node.js version and modules
docker compose exec lyricless node --version
docker compose exec lyricless npm list
```

## Performance Optimization

### Image Size Optimization
- Multi-stage builds: ~75% size reduction
- Alpine Linux base: Minimal OS footprint
- Dependency pruning: Production-only packages
- Layer caching: Faster rebuilds

### Runtime Performance
- WebAssembly JIT compilation
- Nginx caching and compression
- Resource pooling and limits
- Database connection optimization

### Scaling Considerations
- Horizontal scaling with load balancer
- Shared volume configuration
- Database connection pooling
- Resource monitoring and alerts

## Backup and Recovery

### Backup Strategy
```bash
# Automated backup
./scripts/docker/deploy.sh deploy rolling  # Creates backup automatically

# Manual backup
docker compose exec lyricless tar -czf /tmp/backup.tar.gz /app/prisma
```

### Recovery Process
```bash
# Rollback to previous version
./scripts/docker/deploy.sh rollback

# Restore from backup
docker compose down
# Restore volumes from backup
docker compose up -d
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Database backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] WebAssembly functionality verified
- [ ] Resource limits appropriate
- [ ] Log rotation configured
- [ ] Health checks passing

## Support and Resources

### Documentation
- [Docker Best Practices](https://docs.docker.com/develop/best-practices/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)
- [WebAssembly Security](https://webassembly-security.com/)

### Monitoring Tools
- Docker Stats: Built-in resource monitoring
- Portainer: Web-based Docker management
- Prometheus: Metrics collection
- Grafana: Visualization dashboards

### Community
- GitHub Issues: Report problems and feature requests
- Docker Community: General containerization questions
- Next.js Discussions: Framework-specific questions
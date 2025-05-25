# Lyricless Scaling Guide

## Overview
This document outlines the infrastructure requirements and scaling strategies for serving Lyricless to thousands of users.

## Key Resource-Intensive Components

### 1. Puppeteer (Headless Chrome)
- Each extraction spawns a Chrome instance
- ~200-500MB RAM per instance
- ~0.5-1 CPU core per active extraction
- Page load timeout: 30 seconds

### 2. Video Processing (yt-dlp/ffmpeg)
- HLS to MP4 conversion: ~100-200MB RAM
- ~0.5-1 CPU core per conversion
- Can take 1-5 minutes for large videos

## Recommended Server Specifications

### Low-Medium Traffic (~1,000 Daily Active Users)
```
- 8 vCPUs
- 16GB RAM
- 200GB SSD
- 10TB bandwidth/month
- Cost: ~$80-120/month (DigitalOcean/Hetzner)
```

### High Traffic (~10,000 Daily Active Users)
```
- 16-32 vCPUs
- 32-64GB RAM
- 500GB SSD
- 50TB+ bandwidth/month
- Cost: ~$300-500/month
```

### Enterprise Scale (100k+ Daily Users)
```
Multiple servers with load balancing:
- 3-5 extraction servers (16 vCPUs, 32GB RAM each)
- 2 web servers (8 vCPUs, 16GB RAM each)
- 1 queue/database server
- CDN for static assets
- Cost: ~$1,500-3,000/month
```

## Optimization Strategies

### 1. Browser Pool Management
```javascript
// Reuse browser instances instead of creating new ones
const browserPool = new BrowserPool({
  maxInstances: 10,
  retireInstanceAfterUses: 100
})
```

### 2. Queue System Implementation
```javascript
// Implement job queue to prevent overload
// Redis + Bull queue recommended
const extractionQueue = new Queue('extractions', {
  concurrency: 10,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false
  }
})
```

### 3. Caching Strategy
- Cache extraction results for popular URLs
- CDN for video proxying
- Redis for session/rate limiting

### 4. Resource Limits
```javascript
// Set strict limits per extraction
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })
await page.setRequestInterception(true)
// Block images/fonts to save bandwidth
page.on('request', (request) => {
  if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
    request.abort()
  } else {
    request.continue()
  }
})
```

## Architecture for Scale

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Nginx     │────▶│  Web Servers │────▶│  Redis Queue    │
│  (LB/SSL)   │     │  (Next.js)   │     │                 │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────┐     ┌─────────▼────────┐
                    │   Storage    │◀────│ Worker Servers   │
                    │  (S3/CDN)    │     │  (Puppeteer)    │
                    └──────────────┘     └─────────────────┘
```

## Cost-Effective Tips

1. **Use ARM servers** - 20-40% cheaper, great for Puppeteer workloads
2. **Implement aggressive caching** - Reduce repeated extractions
3. **Use spot/preemptible instances** for worker servers
4. **Bandwidth optimization**:
   - Don't proxy videos through your server
   - Use client-side downloads when possible
   - Implement bandwidth quotas per user

## Monitoring Requirements

Essential metrics to track:
- Active Puppeteer instances
- Memory usage per instance  
- Extraction queue length
- Failed extraction rate
- Average extraction time
- Bandwidth usage
- CPU usage per worker
- Response time percentiles (p50, p95, p99)

### Recommended Monitoring Stack
```bash
# Prometheus + Grafana for metrics
# ELK stack for logs
# Sentry for error tracking
# New Relic or DataDog for APM
```

## Scaling Timeline

### Phase 1: MVP (0-1k users)
- Single server (8 vCPU, 16GB RAM)
- Basic monitoring
- Manual deployment

### Phase 2: Growth (1k-10k users)
- Upgrade to 32GB RAM
- Add Redis for caching
- Implement queue system
- Set up CI/CD pipeline

### Phase 3: Scale (10k-50k users)
- Separate web and worker servers
- Load balancer (Nginx)
- Database replication
- CDN integration

### Phase 4: Enterprise (50k+ users)
- Multiple worker servers
- Auto-scaling groups
- Kubernetes orchestration
- Global CDN distribution

## Performance Benchmarks

With proper optimization:
- Single 32GB server: ~50-100 concurrent extractions
- Response time: <100ms for cached results
- Extraction time: 5-30 seconds average
- Success rate: >95% for supported sites

## Database Considerations

### Current: SQLite
- Good for <10k daily users
- Single file, easy backup
- No connection overhead

### Future: PostgreSQL
- When you need concurrent writes
- Better for multi-server setup
- Connection pooling with PgBouncer

## Security at Scale

1. **Rate Limiting**
   - Per IP: 10 requests/minute
   - Per user: 100 requests/day
   - Implement CAPTCHA for suspicious activity

2. **Resource Protection**
   - Max extraction time: 60 seconds
   - Max file size: 5GB
   - Block abusive user agents

3. **DDoS Protection**
   - Cloudflare or similar CDN
   - Fail2ban for repeat offenders
   - Geographic restrictions if needed

## Deployment Best Practices

### Infrastructure as Code
```yaml
# terraform/docker-compose/kubernetes configs
version: '3.8'
services:
  web:
    image: lyricless:latest
    replicas: 2
    resources:
      limits:
        memory: 4G
        cpus: '2'
  
  worker:
    image: lyricless-worker:latest
    replicas: 5
    resources:
      limits:
        memory: 8G
        cpus: '4'
```

### Zero-Downtime Deployment
1. Blue-green deployment
2. Rolling updates
3. Health checks
4. Automatic rollback

## Cost Optimization Strategies

### By Traffic Level

**<1k users/day**: $80-120/month
- Single VPS
- Shared PostgreSQL
- Cloudflare free tier

**1k-10k users/day**: $300-500/month
- 2-3 servers
- Managed PostgreSQL
- Basic CDN

**10k-100k users/day**: $1,500-3,000/month
- 5-10 servers
- Load balancers
- Premium CDN
- Monitoring suite

**>100k users/day**: $5,000+/month
- Auto-scaling clusters
- Multi-region deployment
- Enterprise CDN
- 24/7 monitoring

## Bottleneck Analysis

### Primary Bottlenecks
1. **Concurrent Chrome instances** (RAM)
2. **Network bandwidth** (video downloads)
3. **CPU** (video processing)
4. **Storage I/O** (temporary files)

### Solutions
1. Browser pooling and reuse
2. Direct client downloads (no proxy)
3. Queue system with worker limits
4. RAM disk for temp files

## Emergency Scaling Playbook

### Traffic Spike Response
1. **Immediate**: Increase rate limits
2. **5 minutes**: Scale up workers
3. **30 minutes**: Add more servers
4. **1 hour**: Enable aggressive caching
5. **2 hours**: Deploy to additional regions

### Performance Degradation Response
1. Check active Puppeteer instances
2. Review queue length
3. Analyze slow queries
4. Check disk space
5. Review error rates

## Conclusion

The biggest bottleneck will be concurrent Puppeteer instances. With proper optimization, a single 32GB server can handle ~50-100 concurrent extractions. Plan for horizontal scaling early, implement proper monitoring, and use caching aggressively to serve thousands of users efficiently.
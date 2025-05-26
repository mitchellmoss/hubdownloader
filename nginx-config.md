# Nginx Configuration for Cloudflare Tunnel Split Architecture

This document explains the Nginx configuration needed for the direct download server that bypasses Cloudflare Tunnel for large file downloads.

## Overview

The split architecture uses two domains:
- `app.lyricless.com` - Main application (protected by Cloudflare Tunnel)
- `dl.lyricless.app` - Direct downloads (bypasses Cloudflare for performance)

This configuration assumes:
- Next.js app is running on a separate server at `192.168.86.133:3000`
- Nginx server handles direct downloads and proxies presigned URL validation to Next.js

## Full Nginx Configuration

Create this configuration at `/etc/nginx/sites-available/dl.lyricless.app`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=presigned_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=download_limit:10m rate=100r/m;

# Upstream for Next.js application (running on separate server)
upstream nextjs_app {
    server 192.168.86.133:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name dl.lyricless.app;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dl.lyricless.app;
    
    # SSL Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/dl.lyricless.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dl.lyricless.app/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/dl.lyricless.app.access.log;
    error_log /var/log/nginx/dl.lyricless.app.error.log;
    
    # Client body size limit (for large file uploads if needed)
    client_max_body_size 5G;
    
    # Timeouts for large file downloads
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;
    
    # Legacy download endpoint (for backwards compatibility)
    location /download {
        # Same configuration as /api/download/presigned
        limit_req zone=presigned_limit burst=10 nodelay;
        limit_req_status 429;
        
        add_header X-RateLimit-Limit "30" always;
        add_header X-RateLimit-Remaining $limit_req_remaining always;
        add_header X-RateLimit-Reset $limit_req_reset always;
        
        # Proxy to Next.js presigned endpoint
        proxy_pass http://nextjs_app/api/download/presigned$is_args$args;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_buffering off;
        proxy_request_buffering off;
        
        add_header Accept-Ranges bytes always;
        add_header Cache-Control "public, max-age=3600" always;
    }
    
    # Main download endpoint for presigned URLs
    location /api/download/presigned {
        # Rate limiting
        limit_req zone=presigned_limit burst=10 nodelay;
        limit_req_status 429;
        
        # Add rate limit headers
        add_header X-RateLimit-Limit "30" always;
        add_header X-RateLimit-Remaining $limit_req_remaining always;
        add_header X-RateLimit-Reset $limit_req_reset always;
        
        # Proxy to Next.js for validation and file serving
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Disable buffering for streaming
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Headers for video streaming
        add_header Accept-Ranges bytes always;
        add_header Cache-Control "public, max-age=3600" always;
    }
    
    # Direct file serving for converted MP4s (if stored locally)
    location /files/ {
        # Rate limiting for direct downloads
        limit_req zone=download_limit burst=20 nodelay;
        
        # Internal location (can only be accessed via X-Accel-Redirect)
        internal;
        
        # Serve files from local storage
        alias /var/www/lyricless/converted/;
        
        # Enable sendfile for efficient file serving
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        
        # Headers for video streaming
        add_header Accept-Ranges bytes;
        add_header Cache-Control "public, max-age=3600";
        add_header Content-Disposition 'attachment; filename="$arg_filename"';
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
        add_header Access-Control-Allow-Headers "Range";
        
        # Handle range requests for video seeking
        if ($request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
            add_header Access-Control-Allow-Headers "Range";
            add_header Access-Control-Max-Age 3600;
            add_header Content-Length 0;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
    
    # Block access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

## Configuration Explained

### 1. Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=presigned_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=download_limit:10m rate=100r/m;
```
- Creates two rate limit zones:
  - `presigned_limit`: 30 requests/minute for presigned URL validation
  - `download_limit`: 100 requests/minute for actual file downloads
- Uses binary IP address for efficient memory usage

### 2. SSL Configuration
```nginx
ssl_certificate /etc/letsencrypt/live/dl.lyricless.app/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/dl.lyricless.app/privkey.pem;
```
- Uses Let's Encrypt certificates
- Includes modern SSL security settings
- HTTP/2 enabled for better performance

### 3. Presigned URL Endpoint
```nginx
location /api/download/presigned {
    proxy_pass http://nextjs_app;
    proxy_buffering off;
}
```
- Proxies to Next.js application (at 192.168.86.133:3000) for URL validation
- Disables buffering for real-time streaming
- Adds rate limiting with burst protection

### 4. Direct File Serving
```nginx
location /files/ {
    internal;
    alias /var/www/lyricless/converted/;
    sendfile on;
}
```
- Internal location (only accessible via X-Accel-Redirect)
- Uses sendfile for efficient large file transfers
- Adds proper headers for video streaming

### 5. Video Streaming Headers
```nginx
add_header Accept-Ranges bytes;
add_header Cache-Control "public, max-age=3600";
```
- Enables byte-range requests for video seeking
- Sets appropriate caching for video files
- Supports partial content requests

## Installation Steps

1. **Ensure network connectivity:**
```bash
# Test connectivity to Next.js server
curl http://192.168.86.133:3000/health
```

2. **Create the configuration file:**
```bash
sudo nano /etc/nginx/sites-available/dl.lyricless.app
# Paste the configuration above
```

3. **Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/dl.lyricless.app /etc/nginx/sites-enabled/
```

4. **Test the configuration:**
```bash
sudo nginx -t
```

5. **Create directories for file storage:**
```bash
sudo mkdir -p /var/www/lyricless/converted
sudo chown -R www-data:www-data /var/www/lyricless
```

6. **Reload Nginx:**
```bash
sudo systemctl reload nginx
```

7. **Set up SSL with Certbot:**
```bash
sudo certbot --nginx -d dl.lyricless.app
```

8. **Configure firewall (if applicable):**
```bash
# Allow Nginx to connect to Next.js server
sudo ufw allow from any to 192.168.86.133 port 3000
```

## Integration with Next.js

The Next.js application should handle presigned URL validation and respond with either:

1. **For remote files:** Proxy the content with appropriate headers
2. **For local files:** Use X-Accel-Redirect header to serve via Nginx

Example Next.js response for local files:
```typescript
// For local converted files
return new NextResponse(null, {
  status: 200,
  headers: {
    'X-Accel-Redirect': `/files/${filename}?filename=${encodeURIComponent(filename)}`,
    'Content-Type': 'video/mp4',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
});
```

## Security Considerations

1. **Presigned URL Validation**: All requests must be validated by the Next.js app
2. **Rate Limiting**: Prevents abuse and DDoS attacks
3. **Internal Locations**: Direct file access is blocked; files only served after validation
4. **CORS Headers**: Added only where necessary for video playback
5. **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.

## Monitoring

Monitor these log files:
- Access logs: `/var/log/nginx/dl.lyricless.app.access.log`
- Error logs: `/var/log/nginx/dl.lyricless.app.error.log`

Use tools like GoAccess for real-time log analysis:
```bash
sudo apt-get install goaccess
goaccess /var/log/nginx/dl.lyricless.app.access.log -o /var/www/html/report.html --real-time-html
```

## Performance Tuning

For high-traffic scenarios, consider these optimizations:

1. **Increase worker connections:**
```nginx
events {
    worker_connections 2048;
}
```

2. **Enable caching for static content:**
```nginx
location ~* \.(mp4|webm|m4v)$ {
    expires 1d;
    add_header Cache-Control "public, immutable";
}
```

3. **Use CDN for global distribution:**
   - Configure dl.lyricless.app as origin
   - Set up geographic CDN endpoints
   - Maintain presigned URL validation

This configuration provides a secure, performant solution for serving large video files while maintaining the benefits of Cloudflare Tunnel protection for the main application.

## Network Architecture Summary

```
Internet -> Cloudflare Tunnel -> app.lyricless.com -> Next.js (192.168.86.133:3000)
Internet -> dl.lyricless.app -> Nginx -> Next.js (192.168.86.133:3000) for validation
                                      -> Local files (X-Accel-Redirect)
                                      -> Remote proxy for validated downloads
```

The Next.js application at 192.168.86.133:3000 handles all business logic, while the Nginx server on dl.lyricless.app handles efficient file delivery for large downloads.
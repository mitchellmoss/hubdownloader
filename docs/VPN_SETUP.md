# VPN Setup Guide for HubDownloader

## Overview
This guide explains how to run HubDownloader through ExpressVPN using Docker, which will hide your server's real IP address from target websites.

## Prerequisites

1. **Docker & Docker Compose installed**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **ExpressVPN Account**
   - Sign up at: https://www.expressvpn.com
   - Get your activation code from: https://www.expressvpn.com/setup

## Quick Start

1. **Copy and configure environment file**
   ```bash
   cp .env.vpn.example .env.vpn
   nano .env.vpn
   ```
   
   Add your ExpressVPN activation code:
   ```env
   EXPRESSVPN_USERNAME=your_activation_code_here
   EXPRESSVPN_PASSWORD=your_activation_code_here
   ```

2. **Run the setup script**
   ```bash
   ./scripts/setup-vpn.sh
   ```

3. **Or manually start services**
   ```bash
   docker-compose -f docker-compose.vpn.yml up -d
   ```

## Configuration Options

### Server Selection

Choose specific countries or cities in `.env.vpn`:

```env
# By country
EXPRESSVPN_COUNTRY=Netherlands

# By city
EXPRESSVPN_COUNTRY=USA
EXPRESSVPN_CITY=New York

# Multiple countries (random selection)
EXPRESSVPN_COUNTRY=USA,UK,Netherlands,Switzerland
```

### Available Countries
- USA, UK, Canada, Australia
- Netherlands, Switzerland, Singapore
- Japan, Hong Kong, Germany
- [Full list](https://www.expressvpn.com/vpn-server)

## Architecture

```
Internet ← ExpressVPN Server ← Your Server (Hidden IP)
    ↓                              ↓
Target Sites                  HubDownloader
    ↓                              ↓
Video URLs ← ← ← ← ← ← ← ← ← Extracted Videos
```

## Monitoring

### Check Current IP
```bash
# Your server's real IP
curl -s https://api.ipify.org

# IP through VPN
docker-compose -f docker-compose.vpn.yml exec vpn curl -s https://api.ipify.org
```

### View Logs
```bash
# All logs
docker-compose -f docker-compose.vpn.yml logs -f

# VPN logs only
docker-compose -f docker-compose.vpn.yml logs -f vpn

# App logs only
docker-compose -f docker-compose.vpn.yml logs -f hubdownloader
```

### Check Health
```bash
docker-compose -f docker-compose.vpn.yml ps
```

## Troubleshooting

### VPN Won't Connect
1. Check credentials in `.env.vpn`
2. Try different server:
   ```env
   EXPRESSVPN_COUNTRY=Switzerland
   ```
3. Check Docker logs:
   ```bash
   docker-compose -f docker-compose.vpn.yml logs vpn
   ```

### Slow Performance
1. Choose closer server location
2. Use WireGuard instead of OpenVPN (if available)
3. Increase Docker resources:
   ```yaml
   services:
     hubdownloader:
       deploy:
         resources:
           limits:
             cpus: '4'
             memory: 8G
   ```

### IP Leaks
1. Verify network_mode is set correctly:
   ```yaml
   network_mode: "service:vpn"
   ```
2. Check for DNS leaks:
   ```bash
   docker-compose -f docker-compose.vpn.yml exec hubdownloader curl https ::dnsleaktest.com/
   ```

## Security Best Practices

1. **Rotate VPN Servers**
   ```bash
   # Add to crontab for daily rotation
   0 0 * * * docker-compose -f docker-compose.vpn.yml restart vpn
   ```

2. **Monitor IP Changes**
   ```bash
   # Add IP monitoring script
   */30 * * * * /path/to/check-vpn-ip.sh
   ```

3. **Kill Switch**
   The Gluetun container includes a built-in kill switch that blocks all traffic if VPN disconnects.

4. **Firewall Rules**
   ```bash
   # Only allow traffic through VPN
   sudo ufw default deny outgoing
   sudo ufw allow out on tun0
   ```

## Performance Optimization

### 1. Use Multiple VPN Endpoints
```yaml
# docker-compose.vpn.yml
services:
  vpn1:
    # ... config for region 1
  vpn2:
    # ... config for region 2
```

### 2. Load Balance Requests
```javascript
// lib/vpn-rotator.ts
const VPN_ENDPOINTS = [
  'http://vpn1:3000',
  'http://vpn2:3000',
]

export function getRandomEndpoint() {
  return VPN_ENDPOINTS[Math.floor(Math.random() * VPN_ENDPOINTS.length)]
}
```

### 3. Cache VPN Connections
Keep VPN tunnels alive to avoid reconnection overhead.

## Costs

- ExpressVPN: ~$12.95/month (or $6.67/month if paid annually)
- Additional server resources: ~10-20% CPU overhead
- Bandwidth: Same as without VPN

## Alternative VPN Providers

If you prefer other providers, modify `docker-compose.vpn.yml`:

```yaml
environment:
  - VPN_SERVICE_PROVIDER=nordvpn  # or surfshark, cyberghost, etc.
  - OPENVPN_USER=${NORDVPN_USERNAME}
  - OPENVPN_PASSWORD=${NORDVPN_PASSWORD}
```

Supported providers:
- NordVPN
- Surfshark
- CyberGhost
- Private Internet Access
- Mullvad
- [Full list](https://github.com/qdm12/gluetun#vpn-service-providers)

## Production Deployment

For production with Cloudflare:
1. Keep VPN for outbound extraction requests
2. Use Cloudflare Tunnel for inbound user traffic
3. This gives you the best of both worlds:
   - Hidden origin IP from target sites
   - DDoS protection for your users

```bash
# Run both
docker-compose -f docker-compose.vpn.yml up -d
cloudflared tunnel run hubdownloader
```
# Proxmox LXC Troubleshooting Guide

## Common Issues and Solutions

### 1. Docker Won't Start in LXC Container

**Error**: `Cannot connect to the Docker daemon`

**Solution**:
```bash
# On Proxmox host, edit container config
nano /etc/pve/lxc/100.conf

# Add these lines:
features: keyctl=1,nesting=1
lxc.apparmor.profile: unconfined
```

Restart container:
```bash
pct stop 100
pct start 100
```

### 2. VPN TUN Device Not Found

**Error**: `Cannot open TUN/TAP dev /dev/net/tun: No such file or directory`

**Solution**:
```bash
# On Proxmox host, add to container config:
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net dev/net none bind,create=dir

# Inside container:
mkdir -p /dev/net
mknod /dev/net/tun c 10 200
chmod 666 /dev/net/tun
```

### 3. Permission Denied Errors

**Error**: Various permission denied errors

**Solution**:
```bash
# Run container in privileged mode (less secure but simpler)
# On Proxmox host:
pct set 100 --unprivileged 0

# Or add specific capabilities:
lxc.cap.drop:
```

### 4. High Memory Usage

**Symptom**: Container using excessive memory

**Solution**:
```bash
# Limit Chrome instances in docker-compose.vpn.yml:
environment:
  - MAX_CONCURRENT_EXTRACTIONS=5
  
# Add memory limits:
deploy:
  resources:
    limits:
      memory: 4G
```

### 5. Network Performance Issues

**Symptom**: Slow downloads or timeouts

**Solution**:
```bash
# Use host network mode (on Proxmox host):
lxc.net.0.type: none

# Inside container:
# Modify docker-compose.vpn.yml
network_mode: "host"
```

### 6. Container Won't Start After Reboot

**Error**: Container fails to start automatically

**Solution**:
```bash
# On Proxmox host:
pct set 100 -onboot 1

# Inside container:
systemctl enable docker
systemctl enable lyricless
```

### 7. ExpressVPN Connection Failures

**Error**: `VPN connection failed`

**Common Causes**:
1. Invalid activation code
2. Firewall blocking VPN
3. DNS resolution issues

**Solutions**:
```bash
# Check logs:
docker compose -f docker-compose.vpn.yml logs vpn

# Try different server:
# Edit .env.vpn
EXPRESSVPN_COUNTRY=Switzerland

# Use specific DNS:
# In docker-compose.vpn.yml
environment:
  - DNS_SERVERS=1.1.1.1,8.8.8.8
```

### 8. Puppeteer Chrome Crashes

**Error**: `Failed to launch the browser process`

**Solution**:
```bash
# Increase shared memory:
# In docker-compose.vpn.yml
shm_size: '2gb'

# Or mount /dev/shm:
volumes:
  - /dev/shm:/dev/shm
```

### 9. Storage Issues

**Error**: `No space left on device`

**Solution**:
```bash
# Check disk usage:
df -h
docker system df

# Clean up:
docker system prune -a --volumes
rm -rf /tmp/videos/*

# Increase container disk:
# On Proxmox host:
pct resize 100 rootfs +10G
```

### 10. Database Lock Errors

**Error**: `database is locked`

**Solution**:
```bash
# Stop services:
docker compose -f docker-compose.vpn.yml down

# Backup and recreate database:
cp prisma/prod.db prisma/prod.db.backup
rm prisma/prod.db
npx prisma migrate deploy
```

## Performance Optimization

### CPU Optimization
```bash
# Check CPU usage:
htop

# Limit concurrent extractions:
# Edit lib/config.ts
export const MAX_CONCURRENT_EXTRACTIONS = 3
```

### Memory Optimization
```bash
# Monitor memory:
docker stats

# Add swap if needed:
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Network Optimization
```bash
# Test VPN speed:
docker compose -f docker-compose.vpn.yml exec vpn speedtest-cli

# Use closer VPN server:
EXPRESSVPN_COUNTRY=Netherlands  # If in Europe
```

## Debug Commands

### Check Container Configuration
```bash
# On Proxmox host:
pct config 100
lxc-info -n 100
```

### Monitor Resource Usage
```bash
# Real-time monitoring:
ctop  # Install with: apt install ctop
docker stats
htop
```

### Check Logs
```bash
# System logs:
journalctl -xe

# Docker logs:
docker compose -f docker-compose.vpn.yml logs -f

# Application logs:
tail -f logs/*.log
```

### Network Debugging
```bash
# Check IP routing:
ip route
iptables -L -n

# Test connectivity:
docker compose -f docker-compose.vpn.yml exec vpn ping 8.8.8.8
docker compose -f docker-compose.vpn.yml exec vpn nslookup google.com
```

## Recovery Procedures

### Complete Reset
```bash
# Stop everything:
docker compose -f docker-compose.vpn.yml down -v

# Clean Docker:
docker system prune -a --volumes

# Remove app data:
rm -rf prisma/*.db
rm -rf logs/*
rm -rf /tmp/videos/*

# Reinstall:
npm install
npx prisma migrate deploy
docker compose -f docker-compose.vpn.yml build
docker compose -f docker-compose.vpn.yml up -d
```

### Backup Before Major Changes
```bash
# Create snapshot on Proxmox:
# (On Proxmox host)
pct snapshot 100 before-update

# Or backup inside container:
tar -czf ~/lyricless-backup-$(date +%Y%m%d).tar.gz \
  ~/lyricless/.env* \
  ~/lyricless/prisma/*.db
```

## Getting Help

### Collect Debug Information
```bash
# Create debug report:
cat > debug-report.txt << EOF
Container ID: $(hostname)
Date: $(date)
Docker Version: $(docker --version)
Node Version: $(node --version)

--- Container Config ---
$(cat /proc/self/status | grep -E "Cpus_allowed|Mems_allowed")

--- Docker Status ---
$(docker compose -f docker-compose.vpn.yml ps)

--- VPN Status ---
$(docker compose -f docker-compose.vpn.yml exec vpn curl -s https://api.ipify.org)

--- Recent Logs ---
$(docker compose -f docker-compose.vpn.yml logs --tail=50)
EOF
```

### Resources
- Proxmox Forums: https://forum.proxmox.com
- Docker in LXC: https://pve.proxmox.com/wiki/Linux_Container#pct_container_storage
- ExpressVPN Support: https://www.expressvpn.com/support/
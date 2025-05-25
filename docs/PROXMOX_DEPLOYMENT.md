# Deploying Lyricless on Proxmox LXC Container

## Overview
This guide walks through deploying Lyricless with ExpressVPN protection on a Proxmox LXC (Linux Container).

## Prerequisites
- Proxmox VE 7.0+ installed
- ExpressVPN account with activation code
- Basic knowledge of Proxmox UI

## Step 1: Create Proxmox LXC Container

### 1.1 Download Ubuntu/Debian Template
```bash
# SSH into Proxmox host
ssh root@your-proxmox-ip

# Update container templates
pveam update

# Download Ubuntu 22.04 template (recommended)
pveam download local ubuntu-22.04-standard_22.04-1_amd64.tar.zst
```

### 1.2 Create Container via Proxmox UI
1. Click "Create CT" in Proxmox web UI
2. Configure:
   - **General**:
     - Node: Select your node
     - CT ID: (e.g., 100)
     - Hostname: `lyricless`
     - Password: Set a strong password
   - **Template**:
     - Storage: local
     - Template: ubuntu-22.04-standard
   - **Root Disk**:
     - Storage: local-lvm
     - Disk size: 32GB (minimum)
   - **CPU**:
     - Cores: 4 (minimum, 8 recommended)
   - **Memory**:
     - Memory: 8192MB (8GB minimum, 16GB recommended)
     - Swap: 2048MB
   - **Network**:
     - Bridge: vmbr0
     - IPv4: DHCP or Static
     - IPv6: Optional

### 1.3 Enable Required Features
⚠️ **IMPORTANT**: LXC containers need special permissions for Docker and VPN

Edit container config:
```bash
# On Proxmox host
nano /etc/pve/lxc/100.conf  # Replace 100 with your CT ID

# Add these lines at the end:
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: c 10:200 rwm
lxc.mount.entry: /dev/net dev/net none bind,create=dir
lxc.cap.drop:
features: keyctl=1,nesting=1
```

### 1.4 Start Container
```bash
# Start the container
pct start 100

# Enter the container
pct enter 100
```

## Step 2: Initial Container Setup

### 2.1 Update System
```bash
# Inside the container
apt update && apt upgrade -y
apt install -y curl wget git nano sudo
```

### 2.2 Create Non-Root User (Optional but Recommended)
```bash
adduser hubuser
usermod -aG sudo hubuser
su - hubuser
```

## Step 3: Install Docker & Docker Compose

### 3.1 Install Docker
```bash
# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group (if using non-root user)
sudo usermod -aG docker $USER
newgrp docker
```

### 3.2 Verify Docker
```bash
docker --version
docker compose version
```

## Step 4: Install Additional Dependencies

### 4.1 Install Node.js (for local development/testing)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4.2 Install Required Tools
```bash
# Install ffmpeg and other tools
sudo apt install -y ffmpeg python3-pip git build-essential

# Install yt-dlp
sudo pip3 install yt-dlp

# Install PM2 (optional, for non-Docker deployment)
sudo npm install -g pm2
```

## Step 5: Clone and Configure Lyricless

### 5.1 Clone Repository
```bash
cd ~
git clone https://github.com/mitchellmoss/lyricless.git
cd lyricless
```

### 5.2 Configure ExpressVPN
```bash
# Copy environment template
cp .env.vpn.example .env.vpn

# Edit with your ExpressVPN credentials
nano .env.vpn
```

Add your activation code:
```env
EXPRESSVPN_USERNAME=your_activation_code_here
EXPRESSVPN_PASSWORD=your_activation_code_here
EXPRESSVPN_COUNTRY=USA
```

### 5.3 Configure Application
```bash
# Copy main environment file
cp .env.example .env

# Edit if needed
nano .env
```

## Step 6: Build and Run with Docker

### 6.1 Build the Application
```bash
# Build Docker images
docker compose -f docker-compose.vpn.yml build
```

### 6.2 Start Services
```bash
# Start in detached mode
docker compose -f docker-compose.vpn.yml up -d

# Check status
docker compose -f docker-compose.vpn.yml ps
```

### 6.3 Verify VPN Connection
```bash
# Check your real IP
curl -s https://api.ipify.org
echo ""

# Check VPN IP
docker compose -f docker-compose.vpn.yml exec vpn curl -s https://api.ipify.org
echo ""

# Run full status check
./scripts/check-vpn-status.sh
```

## Step 7: Configure Container Networking

### 7.1 Port Forwarding (if using NAT)
In Proxmox, if your container uses NAT:
```bash
# On Proxmox host
iptables -t nat -A PREROUTING -p tcp -d YOUR_PUBLIC_IP --dport 80 -j DNAT --to-destination CONTAINER_IP:3000
iptables -t nat -A PREROUTING -p tcp -d YOUR_PUBLIC_IP --dport 443 -j DNAT --to-destination CONTAINER_IP:3000
```

### 7.2 Firewall Rules
```bash
# Inside container
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## Step 8: Setup Reverse Proxy (Production)

### 8.1 Install Nginx
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 8.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/lyricless
```

Add:
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 8.3 Enable Site and SSL
```bash
sudo ln -s /etc/nginx/sites-available/lyricless /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## Step 9: Monitoring and Maintenance

### 9.1 Setup Container Auto-Start
```bash
# Create systemd service
sudo nano /etc/systemd/system/lyricless.service
```

Add:
```ini
[Unit]
Description=Lyricless with VPN
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/hubuser/lyricless
ExecStart=/usr/bin/docker compose -f docker-compose.vpn.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.vpn.yml down
User=hubuser

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl enable lyricless.service
sudo systemctl start lyricless.service
```

### 9.2 Setup Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup log rotation
sudo nano /etc/logrotate.d/lyricless
```

Add:
```
/home/hubuser/lyricless/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

### 9.3 Setup Backups
```bash
# Create backup script
nano ~/backup-lyricless.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/backup/lyricless"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose -f docker-compose.vpn.yml exec -T lyricless \
  sqlite3 /app/prisma/prod.db ".backup '/tmp/backup.db'"
docker compose -f docker-compose.vpn.yml cp lyricless:/tmp/backup.db \
  $BACKUP_DIR/database_$DATE.db

# Backup environment files
cp .env $BACKUP_DIR/env_$DATE
cp .env.vpn $BACKUP_DIR/env.vpn_$DATE

echo "Backup completed: $BACKUP_DIR"
```

Make executable:
```bash
chmod +x ~/backup-lyricless.sh
```

## Step 10: Performance Optimization

### 10.1 Container Resources
On Proxmox host, adjust resources:
```bash
# Increase CPU cores if needed
pct set 100 -cores 8

# Increase memory
pct set 100 -memory 16384
```

### 10.2 Docker Optimization
```bash
# Prune unused Docker resources
docker system prune -a --volumes

# Set resource limits in docker-compose.vpn.yml
```

## Troubleshooting

### Container Won't Start
```bash
# Check LXC logs
lxc-info -n 100
journalctl -xe
```

### Docker Issues in LXC
```bash
# Verify container features
grep -E "features|lxc" /etc/pve/lxc/100.conf

# Check Docker daemon
sudo systemctl status docker
sudo journalctl -u docker
```

### VPN Connection Issues
```bash
# Check VPN logs
docker compose -f docker-compose.vpn.yml logs vpn

# Restart VPN container
docker compose -f docker-compose.vpn.yml restart vpn
```

### Permission Issues
```bash
# Fix Docker permissions
sudo chmod 666 /var/run/docker.sock

# Fix TUN device
sudo mknod /dev/net/tun c 10 200
sudo chmod 666 /dev/net/tun
```

## Security Hardening

### 1. Limit Container Capabilities
```bash
# Edit /etc/pve/lxc/100.conf on Proxmox host
lxc.cap.drop: sys_admin
lxc.cap.keep: net_admin
```

### 2. Network Isolation
```bash
# Create dedicated bridge for containers
# On Proxmox host
nano /etc/network/interfaces
# Add vmbr1 for internal network
```

### 3. Regular Updates
```bash
# Create update script
nano ~/update-system.sh
```

Add:
```bash
#!/bin/bash
sudo apt update && sudo apt upgrade -y
docker compose -f docker-compose.vpn.yml pull
pip3 install --upgrade yt-dlp
```

## Monitoring Commands

```bash
# Check container resource usage
docker stats

# Monitor network traffic
sudo nethogs

# Check VPN status
./scripts/check-vpn-status.sh

# View logs
docker compose -f docker-compose.vpn.yml logs -f

# Check extraction history
docker compose -f docker-compose.vpn.yml exec lyricless \
  sqlite3 /app/prisma/prod.db "SELECT * FROM extractions ORDER BY createdAt DESC LIMIT 10;"
```

## Production Checklist

- [ ] Container has sufficient resources (8+ cores, 16GB+ RAM)
- [ ] VPN is connected and verified
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Automatic backups scheduled
- [ ] Monitoring alerts setup
- [ ] Log rotation configured
- [ ] Auto-start on boot enabled
- [ ] Security hardening applied

## Next Steps

1. **Setup Cloudflare** (optional):
   - Add domain to Cloudflare
   - Enable proxy for DDoS protection
   - Configure page rules

2. **Setup Monitoring**:
   - Install Prometheus + Grafana
   - Configure alerts

3. **Scale Horizontally**:
   - Create multiple containers
   - Setup load balancer

## Support

For issues specific to:
- **Proxmox**: Check Proxmox forums
- **Docker in LXC**: Ensure features are enabled
- **VPN**: Check ExpressVPN status
- **Application**: Check logs and GitHub issues
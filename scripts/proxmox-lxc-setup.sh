#!/bin/bash

# Lyricless Video Downloader - Proxmox LXC Container Setup Script
# This script creates and configures an optimized LXC container for the video downloader
# Run this on your Proxmox host, not inside a container

set -e

# Configuration Variables
CONTAINER_ID=${CONTAINER_ID:-"101"}
CONTAINER_NAME=${CONTAINER_NAME:-"lyricless"}
CONTAINER_RAM=${CONTAINER_RAM:-"4096"}  # 4GB RAM minimum for Puppeteer
CONTAINER_SWAP=${CONTAINER_SWAP:-"2048"} # 2GB swap
CONTAINER_CORES=${CONTAINER_CORES:-"2"}
CONTAINER_DISK=${CONTAINER_DISK:-"20"}  # 20GB disk
CONTAINER_BRIDGE=${CONTAINER_BRIDGE:-"vmbr0"}
CONTAINER_IP=${CONTAINER_IP:-"dhcp"}  # Use 'dhcp' or specify IP like '192.168.1.100/24'
CONTAINER_GW=${CONTAINER_GW:-""}      # Gateway if using static IP
STORAGE_POOL=${STORAGE_POOL:-"local-lvm"}
TEMPLATE_STORAGE=${TEMPLATE_STORAGE:-"local"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Lyricless Video Downloader Proxmox LXC Setup ===${NC}"
echo ""

# Check if running on Proxmox
if [ ! -d /etc/pve ] && ! command -v pvesh &> /dev/null && ! command -v pct &> /dev/null; then
    echo -e "${RED}Error: This script must be run on a Proxmox host${NC}"
    echo -e "${YELLOW}Debug info:${NC}"
    echo "  /etc/pve exists: $([ -d /etc/pve ] && echo 'yes' || echo 'no')"
    echo "  pvesh command: $(command -v pvesh || echo 'not found')"
    echo "  pct command: $(command -v pct || echo 'not found')"
    echo ""
    echo -e "${YELLOW}If you are on a Proxmox host, you can bypass this check with:${NC}"
    echo "  SKIP_PROXMOX_CHECK=1 $0"
    
    if [ "$SKIP_PROXMOX_CHECK" != "1" ]; then
        exit 1
    else
        echo -e "${YELLOW}⚠️  Skipping Proxmox check - proceeding at your own risk${NC}"
    fi
fi

# Download Ubuntu 22.04 template if not exists
echo -e "${YELLOW}Checking for Ubuntu 22.04 template...${NC}"
TEMPLATE_EXISTS=$(pveam list $TEMPLATE_STORAGE | grep -c "ubuntu-22.04-standard" || true)

if [ "$TEMPLATE_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}Downloading Ubuntu 22.04 template...${NC}"
    pveam update
    pveam download $TEMPLATE_STORAGE ubuntu-22.04-standard_22.04-1_amd64.tar.zst
else
    echo -e "${GREEN}Ubuntu 22.04 template already exists${NC}"
fi

# Get template filename only (without the storage prefix)
# pveam list output format: STORAGE:vztmpl/TEMPLATE_NAME
TEMPLATE_FULL=$(pveam list $TEMPLATE_STORAGE | grep "ubuntu-22.04-standard" | awk '{print $1}')
# Extract just the filename part after the last /
TEMPLATE=$(echo $TEMPLATE_FULL | sed 's/.*\///')

# Check if container already exists
if pct status $CONTAINER_ID &>/dev/null; then
    echo -e "${RED}Container $CONTAINER_ID already exists!${NC}"
    read -p "Do you want to destroy and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Stopping and destroying container $CONTAINER_ID...${NC}"
        pct stop $CONTAINER_ID || true
        pct destroy $CONTAINER_ID
    else
        exit 1
    fi
fi

# Create container
echo -e "${YELLOW}Creating LXC container...${NC}"

# Build network configuration
NETWORK_CONFIG="name=eth0,bridge=$CONTAINER_BRIDGE"
if [ "$CONTAINER_IP" != "dhcp" ]; then
    NETWORK_CONFIG="$NETWORK_CONFIG,ip=$CONTAINER_IP"
    if [ -n "$CONTAINER_GW" ]; then
        NETWORK_CONFIG="$NETWORK_CONFIG,gw=$CONTAINER_GW"
    fi
else
    NETWORK_CONFIG="$NETWORK_CONFIG,ip=dhcp"
fi

# Create the container
pct create $CONTAINER_ID $TEMPLATE_STORAGE:vztmpl/$TEMPLATE \
    --hostname $CONTAINER_NAME \
    --memory $CONTAINER_RAM \
    --swap $CONTAINER_SWAP \
    --cores $CONTAINER_CORES \
    --rootfs $STORAGE_POOL:$CONTAINER_DISK \
    --net0 "$NETWORK_CONFIG" \
    --features nesting=1,keyctl=1 \
    --unprivileged 1 \
    --onboot 1 \
    --start 1

# Wait for container to start
echo -e "${YELLOW}Waiting for container to start...${NC}"
sleep 5

# Update container configuration for Puppeteer/Chrome
echo -e "${YELLOW}Optimizing container configuration for Puppeteer...${NC}"

# Add required configurations
cat >> /etc/pve/lxc/$CONTAINER_ID.conf <<EOF

# Puppeteer/Chrome requirements
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: c 226:* rwm
lxc.mount.entry: /dev/dri dev/dri none bind,optional,create=dir
lxc.mount.entry: /dev/shm dev/shm none bind,create=dir 0 0

# Performance optimizations
lxc.cgroup2.memory.high: ${CONTAINER_RAM}M
lxc.cgroup2.memory.max: $((CONTAINER_RAM + 512))M
EOF

# Restart container to apply changes
echo -e "${YELLOW}Restarting container to apply configuration...${NC}"
pct reboot $CONTAINER_ID
sleep 10

# Install dependencies inside container
echo -e "${YELLOW}Installing dependencies in container...${NC}"

pct exec $CONTAINER_ID -- bash -c "
set -e

# Update system
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install required packages
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip \
    nginx \
    certbot \
    python3-certbot-nginx \
    gnupg \
    ca-certificates \
    lsb-release \
    software-properties-common \
    ffmpeg \
    chromium-browser \
    chromium-chromedriver \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install yt-dlp
pip3 install --upgrade yt-dlp

# Create app user
useradd -m -s /bin/bash appuser || true

# Create app directory
mkdir -p /home/appuser/app
chown -R appuser:appuser /home/appuser

# Set up Chrome sandbox permissions
mkdir -p /home/appuser/.cache/puppeteer
chown -R appuser:appuser /home/appuser/.cache

# Configure shared memory for Chrome
echo 'tmpfs /dev/shm tmpfs defaults,nosuid,nodev,noexec,size=2G 0 0' >> /etc/fstab
mount -a || true

# Set up PM2 to run on startup
su - appuser -c 'pm2 startup systemd -u appuser --hp /home/appuser' || true
systemctl enable pm2-appuser || true

echo 'Container setup complete!'
"

# Create deployment script
echo -e "${YELLOW}Creating deployment helper script...${NC}"

pct exec $CONTAINER_ID -- bash -c "
cat > /home/appuser/deploy.sh <<'DEPLOY_SCRIPT'
#!/bin/bash

# Deployment script for Lyricless

set -e

echo 'Starting deployment...'

# Clone or update repository
if [ -d /home/appuser/app/.git ]; then
    cd /home/appuser/app
    git pull origin master
else
    cd /home/appuser
    rm -rf app
    git clone https://github.com/mitchellmoss/hubdownloader.git app
    cd app
fi

# Install dependencies
npm ci --production=false

# Set up environment
if [ ! -f .env ]; then
    cp .env.example .env
    echo 'Please edit .env file with your configuration'
fi

# Build application
npm run build

# Run database migrations
npx prisma migrate deploy

# Restart application with PM2
pm2 stop lyricless || true
pm2 delete lyricless || true
pm2 start npm --name lyricless -- start
pm2 save

echo 'Deployment complete!'
echo 'Application running on port 3000'
echo 'Configure Nginx reverse proxy to expose the application'
DEPLOY_SCRIPT

chmod +x /home/appuser/deploy.sh
chown appuser:appuser /home/appuser/deploy.sh
"

# Create Nginx configuration
echo -e "${YELLOW}Creating Nginx configuration template...${NC}"

pct exec $CONTAINER_ID -- bash -c "
cat > /etc/nginx/sites-available/lyricless <<'NGINX_CONFIG'
server {
    listen 80;
    server_name lyricless.com www.lyricless.com;

    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lyricless.com www.lyricless.com;

    # SSL configuration (managed by Certbot)
    # ssl_certificate /etc/letsencrypt/live/lyricless.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/lyricless.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts for video processing
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Video proxy endpoint with longer timeouts
    location /api/proxy/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Extended timeouts for video streaming
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
        
        # Large buffer sizes for video
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Static file caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        proxy_cache_key \$host\$uri\$is_args\$args;
        add_header Cache-Control \"public, immutable\";
    }

    # File size limits for video downloads
    client_max_body_size 5G;
    client_body_buffer_size 512k;
}
NGINX_CONFIG
"

# Create monitoring script
echo -e "${YELLOW}Creating monitoring script...${NC}"

pct exec $CONTAINER_ID -- bash -c "
cat > /home/appuser/monitor.sh <<'MONITOR_SCRIPT'
#!/bin/bash

# Simple monitoring script

echo '=== System Resources ==='
echo 'Memory Usage:'
free -h
echo ''
echo 'Disk Usage:'
df -h /
echo ''
echo 'CPU Load:'
uptime
echo ''
echo '=== Application Status ==='
su - appuser -c 'pm2 list'
echo ''
echo '=== Recent Logs ==='
su - appuser -c 'pm2 logs --lines 20 --nostream'
MONITOR_SCRIPT

chmod +x /home/appuser/monitor.sh
"

# Create PM2 ecosystem file
echo -e "${YELLOW}Creating PM2 ecosystem file...${NC}"

pct exec $CONTAINER_ID -- bash -c "
cat > /home/appuser/ecosystem.config.js <<'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'lyricless',
    script: 'npm',
    args: 'start',
    cwd: '/home/appuser/app',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/appuser/logs/error.log',
    out_file: '/home/appuser/logs/out.log',
    log_file: '/home/appuser/logs/combined.log',
    time: true
  }]
};
PM2_CONFIG

mkdir -p /home/appuser/logs
chown -R appuser:appuser /home/appuser/ecosystem.config.js /home/appuser/logs
"

# Create backup script
echo -e "${YELLOW}Creating backup script...${NC}"

pct exec $CONTAINER_ID -- bash -c "
cat > /home/appuser/backup.sh <<'BACKUP_SCRIPT'
#!/bin/bash

# Backup script for Lyricless

BACKUP_DIR=\"/home/appuser/backups\"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_NAME=\"lyricless_backup_\$DATE\"

mkdir -p \$BACKUP_DIR

echo \"Starting backup...\"

# Backup database
cd /home/appuser/app
cp prisma/dev.db \$BACKUP_DIR/\$BACKUP_NAME.db

# Backup environment files
cp .env \$BACKUP_DIR/\$BACKUP_NAME.env 2>/dev/null || true

# Create tarball
cd \$BACKUP_DIR
tar -czf \$BACKUP_NAME.tar.gz \$BACKUP_NAME.*
rm \$BACKUP_NAME.db \$BACKUP_NAME.env

# Keep only last 7 backups
ls -t *.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

echo \"Backup completed: \$BACKUP_DIR/\$BACKUP_NAME.tar.gz\"
BACKUP_SCRIPT

chmod +x /home/appuser/backup.sh
chown appuser:appuser /home/appuser/backup.sh
"

# Final instructions
echo -e "${GREEN}=== Container Setup Complete! ===${NC}"
echo ""
echo -e "${YELLOW}Container Information:${NC}"
echo "  ID: $CONTAINER_ID"
echo "  Name: $CONTAINER_NAME"
echo "  RAM: ${CONTAINER_RAM}MB"
echo "  Cores: $CONTAINER_CORES"
echo "  Disk: ${CONTAINER_DISK}GB"

# Get container IP
CONTAINER_ACTUAL_IP=$(pct exec $CONTAINER_ID -- ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
echo "  IP Address: $CONTAINER_ACTUAL_IP"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Enter container: ${GREEN}pct enter $CONTAINER_ID${NC}"
echo "2. Switch to app user: ${GREEN}su - appuser${NC}"
echo "3. Deploy application: ${GREEN}./deploy.sh${NC}"
echo "4. Configure .env file: ${GREEN}nano /home/appuser/app/.env${NC}"
echo "5. Set up domain and SSL:"
echo "   - Point your domain to server IP"
echo "   - Enable Nginx: ${GREEN}ln -s /etc/nginx/sites-available/lyricless /etc/nginx/sites-enabled/${NC}"
echo "   - Remove default: ${GREEN}rm /etc/nginx/sites-enabled/default${NC}"
echo "   - Test config: ${GREEN}nginx -t${NC}"
echo "   - Reload Nginx: ${GREEN}systemctl reload nginx${NC}"
echo "   - Get SSL cert: ${GREEN}certbot --nginx -d lyricless.com -d www.lyricless.com${NC}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  Monitor app: ${GREEN}/home/appuser/monitor.sh${NC}"
echo "  View logs: ${GREEN}su - appuser -c 'pm2 logs'${NC}"
echo "  Restart app: ${GREEN}su - appuser -c 'pm2 restart lyricless'${NC}"
echo "  Backup data: ${GREEN}su - appuser -c '/home/appuser/backup.sh'${NC}"
echo ""
echo -e "${YELLOW}Access your app at:${NC}"
echo "  ${GREEN}http://$CONTAINER_ACTUAL_IP:3000${NC}"
echo ""
echo -e "${GREEN}Container is ready for deployment!${NC}"
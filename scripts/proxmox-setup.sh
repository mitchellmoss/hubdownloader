#!/bin/bash

# Lyricless Proxmox LXC Setup Script
# Run this inside your Proxmox container after initial setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Lyricless Proxmox Setup${NC}"
echo "=================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}⚠️  Running as root. Consider creating a non-root user.${NC}"
fi

# Step 1: Update System
echo -e "\n${BLUE}1. Updating system packages...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git nano sudo htop iotop nethogs

# Step 2: Install Docker
echo -e "\n${BLUE}2. Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Add current user to docker group
    if [ "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
    fi
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "\n${BLUE}3. Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt install -y docker-compose-plugin
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Step 4: Install Node.js
echo -e "\n${BLUE}4. Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
else
    echo -e "${GREEN}✓ Node.js already installed${NC}"
fi

# Step 5: Install ffmpeg and yt-dlp
echo -e "\n${BLUE}5. Installing media tools...${NC}"
apt install -y ffmpeg python3-pip
pip3 install --upgrade yt-dlp

# Step 6: Check TUN device (required for VPN)
echo -e "\n${BLUE}6. Checking TUN device...${NC}"
if [ ! -c /dev/net/tun ]; then
    echo -e "${YELLOW}Creating TUN device...${NC}"
    mkdir -p /dev/net
    mknod /dev/net/tun c 10 200
    chmod 666 /dev/net/tun
fi
echo -e "${GREEN}✓ TUN device available${NC}"

# Step 7: Clone repository
echo -e "\n${BLUE}7. Setting up Lyricless...${NC}"
if [ ! -d "$HOME/lyricless" ]; then
    cd $HOME
    git clone https://github.com/mitchellmoss/lyricless.git
    cd lyricless
else
    echo -e "${GREEN}✓ Repository already cloned${NC}"
    cd $HOME/lyricless
    git pull
fi

# Step 8: Setup environment files
echo -e "\n${BLUE}8. Setting up configuration...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 Created .env file${NC}"
fi

if [ ! -f ".env.vpn" ]; then
    cp .env.vpn.example .env.vpn
    echo -e "${YELLOW}📝 Created .env.vpn file${NC}"
    echo -e "${RED}⚠️  IMPORTANT: Edit .env.vpn and add your ExpressVPN credentials!${NC}"
fi

# Step 9: Create directories
echo -e "\n${BLUE}9. Creating directories...${NC}"
mkdir -p logs
mkdir -p /tmp/videos
chmod 777 /tmp/videos

# Step 10: Setup firewall
echo -e "\n${BLUE}10. Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 3000/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "y" | ufw enable
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠️  UFW not installed, skipping firewall setup${NC}"
fi

# Step 11: Create systemd service
echo -e "\n${BLUE}11. Creating systemd service...${NC}"
cat > /tmp/lyricless.service << EOF
[Unit]
Description=Lyricless with VPN
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$HOME/lyricless
ExecStart=/usr/bin/docker compose -f docker-compose.vpn.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.vpn.yml down
ExecReload=/usr/bin/docker compose -f docker-compose.vpn.yml restart
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/lyricless.log
StandardError=append:/var/log/lyricless.error.log

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/lyricless.service /etc/systemd/system/
sudo systemctl daemon-reload
echo -e "${GREEN}✓ Systemd service created${NC}"

# Step 12: Performance tuning
echo -e "\n${BLUE}12. Applying performance optimizations...${NC}"
# Increase file descriptors
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Docker daemon config
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

systemctl restart docker

# Step 13: Check container features
echo -e "\n${BLUE}13. Verifying container configuration...${NC}"
echo -e "${YELLOW}Make sure these lines are in your Proxmox container config:${NC}"
echo -e "${YELLOW}/etc/pve/lxc/<CONTAINER_ID>.conf:${NC}"
echo "lxc.apparmor.profile: unconfined"
echo "lxc.cgroup2.devices.allow: c 10:200 rwm"
echo "lxc.mount.entry: /dev/net dev/net none bind,create=dir"
echo "features: keyctl=1,nesting=1"

# Final summary
echo -e "\n${GREEN}✅ Setup Complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Edit ${YELLOW}.env.vpn${NC} with your ExpressVPN credentials:"
echo "   ${YELLOW}nano .env.vpn${NC}"
echo ""
echo "2. Build and start services:"
echo "   ${YELLOW}docker compose -f docker-compose.vpn.yml build${NC}"
echo "   ${YELLOW}docker compose -f docker-compose.vpn.yml up -d${NC}"
echo ""
echo "3. Check VPN status:"
echo "   ${YELLOW}./scripts/check-vpn-status.sh${NC}"
echo ""
echo "4. Enable auto-start:"
echo "   ${YELLOW}sudo systemctl enable lyricless${NC}"
echo ""
echo "5. Access Lyricless at:"
echo "   ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"

# Check for common issues
echo -e "\n${BLUE}Checking for common issues...${NC}"
if ! grep -q "nesting=1" /proc/self/status 2>/dev/null; then
    echo -e "${RED}⚠️  Container nesting not enabled. Docker might not work properly.${NC}"
    echo "   Add 'features: nesting=1' to container config on Proxmox host."
fi

if [ ! -c /dev/net/tun ]; then
    echo -e "${RED}⚠️  TUN device not available. VPN will not work.${NC}"
    echo "   Add TUN device mount to container config on Proxmox host."
fi

echo -e "\n${GREEN}Script completed!${NC}"
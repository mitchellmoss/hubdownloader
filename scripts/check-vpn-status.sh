#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 HubDownloader VPN Status Check"
echo "================================="

# Check if containers are running
if ! docker-compose -f docker-compose.vpn.yml ps | grep -q "vpn.*Up"; then
    echo -e "${RED}❌ VPN container is not running${NC}"
    echo "Run: docker-compose -f docker-compose.vpn.yml up -d"
    exit 1
fi

if ! docker-compose -f docker-compose.vpn.yml ps | grep -q "hubdownloader.*Up"; then
    echo -e "${YELLOW}⚠️  HubDownloader container is not running${NC}"
fi

# Get IPs
echo -e "\n📍 IP Address Information:"
REAL_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "Failed to get IP")
VPN_IP=$(docker-compose -f docker-compose.vpn.yml exec -T vpn curl -s https://api.ipify.org 2>/dev/null || echo "Failed to get VPN IP")

echo "   Real IP: $REAL_IP"
echo "   VPN IP:  $VPN_IP"

if [ "$REAL_IP" = "$VPN_IP" ]; then
    echo -e "${RED}   ⚠️  IPs match - VPN might not be working!${NC}"
else
    echo -e "${GREEN}   ✅ VPN is masking your IP${NC}"
fi

# Get location info
echo -e "\n🌍 VPN Location:"
VPN_LOCATION=$(docker-compose -f docker-compose.vpn.yml exec -T vpn curl -s http://ip-api.com/json | jq -r '"\(.city), \(.country)"' 2>/dev/null || echo "Unknown")
echo "   Connected to: $VPN_LOCATION"

# Check VPN health
echo -e "\n🏥 Health Status:"
HEALTH=$(docker-compose -f docker-compose.vpn.yml exec -T vpn /gluetun-entrypoint healthcheck 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ VPN connection is healthy${NC}"
else
    echo -e "${RED}   ❌ VPN health check failed${NC}"
    echo "   Error: $HEALTH"
fi

# Performance check
echo -e "\n⚡ Performance Test:"
DOWNLOAD_SPEED=$(docker-compose -f docker-compose.vpn.yml exec -T vpn curl -s -o /dev/null -w "%{speed_download}" https://proof.ovh.net/files/1Mb.dat 2>/dev/null || echo "0")
SPEED_MB=$(echo "scale=2; $DOWNLOAD_SPEED / 1048576" | bc 2>/dev/null || echo "0")
echo "   Download speed: ${SPEED_MB} MB/s"

# Container logs check
echo -e "\n📋 Recent VPN Logs:"
docker-compose -f docker-compose.vpn.yml logs --tail=5 vpn | grep -E "(ERROR|WARNING|connected|IP)" || echo "   No recent significant logs"

echo -e "\n✅ Status check complete!"
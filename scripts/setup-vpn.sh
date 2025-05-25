#!/bin/bash

# HubDownloader VPN Setup Script
set -e

echo "🔐 HubDownloader VPN Setup"
echo "=========================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env.vpn ]; then
    echo "📝 Creating .env.vpn file..."
    cp .env.vpn.example .env.vpn
    echo "⚠️  Please edit .env.vpn and add your ExpressVPN credentials"
    echo "   Get your activation code from: https://www.expressvpn.com/setup"
    exit 1
fi

# Load environment variables
source .env.vpn

# Check if ExpressVPN credentials are set
if [ -z "$EXPRESSVPN_USERNAME" ] || [ "$EXPRESSVPN_USERNAME" == "your_activation_code_here" ]; then
    echo "❌ Please set your ExpressVPN credentials in .env.vpn"
    exit 1
fi

# Build the application
echo "🔨 Building HubDownloader..."
docker-compose -f docker-compose.vpn.yml build

# Test VPN connection
echo "🌐 Testing VPN connection..."
docker-compose -f docker-compose.vpn.yml up -d vpn
sleep 30  # Wait for VPN to connect

# Check IP
echo "🔍 Checking IP address..."
ORIGINAL_IP=$(curl -s https://api.ipify.org)
VPN_IP=$(docker-compose -f docker-compose.vpn.yml exec -T vpn curl -s https://api.ipify.org)

echo "   Original IP: $ORIGINAL_IP"
echo "   VPN IP: $VPN_IP"

if [ "$ORIGINAL_IP" == "$VPN_IP" ]; then
    echo "⚠️  Warning: VPN might not be working properly"
else
    echo "✅ VPN is working! Your IP is masked."
fi

# Start all services
echo "🚀 Starting HubDownloader with VPN..."
docker-compose -f docker-compose.vpn.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.vpn.yml ps

echo ""
echo "✅ Setup complete!"
echo "   - HubDownloader is running at: http://localhost:3000"
echo "   - Your real IP is hidden behind ExpressVPN"
echo ""
echo "📝 Useful commands:"
echo "   - Check status: docker-compose -f docker-compose.vpn.yml ps"
echo "   - View logs: docker-compose -f docker-compose.vpn.yml logs -f"
echo "   - Check IP: docker-compose -f docker-compose.vpn.yml exec vpn curl -s https://api.ipify.org"
echo "   - Stop: docker-compose -f docker-compose.vpn.yml down"
echo "   - Restart: docker-compose -f docker-compose.vpn.yml restart"
#!/bin/bash

# Test rate limiting on HubDownloader endpoints

echo "🧪 Testing HubDownloader Rate Limits"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base URL (change if running on different port)
BASE_URL="${1:-http://localhost:3000}"

# Test extraction endpoint (10 requests/minute limit)
echo -e "\n${BLUE}Testing /api/extract (Limit: 10/min)${NC}"
echo "----------------------------------------"

for i in {1..12}; do
  echo -n "Request $i: "
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/extract" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com/video.mp4"}' 2>/dev/null)
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Success${NC}"
  elif [ "$http_code" = "429" ]; then
    retry_after=$(echo "$body" | grep -o '"retryAfter":[0-9]*' | cut -d: -f2)
    echo -e "${RED}✗ Rate limited${NC} (retry after ${retry_after}s)"
    echo "   Response: $body"
  else
    echo -e "${YELLOW}? Status: $http_code${NC}"
    echo "   Response: $body"
  fi
  
  # Small delay between requests
  sleep 0.5
done

# Test status endpoint
echo -e "\n${BLUE}Checking rate limit status${NC}"
echo "----------------------------------------"
curl -s "$BASE_URL/api/status/rate-limits" | jq '.' || echo "Install jq for pretty output"

# Test conversion endpoint (5 requests/minute limit)
echo -e "\n${BLUE}Testing /api/convert/hls-to-mp4 (Limit: 5/min)${NC}"
echo "----------------------------------------"

for i in {1..7}; do
  echo -n "Request $i: "
  
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/convert/hls-to-mp4" \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com/playlist.m3u8"}' 2>/dev/null)
  
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Allowed${NC}"
  elif [ "$http_code" = "429" ]; then
    echo -e "${RED}✗ Rate limited${NC}"
  else
    echo -e "${YELLOW}? Status: $http_code${NC}"
  fi
  
  sleep 0.5
done

echo -e "\n${GREEN}Test complete!${NC}"
echo "Note: Rate limits reset after 1 minute"
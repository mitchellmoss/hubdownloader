#!/bin/bash

echo "Testing rate limits..."
echo "====================="

# Test with 12 requests (limit is 10)
for i in {1..12}; do
  echo -n "Request $i: "
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/extract \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}')
  
  if [ "$response" = "200" ]; then
    echo "✓ Success (200)"
  elif [ "$response" = "429" ]; then
    echo "✗ Rate limited (429)"
  else
    echo "? Status: $response"
  fi
  
  # Small delay
  sleep 0.2
done

echo ""
echo "Checking rate limit status..."
curl -s http://localhost:3000/api/status/rate-limits | jq '.limits.extraction' 2>/dev/null || curl -s http://localhost:3000/api/status/rate-limits
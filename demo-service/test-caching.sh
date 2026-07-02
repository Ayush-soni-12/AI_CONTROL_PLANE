#!/bin/bash

# AI Control Plane - Caching Test Script
# This script tests the caching functionality for /searchs endpoint

echo "🧪 Testing Caching Functionality for /searchs"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "1. Send 15 requests to /searchs (slow, ~800ms each)"
echo "2. AI will detect high latency and enable caching"
echo "3. Subsequent requests should be fast (cached)"
echo ""
echo "Press Enter to start..."
read
True
echo -e "${YELLOW}Phase 1: Sending initial requests (slow database calls)${NC}"
echo "Sending 15 requests to trigger caching decision..."
echo ""

for i in {1..25}
do
  echo -n "Request $i: "
  START=$(date +%s%N)
  
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL/products")
  
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
  TIME_TOTAL=$(echo "$RESPONSE" | tail -1)
  
  echo -e "${GREEN}✓${NC} Status: $HTTP_CODE | Time: ${TIME_TOTAL}s (${DURATION}ms)"
  
  sleep 0.5
done

echo ""
echo -e "${BLUE}⏳ Waiting 12 seconds for AI to analyze and make decision...${NC}"
sleep 5E

echo ""
echo -e "${YELLOW}Phase 2: Testing if caching is enabled${NC}"
echo "Sending 5 more requests (should be fast if cached)..."
echo ""

CACHED_COUNT=0
for i in {1..12}
do
  echo -n "Request $i: "
  START=$(date +%s%N)
  
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL/products")
  
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
  TIME_TOTAL=$(echo "$RESPONSE" | tail -1)
  
  # Check if response indicates caching
  if echo "$RESPONSE" | grep -q '"cached":true'; then
    echo -e "${GREEN}✓ CACHED${NC} | Status: $HTTP_CODE | Time: ${TIME_TOTAL}s (${DURATION}ms)"
    CACHED_COUNT=$((CACHED_COUNT + 1))
  else
    echo -e "${YELLOW}○ NOT CACHED${NC} | Status: $HTTP_CODE | Time: ${TIME_TOTAL}s (${DURATION}ms)"
  fi
  
  sleep 0.5
done

echo ""
echo "=============================================="
echo -e "${BLUE}📊 Test Results:${NC}"
echo "Cached responses: $CACHED_COUNT / 5"

if [ $CACHED_COUNT -ge 3 ]; then
  echo -e "${GREEN}✅ CACHING TEST PASSED!${NC}"
  echo "The AI successfully enabled caching after detecting high latency."
else
  echo -e "${YELLOW}⚠️  CACHING NOT DETECTED${NC}"
  echo "The AI may need more time or signals to enable caching."
  echo "Try running this test again or check the Control Plane logs."
fi

echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "- Check dashboard at http://localhost:3000/dashboard/signals"
echo "- View Control Plane logs for AI decision-making"
echo "- Cache should activate after ~10 requests with high latency"

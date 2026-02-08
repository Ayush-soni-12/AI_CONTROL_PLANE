#!/bin/bash

# AI Control Plane - Rate Limiting Test Script
# This script tests the rate limiting functionality for /api/rate-limit endpoint

echo "🧪 Testing Rate Limiting Functionality"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "1. Send 200 requests rapidly over 90 seconds (~133 req/min sustained)"
echo "2. AI will detect high traffic (>60 req/min) and enable rate limiting"
echo "3. After ~80 requests/min, rate limiter will block with 429"
echo "4. Traffic stays high across minute boundaries to keep rate limiting active"
echo ""
echo "Press Enter to start..."
read

echo -e "${YELLOW}Phase 1: Sending rapid sustained requests${NC}"
echo "Sending 200 requests at 0.45s intervals (~133 req/min)..."
echo ""

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0

# Send 200 requests over ~90 seconds to maintain high traffic across buckets
for i in {1..200}
do
  echo -n "Request $i: "
  START=$(date +%s%N)
  
  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL/api/products")
  
  END=$(date +%s%N)
  DURATION=$(( (END - START) / 1000000 ))
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
  TIME_TOTAL=$(echo "$RESPONSE" | tail -1)
  
  # Check response status
  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    
    # Check if rate limiting is enabled but not enforced yet
    if echo "$RESPONSE" | grep -q '"rate_limit_enabled":true'; then
      echo -e "${YELLOW}⚠ RATE LIMITING ENABLED${NC} | Status: $HTTP_CODE | Time: ${TIME_TOTAL}s"
    else
      echo -e "${GREEN}✓${NC} Status: $HTTP_CODE | Time: ${TIME_TOTAL}s"
    fi
  elif [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    RETRY_AFTER=$(echo "$RESPONSE" | grep -o '"retry_after":[0-9]*' | grep -o '[0-9]*')
    echo -e "${RED}🚫 RATE LIMITED${NC} | Retry after: ${RETRY_AFTER}s | Time: ${TIME_TOTAL}s"
  else
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo -e "${RED}✗ ERROR${NC} | Status: $HTTP_CODE | Time: ${TIME_TOTAL}s"
  fi
  
  # Faster requests: 0.45s between requests = ~133 req/min
  # This maintains high traffic across minute bucket boundaries
  sleep 0.45
done

echo ""
echo "========================================"
echo -e "${BLUE}📊 Test Results:${NC}"
echo "Total requests:     200"
echo "Successful:         $SUCCESS_COUNT"
echo -e "${RED}Rate Limited (429): $RATE_LIMITED_COUNT${NC}"
echo "Errors:             $ERROR_COUNT"
echo ""

# Calculate percentage
RATE_LIMITED_PERCENT=$(( RATE_LIMITED_COUNT * 100 / 200 ))

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ RATE LIMITING TEST PASSED!${NC}"
  echo "The AI successfully detected high traffic and enabled rate limiting."
  echo "Rate limiter blocked $RATE_LIMITED_COUNT requests (~${RATE_LIMITED_PERCENT}%)"
  echo ""
  echo -e "${BLUE}What happened:${NC}"
  echo "1. AI detected traffic > 60 req/min → Enabled rate limiting"
  echo "2. Rate limiter counted requests in current minute bucket"
  echo "3. After 80 requests/min limit → Returned 429 responses"
  echo "4. Sustained high traffic kept rate limiting active across buckets"
else
  echo -e "${YELLOW}⚠️  RATE LIMITING NOT TRIGGERED${NC}"
  echo "Possible reasons:"
  echo "- Request rate was below 60 req/min threshold"
  echo "- Bucket boundary timing (count reset between minutes)"
  echo "- Try running the test again"
fi

echo ""
echo -e "${BLUE}💡 Next Steps:${NC}"
echo "- Check dashboard: http://localhost:3000/services/demo-service"
echo "- Look for 🟠 'Rate Limit: Enabled' badge on /api/rate-limit endpoint"
echo "- View Control Plane logs for AI decision-making"
echo "- Check AI reasoning: 'High Traffic: 80+ req/min detected'"
echo ""
echo -e "${BLUE}🔍 Manual Verification:${NC}"
echo "curl $BASE_URL/api/rate-limit"
echo "# Should show: rate_limit_enabled: true if still active"
echo ""

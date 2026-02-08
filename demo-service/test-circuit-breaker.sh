#!/bin/bash

# AI Control Plane - Circuit Breaker Test Script
# This script tests the circuit breaker functionality using /products-error endpoint

echo "🧪 Testing Circuit Breaker Functionality"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3001"
ENDPOINT="/products-error"

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "Endpoint: $ENDPOINT (has built-in 60% error rate)"
echo "1. Send 20 requests to trigger errors"
echo "2. AI will detect high error rate (>30%)"
echo "3. Circuit breaker should activate"
echo "4. Subsequent requests will be blocked/degraded"
echo ""
echo "Press Enter to start..."
read

echo -e "${YELLOW}Phase 1: Sending requests with simulated errors${NC}"
echo "Sending 20 requests (expect ~60% to fail)..."
echo ""

ERROR_COUNT=0
SUCCESS_COUNT=0

for i in {1..20}
do
  echo -n "Request $i: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$ENDPOINT" 2>&1)
  
  if [ $? -eq 0 ]; then
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "${GREEN}✓${NC} Status: $HTTP_CODE (Success)"
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$HTTP_CODE" = "500" ]; then
      echo -e "${RED}✗${NC} Status: $HTTP_CODE (Simulated Error)"
      ERROR_COUNT=$((ERROR_COUNT + 1))
    else
      echo -e "${YELLOW}?${NC} Status: $HTTP_CODE (Unknown)"
    fi
  else
    echo -e "${RED}✗${NC} Connection failed"
    ERROR_COUNT=$((ERROR_COUNT + 1))
  fi
  
  sleep 0.3
done

ERROR_RATE=$(awk "BEGIN {printf \"%.1f\", ($ERROR_COUNT / 20) * 100}")

echo ""
echo -e "${BLUE}📊 Phase 1 Results:${NC}"
echo "Total requests: 20"
echo "Successes: $SUCCESS_COUNT"
echo "Errors: $ERROR_COUNT"
echo "Error rate: ${ERROR_RATE}%"
echo ""

if [ $ERROR_COUNT -lt 5 ]; then
  echo -e "${YELLOW}⚠️  Warning: Error rate is too low to trigger circuit breaker${NC}"
  echo "Expected at least 6 errors (30%), got $ERROR_COUNT"
  echo "This might be due to random chance. Try running the test again."
  echo ""
fi

echo -e "${BLUE}⏳ Waiting 12 seconds for AI to analyze and activate circuit breaker...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}Phase 2: Testing if circuit breaker is active${NC}"
echo "Sending 5 more requests..."
echo ""

BREAKER_COUNT=0
DEGRADED_COUNT=0

for i in {1..5}
do
  echo -n "Request $i: "
  
  RESPONSE=$(curl -s "$BASE_URL$ENDPOINT")
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$ENDPOINT")
  
  # Check if response indicates circuit breaker
  if echo "$RESPONSE" | grep -q '"circuit_breaker_active":true'; then
    echo -e "${YELLOW}⚡ CIRCUIT BREAKER ACTIVE${NC} - Service degraded"
    BREAKER_COUNT=$((BREAKER_COUNT + 1))
    DEGRADED_COUNT=$((DEGRADED_COUNT + 1))
  elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Status: 200 - Normal operation"
  else
    echo -e "${RED}✗${NC} Status: $HTTP_CODE - Error"
  fi
  
  sleep 0.5
done

echo ""
echo "========================================="
echo -e "${BLUE}📊 Final Test Results:${NC}"
echo ""
echo "Phase 1 (Error Generation):"
echo "  - Total requests: 20"
echo "  - Successes: $SUCCESS_COUNT"
echo "  - Errors: $ERROR_COUNT"
echo "  - Error rate: ${ERROR_RATE}%"
echo ""
echo "Phase 2 (Circuit Breaker Check):"
echo "  - Circuit breaker activations: $BREAKER_COUNT / 5"
echo "  - Degraded responses: $DEGRADED_COUNT / 5"
echo ""

# Determine test result
if [ $BREAKER_COUNT -ge 3 ]; then
  echo -e "${GREEN}✅ CIRCUIT BREAKER TEST PASSED!${NC}"
  echo "The AI successfully activated circuit breaker after detecting errors."
  echo ""
  echo "What happened:"
  echo "1. ✓ High error rate detected ($ERROR_RATE%)"
  echo "2. ✓ AI analyzed the pattern"
  echo "3. ✓ Circuit breaker activated"
  echo "4. ✓ Service entered degraded mode"
elif [ $ERROR_COUNT -ge 6 ]; then
  echo -e "${YELLOW}⚠️  ERRORS DETECTED BUT CIRCUIT BREAKER NOT ACTIVE YET${NC}"
  echo "The AI detected errors but hasn't activated circuit breaker yet."
  echo ""
  echo "Possible reasons:"
  echo "- AI needs more signals (try running test again)"
  echo "- Error rate threshold not quite reached"
  echo "- Cache TTL hasn't expired yet (wait 10 more seconds)"
  echo ""
  echo "Try running: ./test-circuit-breaker.sh again"
else
  echo -e "${BLUE}ℹ️  NOT ENOUGH ERRORS TO TRIGGER CIRCUIT BREAKER${NC}"
  echo "Error rate was too low (${ERROR_RATE}%, need >30%)"
  echo "This can happen due to random chance with the 60% error rate."
  echo ""
  echo "Solution: Run the test again!"
fi

echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "- Check dashboard: http://localhost:3000/dashboard/signals"
echo "- View demo service logs for error simulation messages"
echo "- Circuit breaker activates after ~10 requests with >30% error rate"
echo "- Run test multiple times if error rate is too low due to randomness"
echo ""
echo -e "${BLUE}🔄 To test again:${NC}"
echo "  ./test-circuit-breaker.sh"


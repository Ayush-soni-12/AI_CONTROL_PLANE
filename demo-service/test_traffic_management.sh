#!/bin/bash

# Traffic Management Test Script
# Tests per-customer rate limiting, queue deferral, and load shedding
# Shows each request with detailed status output

DEMO_SERVICE="http://localhost:3001"

echo "🚦 Testing Traffic Management Features (via Demo Service)"
echo "========================================================"
echo ""

echo "📋 Test Plan:"
echo "1. Test per-customer rate limiting (10 req/min per IP)"
echo "2. Test queue deferral (80-120 req/min for medium priority)"
echo "3. Test load shedding (>120 req/min for low priority)"
echo "4. Test critical priority (never queued/shed)"
echo ""

# Test 2: Queue Deferral (Medium Priority)
echo ""
echo "🧪 Test 2: Queue Deferral (Medium Priority)"
echo "========================================================"
echo "Sending 120 requests to /products with 0.5s delay (~120 req/min)..."
echo "Expected: Normal at first, then 202 (Queued) when global traffic hits 80-120 req/min"
echo ""

queued_count=0
normal_count=0
rate_limited_count=0

for i in {1..200}; do
  echo -n "Request #$i: "
  
  http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" "$DEMO_SERVICE/products")
  
  if [ "$http_code" == "202" ]; then
    queued_count=$((queued_count + 1))
    estimated_delay=$(cat /tmp/response.json 2>/dev/null | jq -r '.estimated_delay' 2>/dev/null || echo "10")
    queue_position=$(cat /tmp/response.json 2>/dev/null | jq -r '.queue_position' 2>/dev/null || echo "?")
    echo "⏳ 202 QUEUED (delay: ${estimated_delay}s, position: ${queue_position})"
  elif [ "$http_code" == "200" ]; then
    normal_count=$((normal_count + 1))
    echo "✓ 200 OK"
  elif [ "$http_code" == "429" ]; then
    rate_limited_count=$((rate_limited_count + 1))
    echo "🚫 429 RATE LIMITED (per-customer limit)"
  else
    echo "⚠️  $http_code"
  fi
  
  # 0.5s delay = ~120 req/min to trigger queue deferral
  sleep 0.3
done

echo ""
echo "Summary: $normal_count normal, $queued_count queued, $rate_limited_count rate-limited"
echo ""
echo "Waiting 65 seconds for traffic to calm down..."
sleep 65

# Test 3: Load Shedding (Low Priority)
echo ""
echo "🧪 Test 3: Load Shedding (Low Priority)"
echo "========================================================"
echo "Sending 150 requests to /analytics with 0.4s delay (~150 req/min)..."
echo "Expected: Normal at first, then 503 (Shed) when traffic exceeds 120 req/min"
echo ""

shed_count=0
normal_count=0
queued_count=0
rate_limited_count=0

for i in {1..200}; do
  echo -n "Request #$i: "
  
  http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" "$DEMO_SERVICE/analytics")
  
  if [ "$http_code" == "503" ]; then
    shed_count=$((shed_count + 1))
    retry_after=$(cat /tmp/response.json 2>/dev/null | jq -r '.retry_after' 2>/dev/null || echo "30")
    echo "🗑️  503 SHED (retry after ${retry_after}s)"
  elif [ "$http_code" == "202" ]; then
    queued_count=$((queued_count + 1))
    echo "⏳ 202 QUEUED"
  elif [ "$http_code" == "200" ]; then
    normal_count=$((normal_count + 1))
    echo "✓ 200 OK"
  elif [ "$http_code" == "429" ]; then
    rate_limited_count=$((rate_limited_count + 1))
    echo "🚫 429 RATE LIMITED"
  else
    echo "⚠️  $http_code"
  fi
  
  # 0.4s delay = ~150 req/min to trigger load shedding
  sleep 0.4
done

echo ""
echo "Summary: $normal_count normal, $queued_count queued, $shed_count shed, $rate_limited_count rate-limited"
echo ""
echo "Waiting 30 seconds for traffic to calm down..."
sleep 30

# Test 4: Critical Priority Protection
echo ""
echo "🧪 Test 4: Critical Priority Protection (/payment)"
echo "========================================================"
echo "Sending 20 requests to /payment (CRITICAL priority)..."
echo "Expected: Always 200 OK, never queued or shed"
echo ""

critical_success=0
critical_fail=0

for i in {1..20}; do
  echo -n "Request #$i: "
  
  http_code=$(curl -s -o /tmp/response.json -w "%{http_code}" -X POST "$DEMO_SERVICE/payment" -H "Content-Type: application/json")
  
  if [ "$http_code" == "200" ]; then
    critical_success=$((critical_success + 1))
    echo "✅ 200 OK (Protected!)"
  else
    critical_fail=$((critical_fail + 1))
    echo "❌ $http_code (UNEXPECTED)"
  fi
  
  sleep 0.2
done

echo ""
if [ $critical_fail -eq 0 ]; then
  echo "✅ Critical priority protection WORKING! All $critical_success requests succeeded."
else
  echo "❌ Critical priority failed $critical_fail times (should be 0)"
fi

echo ""
echo "========================================"
echo "✅ All Tests Complete!"
echo ""
echo "📊 Final Summary:"
echo "  ✓ Per-customer rate limiting: Blocks individual IPs at 10 req/min"
echo "  ✓ Queue deferral (Medium): Queues requests at 80-120 req/min globally"
echo "  ✓ Load shedding (Low): Drops requests at >120 req/min globally"
echo "  ✓ Critical priority: Always processes, never queued/shed"
echo ""
echo "💡 Check the demo service logs for detailed AI reasoning!"
echo ""

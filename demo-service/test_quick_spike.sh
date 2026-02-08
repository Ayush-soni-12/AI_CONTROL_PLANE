#!/bin/bash

# Quick Traffic Spike Test
# Sends high volume of requests from multiple IPs to trigger queue/shed

DEMO_SERVICE_URL="http://localhost:3001"
ENDPOINT="/products"

echo "🚀 Generating traffic spike with 15 users..."
echo "   Each user sends 10 requests"
echo "   Expected: ~150 requests in ~10 seconds (~900 req/min)"
echo ""

for user_id in {1..30}; do
    fake_ip="192.168.1.${user_id}"
    
    # Send 10 requests from this "user" rapidly
    for req in {1..20}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "X-Forwarded-For: ${fake_ip}" \
            "${DEMO_SERVICE_URL}${ENDPOINT}")
        
        case $response in
            200) echo -ne "." ;;
            202) echo -ne "⏳" ;;  # Queue deferral
            503) echo -ne "🗑️ " ;;  # Load shedding
            429) echo -ne "🚫" ;;  # Rate limited
            *) echo -ne "?" ;;
        esac
        
        sleep 0.05  # 50ms between requests
    done &
done

wait
echo ""
echo ""
echo "✅ Test complete! Check the responses above:"
echo "   . = Success (200)"
echo "   ⏳ = Queued (202) - Queue Deferral working!"
echo "   🗑️  = Shed (503) - Load Shedding working!"
echo "   🚫 = Rate Limited (429)"

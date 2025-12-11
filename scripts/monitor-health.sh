#!/bin/bash
# Health check monitoring script
# Usage: ./scripts/monitor-health.sh [api-url]

set -e

API_URL=${1:-http://localhost:4000}
HEALTH_ENDPOINT="${API_URL}/health"
MAX_RETRIES=3
RETRY_DELAY=5

check_health() {
  local response
  local status_code

  response=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" || echo -e "\n000")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$status_code" = "200" ]; then
    echo "✓ Health check passed"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 0
  else
    echo "✗ Health check failed (HTTP $status_code)"
    echo "$body"
    return 1
  fi
}

# Try health check with retries
retries=0
while [ $retries -lt $MAX_RETRIES ]; do
  if check_health; then
    exit 0
  fi

  retries=$((retries + 1))
  if [ $retries -lt $MAX_RETRIES ]; then
    echo "Retrying in ${RETRY_DELAY} seconds... (attempt $retries/$MAX_RETRIES)"
    sleep $RETRY_DELAY
  fi
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1


#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Smoke Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ℹ️  Requires 'make dev' to be running"
echo ""

echo "▶ Health check..."
curl -sf http://localhost:8001/health > /dev/null
echo "✓ /health returned 200"

echo ""
echo "▶ Auth rejects forged tokens..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer forgedtoken" \
  http://localhost:8001/entries/)
if [ "$STATUS" != "401" ]; then
  echo "✗ Expected 401, got $STATUS"
  exit 1
fi
echo "✓ /entries/ returned 401 for bad token"

echo ""
echo "▶ Auth rejects missing token..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:8001/entries/)
if [ "$STATUS" != "401" ]; then
  echo "✗ Expected 401, got $STATUS"
  exit 1
fi
echo "✓ /entries/ returned 401 for missing token"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Smoke tests passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
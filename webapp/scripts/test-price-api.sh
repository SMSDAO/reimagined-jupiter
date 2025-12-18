#!/bin/bash

# Test the Jupiter Price API endpoint

echo "🚀 Testing Jupiter Price API"
echo ""

# Test 1: Single token (SOL)
echo "=== Test 1: Single Token Price (SOL) ==="
curl -s "http://localhost:3000/api/prices?ids=So11111111111111111111111111111111111111112" | jq '.'
echo ""

# Test 2: Multiple tokens
echo "=== Test 2: Bulk Token Prices ==="
curl -s "http://localhost:3000/api/prices?ids=So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" | jq '.'
echo ""

# Test 3: Invalid request (no ids)
echo "=== Test 3: Invalid Request (no ids) ==="
curl -s "http://localhost:3000/api/prices" | jq '.'
echo ""

echo "✅ API tests complete"

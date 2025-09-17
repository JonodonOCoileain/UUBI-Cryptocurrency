#!/bin/bash

# UUBI Deploy to IP Address Script
echo "🚀 Deploying UUBI to IP address..."

# Get the current IP
CURRENT_IP=$(curl -s ipv4.icanhazip.com)
echo "📍 Your public IP: $CURRENT_IP"

# Get local IP
LOCAL_IP=$(ifconfig | grep -E "inet.*broadcast" | awk '{print $2}' | head -1)
echo "🏠 Your local IP: $LOCAL_IP"

# Stop any running server
echo "🛑 Stopping any running servers..."
pkill -f "node server.js" 2>/dev/null || true
sleep 2

# Set environment variables for IP deployment
export NODE_ENV=production
export PORT=3000
export CORS_ORIGIN="http://$CURRENT_IP:3000,http://$LOCAL_IP:3000,http://localhost:3000"

echo "🔧 Environment configured:"
echo "   NODE_ENV: $NODE_ENV"
echo "   PORT: $PORT"
echo "   CORS_ORIGIN: $CORS_ORIGIN"

# Start the server
echo "🚀 Starting UUBI server..."
echo ""
echo "🌐 Your UUBI website will be available at:"
echo "   Local: http://localhost:3000"
echo "   Local Network: http://$LOCAL_IP:3000"
echo "   Public: http://$CURRENT_IP:3000"
echo ""
echo "⚠️  Note: For public access, you may need to:"
echo "   1. Configure port forwarding on your router (port 3000)"
echo "   2. Check your firewall settings"
echo "   3. Ensure your ISP allows incoming connections"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js

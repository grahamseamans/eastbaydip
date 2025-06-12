#!/bin/bash

# 🌊 East Bay Dipping Society - Deployment Script
# This script deploys code changes while preserving the database

set -e  # Exit on any error

SERVER="root@147.182.255.35"
APP_DIR="/var/www/eastbaydip"
SERVICE_NAME="eastbaydip"

echo "🌊 Deploying East Bay Dipping Society..."
echo "========================================="

# Check if we can reach the server
echo "📡 Testing connection to server..."
if ! ssh -o ConnectTimeout=10 $SERVER "echo 'Connected successfully'"; then
    echo "❌ Cannot connect to server. Check your SSH connection."
    exit 1
fi

# Copy application files (excluding database)
echo "📁 Copying application files..."
scp -r views/ public/ server.js package.json $SERVER:$APP_DIR/

# Check if package.json changed and install dependencies if needed
echo "📦 Checking dependencies..."
ssh $SERVER "cd $APP_DIR && npm install --production"

# Restart the service
echo "🔄 Restarting service..."
ssh $SERVER "systemctl restart $SERVICE_NAME"

# Wait a moment for service to start
echo "⏳ Waiting for service to start..."
sleep 3

# Verify deployment
echo "✅ Verifying deployment..."
if ssh $SERVER "systemctl is-active --quiet $SERVICE_NAME"; then
    echo "🎉 Service is running successfully!"
    
    # Show service status
    echo "📊 Service status:"
    ssh $SERVER "systemctl status $SERVICE_NAME --no-pager -l | head -10"
    
    echo ""
    echo "🌐 Site is live at: https://eastbaydip.org"
    echo "🔧 Admin panel at: https://eastbaydip.org/admin"
    echo ""
    echo "✅ Deployment completed successfully!"
else
    echo "❌ Service failed to start. Checking logs..."
    ssh $SERVER "journalctl -u $SERVICE_NAME --no-pager -n 20"
    exit 1
fi

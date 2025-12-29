#!/bin/bash

# ============================================================================
# Initial Server Deployment Script
# ============================================================================
# This script will be run ONCE on the server to:
# 1. Clone the repository
# 2. Install dependencies
# 3. Set up systemd service
# 4. Configure Nginx
# 5. Set up auto-sync cron job
# ============================================================================

set -e

# Read credentials from deploy-config.json (must be uploaded separately)
if [ ! -f "deploy-config.json" ]; then
    echo "❌ ERROR: deploy-config.json not found!"
    echo "Please create it with your credentials before running this script."
    exit 1
fi

# Parse config using jq
APP_NAME=$(jq -r '.appName' deploy-config.json)
REMOTE_PATH=$(jq -r '.remotePath' deploy-config.json)
GITHUB_USER=$(jq -r '.github.username' deploy-config.json)
GITHUB_TOKEN=$(jq -r '.github.token' deploy-config.json)
GITHUB_REPO=$(jq -r '.github.repo' deploy-config.json)

echo "========================================="
echo "🚀 Starting deployment for $APP_NAME"
echo "========================================="

# Install jq if not present
if ! command -v jq &> /dev/null; then
    echo "📦 Installing jq..."
    apt-get update && apt-get install -y jq
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    echo "📦 Installing git..."
    apt-get update && apt-get install -y git
    apt-get update && apt-get install -y git
fi

# Install ffmpeg if not present
if ! command -v ffmpeg &> /dev/null; then
    echo "📦 Installing ffmpeg..."
    apt-get update && apt-get install -y ffmpeg
fi

# Install traceroute if not present
if ! command -v traceroute &> /dev/null; then
    echo "📦 Installing traceroute..."
    apt-get update && apt-get install -y traceroute
fi

# Create app directory
echo "📁 Creating application directory: $REMOTE_PATH"
mkdir -p "$REMOTE_PATH"
cd "$REMOTE_PATH"

# Clone repository with authentication
echo "📥 Cloning repository..."
REPO_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
git clone "$REPO_URL" . || (cd "$REMOTE_PATH" && git pull)

# Remove credentials from git config for security
git remote set-url origin "https://github.com/${GITHUB_REPO}.git"

# Store credentials in git credential helper (memory only, not disk)
git config credential.helper 'cache --timeout=3600'
echo "url=https://github.com" | git credential approve
echo "username=${GITHUB_USER}" | git credential approve
echo "password=${GITHUB_TOKEN}" | git credential approve

# Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create systemd service
echo "⚙️ Creating systemd service..."
cat > "/etc/systemd/system/${APP_NAME}.service" << EOF
[Unit]
Description=${APP_NAME} Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${REMOTE_PATH}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
echo "🔄 Starting service..."
systemctl daemon-reload
systemctl enable "$APP_NAME"
systemctl start "$APP_NAME"

# Wait and check status
sleep 2
systemctl status "$APP_NAME" --no-pager

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > "/etc/nginx/sites-available/${APP_NAME}" << EOF
server {
    listen 80 default_server;
    server_name _;

    # Serve static files directly from application directory
    root ${REMOTE_PATH};
    index index.html;

    # Serve reports directory files with proper MIME types
    location /reports/ {
        try_files \$uri =404;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    # Serve static files directly
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remove default sites (including TurnKey defaults)
echo "🗑️ Removing default Nginx sites..."
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp

# Enable new site
ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/"

# Test and reload Nginx
echo "🔍 Testing Nginx configuration..."
nginx -t && systemctl reload nginx

# Set up auto-sync cron job
echo "⏰ Setting up auto-sync cron job (every 5 minutes)..."
CRON_JOB="*/5 * * * * cd ${REMOTE_PATH} && /bin/bash auto-sync.sh"

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v "auto-sync.sh"; echo "$CRON_JOB") | crontab -

# Make auto-sync script executable
chmod +x "${REMOTE_PATH}/auto-sync.sh"

# Create log file
touch "/var/log/${APP_NAME}-autosync.log"
chmod 644 "/var/log/${APP_NAME}-autosync.log"

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo "🌐 Application: $APP_NAME"
echo "📁 Directory: $REMOTE_PATH"
echo "🔄 Auto-sync: Every 5 minutes"
echo "📊 Service status: systemctl status $APP_NAME"
echo "📜 Auto-sync logs: tail -f /var/log/${APP_NAME}-autosync.log"
echo "🌐 Test: curl http://localhost"
echo "========================================="

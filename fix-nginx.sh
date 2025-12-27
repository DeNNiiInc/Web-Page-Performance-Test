#!/bin/bash
# ============================================================================
# Quick Fix for Nginx Configuration
# ============================================================================
# Run this script if you're seeing the TurnKey control panel instead of your app
# Usage: ./fix-nginx.sh
# ============================================================================

set -e

APP_NAME="web-page-performance-test"
APP_DIR="/var/www/$APP_NAME"

echo "========================================="
echo "🔧 Fixing Nginx Configuration"
echo "========================================="

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Application directory not found at $APP_DIR"
    echo "Please run the full deployment first: ./deploy-local.ps1"
    exit 1
fi

# Create proper Nginx configuration
echo "📝 Creating Nginx configuration..."
cat > "/etc/nginx/sites-available/${APP_NAME}" << EOF
server {
    listen 80 default_server;
    server_name _;

    # Serve static files directly from application directory
    root ${APP_DIR};
    index index.html;

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

# Remove ALL TurnKey default sites
echo "🗑️ Removing TurnKey default sites..."
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp

# Enable our site
echo "✅ Enabling ${APP_NAME} site..."
ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid!"
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    echo ""
    echo "========================================="
    echo "✅ Nginx Fixed!"
    echo "========================================="
    echo "🌐 Your application should now be visible at http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "📊 Check what Nginx is serving:"
    echo "   ls -la $APP_DIR"
    echo ""
    echo "📜 View Nginx logs:"
    echo "   tail -f /var/log/nginx/access.log"
    echo "   tail -f /var/log/nginx/error.log"
else
    echo "❌ Nginx configuration test failed!"
    echo "Please check the error messages above."
    exit 1
fi

#!/bin/bash
# Quick Setup Script for Web Performance Test
# This script sets up the complete environment in minutes

set -e  # Exit on error

echo "🚀 Web Performance Test - Quick Setup"
echo "======================================"
echo ""

# 1. Install Dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# 2. Setup Database Configuration
echo "🗄️  Setting up database configuration..."
if [ ! -f "lib/db-config.js" ]; then
    echo ""
    echo "⚠️  Database configuration not found!"
    echo "Please create lib/db-config.js from the template:"
    echo ""
    echo "  cp lib/db-config.template.js lib/db-config.js"
    echo ""
    echo "Then edit lib/db-config.js with your database credentials:"
    echo "  - host: Your PostgreSQL server IP"
    echo "  - user: Database username (default: postgres)"
    echo "  - password: Database password"
    echo "  - database: Database name (default: webperformance)"
    echo ""
    read -p "Press Enter after you've created and configured lib/db-config.js..."
fi

# 3. Initialize Database
echo "🔧 Initializing database..."
node lib/db.js

echo ""
echo "✅ Setup Complete!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Or with PM2 (recommended for production):"
echo "  pm2 start ecosystem.config.js"
echo ""

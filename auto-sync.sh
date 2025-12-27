#!/bin/bash

# ============================================================================
# Auto-Sync Script - Run by Cron Every 5 Minutes
# ============================================================================
# This script:
# 1. Checks for changes in Git repository
# 2. Pulls updates if available
# 3. Restarts the service ONLY if changes were detected
# ============================================================================

set -e

APP_NAME="web-page-performance-test"
APP_DIR="/var/www/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME-autosync.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting auto-sync check..."

cd "$APP_DIR" || exit 1

# Fetch latest from remote
git fetch origin main 2>&1 | tee -a "$LOG_FILE"

# Check if local is behind remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "✅ Already up to date. No changes detected."
    exit 0
fi

log "🔄 Changes detected! Pulling updates..."

# Force update (overwrite local changes)
log "⚠️ Resetting local changes to match remote..."
git reset --hard origin/main 2>&1 | tee -a "$LOG_FILE"

# Install/update dependencies if package.json changed
if git diff --name-only $LOCAL $REMOTE | grep -q "package.json"; then
    log "📦 package.json changed. Running npm install..."
    npm install 2>&1 | tee -a "$LOG_FILE"
fi

# Restart the service
log "🔄 Restarting $APP_NAME service..."
systemctl restart "$APP_NAME" 2>&1 | tee -a "$LOG_FILE"

# Wait a moment and check status
sleep 2
if systemctl is-active --quiet "$APP_NAME"; then
    log "✅ Service restarted successfully!"
else
    log "❌ WARNING: Service may have failed to start!"
    systemctl status "$APP_NAME" --no-pager 2>&1 | tee -a "$LOG_FILE"
fi

log "✅ Auto-sync completed!"
log "========================================="

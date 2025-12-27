#!/bin/bash

# Configuration
APP_NAME="web-page-performance-test"
APP_DIR="/var/www/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME-autosync.log"
LOCK_FILE="/var/lock/$APP_NAME-sync.lock"

# Singleton execution with flock
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    # Lock is busy, skip this run (logging optional to avoid spam)
    exit 0
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Ensure we are in the correct directory
cd "$APP_DIR" || { log "❌ Error: Could not change to $APP_DIR"; exit 1; }

# Fetch remote updates
if ! git fetch origin main --quiet; then
    log "❌ Error: Git fetch failed"
    exit 1
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    # No changes, exit silently
    exit 0
fi

log "🔄 Changes detected! Local: ${LOCAL:0:7} -> Remote: ${REMOTE:0:7}"

# Force update
if ! git reset --hard origin/main; then
    log "❌ Error: Git reset failed"
    exit 1
fi

# Check for dependency changes
RESTART_NEEDED=false
if git diff --name-only "$LOCAL" "$REMOTE" | grep -q "package.json"; then
    log "📦 package.json changed. Running npm install..."
    if npm install --production; then
        RESTART_NEEDED=true
    else
        log "❌ Error: npm install failed"
    fi
else
    RESTART_NEEDED=true
fi

# Restart service if needed
if [ "$RESTART_NEEDED" = true ]; then
    log "🔄 Restarting service..."
    if systemctl restart "$APP_NAME"; then
        log "✅ Service restarted successfully"
    else
        log "❌ Error: Failed to restart service"
    fi
fi

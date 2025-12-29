#!/bin/bash

# Auto-sync script for Web-Page-Performance-Test
# This script is run by cron every 5 minutes

LOG_FILE="/var/log/Web-Page-Performance-Test-autosync.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Fetch latest changes
git fetch origin main

# Check if we are behind
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    log "Updates detected. Pulling..."
    
    # Pull changes
    git pull origin main >> "$LOG_FILE" 2>&1
    
    # Install dependencies if package.json changed
    if git diff --name-only "$LOCAL" "$REMOTE" | grep -q "package.json"; then
        log "package.json changed. Installing dependencies..."
        npm install --production >> "$LOG_FILE" 2>&1
    fi
    
    # Restart service
    log "Restarting service..."
    systemctl restart Web-Page-Performance-Test
    
    log "Update complete. New version: $(git rev-parse --short HEAD)"
else
    # No changes, do nothing (silent to avoid log spam)
    :
fi

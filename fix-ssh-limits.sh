#!/bin/bash
# fix-ssh-limits.sh
# Increases SSH connection limits to prevent "Connection refused" during rapid automation.

SSHD_CONFIG="/etc/ssh/sshd_config"

log() {
    echo "[SSH-FIX] $1"
}

if [ ! -f "$SSHD_CONFIG" ]; then
    log "Error: $SSHD_CONFIG not found."
    exit 1
fi

# Backup config
cp "$SSHD_CONFIG" "$SSHD_CONFIG.bak.$(date +%s)"

# Function to update or add a setting
set_config() {
    local param=$1
    local value=$2
    if grep -q "^#\?${param}" "$SSHD_CONFIG"; then
        sed -i "s/^#\?${param}.*/${param} ${value}/" "$SSHD_CONFIG"
    else
        echo "${param} ${value}" >> "$SSHD_CONFIG"
    fi
    log "Set ${param} to ${value}"
}

# Apply high limits
set_config "MaxStartups" "100:30:200"
set_config "MaxSessions" "100"
set_config "MaxAuthTries" "20"

# Reload SSH service
if systemctl restart ssh; then
    log "✅ SSH service restarted successfully with new limits."
    log "VERIFICATION: $(grep 'MaxStartups' $SSHD_CONFIG)"
else
    log "❌ Failed to restart SSH service."
    exit 1
fi

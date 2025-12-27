# 🚀 Proxmox Deployment Template (TurnKey Node.js)

**Real-world tested deployment guide for ANY Node.js application to TurnKey Linux LXC Container.**

This template is based on actual deployment experience and includes all the fixes and troubleshooting steps discovered during real deployments.

---

## 📋 Prerequisites

1. **Project**: A Node.js application (Express, Next.js, static site, etc.) in a Git repository
2. **Server**: A Proxmox TurnKey Node.js Container (already created)
3. **Access**: Root SSH password for the container
4. **GitHub**: Personal Access Token (PAT) with `repo` permissions
5. **Domain** (Optional): If using Cloudflare Tunnel or DNS

---

## � Step 0: Prepare GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Set note: "Proxmox Auto-Deploy"
4. Check the `repo` scope (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

---

## 🛠️ Step 1: Prepare Your Project Locally

### 1.1 Ensure Port Configuration

Your app should listen on a configurable port:

```javascript
// server.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### 1.2 Create .gitignore

**CRITICAL**: Protect credentials from Git:

```gitignore
# Credentials - NEVER commit these
deploy-config.json
credentials*.json
.env
*.pem
*.key
```

### 1.3 Create deploy-config.json (Locally Only)

Create this file locally but **NEVER commit it**:

```json
{
  "host": "YOUR_SERVER_IP",
  "port": 22,
  "username": "root",
  "password": "YOUR_ROOT_PASSWORD",
  "remotePath": "/var/www/your-app-name",
  "appName": "your-app-name",
  "github": {
    "username": "YourGitHubUsername",
    "token": "ghp_YourPersonalAccessToken",
    "repo": "YourUsername/YourRepo"
  }
}
```

---

## 🖥️ Step 2: Initial Server Setup (SSH)

### 2.1 SSH into your server

```bash
ssh root@YOUR_SERVER_IP
```

### 2.2 Install essentials

```bash
apt-get update && apt-get install -y git jq
```

### 2.3 Verify Node.js installation

```bash
which node
node --version
# TurnKey Node.js usually installs to: /usr/local/bin/node
```

---

## 📦 Step 3: Deploy Your Application

### 3.1 Create application directory

```bash
mkdir -p /var/www/your-app-name
cd /var/www/your-app-name
```

### 3.2 Clone repository with authentication

**CRITICAL**: Use HTTPS with token authentication:

```bash
# Format: https://USERNAME:TOKEN@github.com/REPO.git
git clone 'https://YourUsername:ghp_YourToken@github.com/YourUsername/YourRepo.git' .

# Remove credentials from Git config immediately
git remote set-url origin "https://github.com/YourUsername/YourRepo.git"
```

### 3.3 Configure Git credential helper (memory only)

```bash
git config credential.helper 'cache --timeout=3600'
```

### 3.4 Install dependencies

```bash
npm install --production
```

---

## ⚙️ Step 4: Create Systemd Service

**Why Systemd instead of PM2?**
- Native to Linux (no extra software)
- Better logging with journalctl
- More reliable auto-restart
- Boot persistence without configuration

### 4.1 Create service file

```bash
cat > /etc/systemd/system/your-app-name.service << 'EOF'
[Unit]
Description=Your App Name Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/your-app-name
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=your-app-name

[Install]
WantedBy=multi-user.target
EOF
```

**IMPORTANT**: Verify the path to node (`/usr/local/bin/node`) using `which node`

### 4.2 Enable and start service

```bash
systemctl daemon-reload
systemctl enable your-app-name
systemctl start your-app-name

# Check status
systemctl status your-app-name --no-pager
```

**Troubleshooting**: If you get `status=203/EXEC`, verify the ExecStart path is correct.

---

## 🌐 Step 5: Configure Nginx (Critical for TurnKey)

### 5.1 **CRITICAL**: Remove TurnKey Default Sites

TurnKey Linux comes with default Nginx configurations that show the TurnKey control panel. **You MUST remove these**:

```bash
# Remove ALL TurnKey default sites
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp
```

### 5.2 Create your application's Nginx configuration

**IMPORTANT**: Watch variable escaping! Use single quotes or backticks properly:

```bash
cat > /etc/nginx/sites-available/your-app-name << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    # Serve static files directly (faster!)
    root /var/www/your-app-name;
    index index.html;

    # Try static files first, then proxy to Node.js
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
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
```

### 5.3 Enable your site

```bash
# Link your site configuration
ln -sf /etc/nginx/sites-available/your-app-name /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### 5.4 Verify it's working

```bash
# Test locally
curl -I http://localhost

# Should show: HTTP/1.1 200 OK
# If you see "TurnKey Node.js" in the output, the old config is still active
```

---

## 🔄 Step 6: Setup Auto-Sync (Every 5 Minutes)

### 6.1 Create auto-sync script

```bash
cat > /var/www/your-app-name/auto-sync.sh << 'EOF'
#!/bin/bash

set -e

APP_NAME="your-app-name"
APP_DIR="/var/www/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME-autosync.log"

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

# Pull changes
git pull origin main 2>&1 | tee -a "$LOG_FILE"

# Install/update dependencies if package.json changed
if git diff --name-only $LOCAL $REMOTE | grep -q "package.json"; then
    log "📦 package.json changed. Running npm install..."
    npm install 2>&1 | tee -a "$LOG_FILE"
fi

# Restart the service
log "🔄 Restarting $APP_NAME service..."
systemctl restart "$APP_NAME" 2>&1 | tee -a "$LOG_FILE"

# Wait and check status
sleep 2
if systemctl is-active --quiet "$APP_NAME"; then
    log "✅ Service restarted successfully!"
else
    log "❌ WARNING: Service may have failed to start!"
    systemctl status "$APP_NAME" --no-pager 2>&1 | tee -a "$LOG_FILE"
fi

log "✅ Auto-sync completed!"
log "========================================="
EOF

# Make executable
chmod +x /var/www/your-app-name/auto-sync.sh

# Create log file
touch /var/log/your-app-name-autosync.log
chmod 644 /var/log/your-app-name-autosync.log
```

### 6.2 Add to crontab

```bash
# Add cron job (every 5 minutes)
echo "*/5 * * * * cd /var/www/your-app-name && /bin/bash auto-sync.sh" | crontab -

# Verify it was added
crontab -l
```

---

## 🧪 Step 7: Verify Deployment

### 7.1 Check service status

```bash
systemctl status your-app-name --no-pager
# Should show: active (running)
```

### 7.2 Check Nginx

```bash
systemctl status nginx
nginx -t
```

### 7.3 Test the application

```bash
# Test locally
curl http://localhost

# Should return your HTML, NOT the TurnKey control panel
```

### 7.4 Test from browser

Visit: `http://YOUR_SERVER_IP`

**If you see the TurnKey control panel**, go back to Step 5 and verify you removed all default Nginx sites.

---

## 🚨 Common Issues & Fixes

### Issue 1: TurnKey Control Panel Shows Instead of App

**Symptoms**: Browser shows "TurnKey Node.js" page with Webmin link

**Cause**: TurnKey default Nginx configuration is still active

**Fix**:
```bash
# Remove ALL default sites
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp

# Verify only your site is enabled
ls -la /etc/nginx/sites-enabled/
# Should only show: your-app-name

# Reload Nginx
nginx -t && systemctl reload nginx
```

### Issue 2: Nginx Shows "500 Internal Server Error"

**Cause**: Variable escaping issues in Nginx config

**Fix**: Recreate the Nginx config using the exact format in Step 5.2

```bash
# View your current config
cat /etc/nginx/sites-enabled/your-app-name

# If you see \\$uri instead of $uri, the escaping is wrong
# Delete and recreate using Step 5.2
```

### Issue 3: Service Keeps Restarting (status=203/EXEC)

**Cause**: Wrong path to node executable

**Fix**:
```bash
# Find correct node path
which node

# Update service file with correct path
sudo nano /etc/systemd/system/your-app-name.service
# Change ExecStart to match the output of 'which node'

# Reload
systemctl daemon-reload
systemctl restart your-app-name
```

### Issue 4: Git Clone Fails with "already exists"

**Cause**: Directory not empty

**Fix**:
```bash
cd /var/www
rm -rf your-app-name
mkdir -p your-app-name
cd your-app-name
# Then retry git clone
```

### Issue 5: Auto-Sync Not Working

**Check**:
```bash
# Verify cron job exists
crontab -l | grep auto-sync

# Manually run sync to see errors
cd /var/www/your-app-name
./auto-sync.sh

# Check logs
tail -f /var/log/your-app-name-autosync.log
```

---

## 📊 Useful Commands

### Service Management
```bash
# Status
systemctl status your-app-name

# Restart
systemctl restart your-app-name

# View logs
journalctl -u your-app-name -f

# View last 50 lines
journalctl -u your-app-name -n 50
```

### Nginx Commands
```bash
# Test configuration
nginx -t

# Reload
systemctl reload nginx

# Restart
systemctl restart nginx

# View error logs
tail -f /var/log/nginx/error.log

# View access logs
tail -f /var/log/nginx/access.log
```

### Auto-Sync Commands
```bash
# View auto-sync logs
tail -f /var/log/your-app-name-autosync.log

# Manually trigger sync
cd /var/www/your-app-name && ./auto-sync.sh

# Check cron jobs
crontab -l
```

### Git Commands
```bash
# Check current commit
git log -1 --oneline

# Check remote
git remote -v

# Force pull
git fetch origin main
git reset --hard origin/main
```

---

## ✅ Deployment Checklist

Use this checklist for every deployment:

- [ ] SSH key accepted (run `ssh root@IP` manually first)
- [ ] GitHub PAT created and copied
- [ ] `.gitignore` includes `deploy-config.json`
- [ ] Local `deploy-config.json` created with credentials
- [ ] Repository cloned with token authentication
- [ ] Dependencies installed (`npm install`)
- [ ] Systemd service created with correct node path
- [ ] Service started and active
- [ ] **ALL TurnKey Nginx defaults removed**
- [ ] Your Nginx config created and enabled
- [ ] Nginx reloaded successfully
- [ ] Browser shows YOUR app (not TurnKey page)
- [ ] Auto-sync script created and executable
- [ ] Cron job added and verified
- [ ] Test auto-sync by pushing a change

---

## 🎯 Quick Deployment Commands (Copy-Paste)

Replace `YOUR_APP_NAME`, `YOUR_REPO`, etc. with your values:

```bash
# 1. Install essentials
apt-get update && apt-get install -y git jq

# 2. Clone and setup
mkdir -p /var/www/YOUR_APP_NAME
cd /var/www/YOUR_APP_NAME
git clone 'https://USERNAME:TOKEN@github.com/USER/REPO.git' .
git remote set-url origin "https://github.com/USER/REPO.git"
npm install --production

# 3. Create systemd service (update node path!)
cat > /etc/systemd/system/YOUR_APP_NAME.service << 'EOF'
[Unit]
Description=YOUR_APP_NAME Service
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=/var/www/YOUR_APP_NAME
ExecStart=/usr/local/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
StandardOutput=journal
StandardError=journal
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload && systemctl enable YOUR_APP_NAME && systemctl start YOUR_APP_NAME

# 4. Remove TurnKey defaults (CRITICAL!)
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/nodejs /etc/nginx/sites-enabled/node* /etc/nginx/sites-enabled/tkl-webcp

# 5. Create Nginx config
cat > /etc/nginx/sites-available/YOUR_APP_NAME << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    root /var/www/YOUR_APP_NAME;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

ln -sf /etc/nginx/sites-available/YOUR_APP_NAME /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 6. Test
curl -I http://localhost
```

---

## 🎉 Success Indicators

You'll know deployment succeeded when:

✅ `systemctl status your-app-name` shows **active (running)**  
✅ `curl http://localhost` returns **your HTML (not TurnKey page)**  
✅ Browser at `http://SERVER_IP` shows **your application**  
✅ Auto-sync logs show successful checks  
✅ Pushing to GitHub triggers auto-update within 5 minutes  

---

## 📚 Additional Resources

- **Systemd Documentation**: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- **Nginx Documentation**: https://nginx.org/en/docs/
- **TurnKey Node.js**: https://www.turnkeylinux.org/nodejs

---

**Last Updated**: December 2025 (Based on real deployment experience)

**Tested On**: TurnKey Linux Node.js 18.x LXC Container on Proxmox VE 8.x

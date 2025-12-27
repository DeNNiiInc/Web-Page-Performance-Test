# 🚀 Automated Proxmox Deployment Guide

This guide will help you deploy this application to a **Proxmox TurnKey Linux Node.js** container with **automatic GitHub synchronization** every 5 minutes.

---

## 📋 What You Need

Before starting, gather the following information:

1. **Server Details**

   - Server IP address
   - SSH port (default: 22)
   - Root password

2. **GitHub Credentials**
   - Your GitHub username
   - Personal Access Token (PAT) with `repo` permissions
   - Repository name: `DeNNiiInc/Web-Page-Performance-Test`

### 🔑 Creating a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set a note: "Proxmox Auto-Deploy"
4. Check the `repo` scope (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

---

## 🛠️ Step 1: Prepare Credentials (LOCAL MACHINE)

1. **Copy the template configuration:**

   ```powershell
   Copy-Item deploy-config.TEMPLATE.json deploy-config.json
   ```

2. **Edit `deploy-config.json`** and fill in your details:
   ```json
   {
     "host": "192.168.1.100", // Your server IP
     "port": 22,
     "username": "root",
     "password": "your-root-password",
     "remotePath": "/var/www/web-page-performance-test",
     "appName": "web-page-performance-test",
     "github": {
       "username": "YourGitHubUsername",
       "token": "ghp_YourPersonalAccessToken",
       "repo": "DeNNiiInc/Web-Page-Performance-Test"
     }
   }
   ```

> ⚠️ **IMPORTANT**: `deploy-config.json` is already in `.gitignore` and will **NEVER** be pushed to GitHub!

---

## 🚀 Step 2: Deploy to Server (ONE COMMAND!)

From your local machine, run:

```powershell
.\deploy-local.ps1
```

This script will:

- ✅ Test SSH connection
- ✅ Upload deployment scripts
- ✅ Clone the repository on the server
- ✅ Install dependencies
- ✅ Create systemd service (NOT PM2 - more reliable!)
- ✅ Configure Nginx reverse proxy
- ✅ Set up auto-sync cron job (every 5 minutes)
- ✅ Remove credentials from the server after setup

**Deployment takes about 2-3 minutes.**

---

## 🔄 Step 3: Auto-Sync is Now Active!

After deployment:

- **Every 5 minutes**, the server checks GitHub for updates
- **If changes are found**, it automatically:
  1. Pulls the latest code
  2. Installs new dependencies (if `package.json` changed)
  3. Restarts the application
- **If no changes**, it does nothing (efficient!)

### 📝 View Auto-Sync Logs

SSH into your server and run:

```bash
tail -f /var/log/web-page-performance-test-autosync.log
```

---

## 🧪 Testing the Deployment

1. **Check if the service is running:**

   ```bash
   ssh root@YOUR_SERVER_IP
   systemctl status web-page-performance-test
   ```

2. **Test the application:**

   - Open your browser: `http://YOUR_SERVER_IP`
   - You should see your application!

3. **Test auto-sync:**
   - Make a small change to `index.html` locally
   - Commit and push to GitHub
   - Wait ~5 minutes
   - Refresh your browser - you'll see the change!

---

## 🛡️ Security Features

✅ **Credentials are NEVER committed to Git**

- `deploy-config.json` is in `.gitignore`
- GitHub token is removed from server after initial clone
- Credentials are only stored in memory during deployment

✅ **Systemd instead of PM2**

- Native Linux service management
- Auto-restart on failure
- Better logging with journalctl
- Boot persistence

---

## 📊 Useful Commands

### Check### Application Not Accessible
```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Check service status
systemctl status web-page-performance-test

# Check if port 3000 is listening
netstat -tlnp | grep 3000

# Check Nginx
systemctl status nginx
nginx -t

# View logs
journalctl -u web-page-performance-test -n 50
```

### Seeing TurnKey Control Panel Instead of Your App

If you see the TurnKey Node.js default page (with "Webmin" and "Resources" links) instead of your application:

**Quick Fix - Run this on the server:**
```bash
cd /var/www/web-page-performance-test
chmod +x fix-nginx.sh
./fix-nginx.sh
```

**Manual Fix:**
```bash
# Remove TurnKey default Nginx sites
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp

# Enable your site
ln -sf /etc/nginx/sites-available/web-page-performance-test /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx

# Verify your files are there
ls -la /var/www/web-page-performance-test
```

**Why this happens:**
- TurnKey Linux templates come with a default Nginx configuration that shows their control panel
- Our deployment removes these defaults, but if Nginx configuration wasn't applied properly, the TurnKey page shows
- The `fix-nginx.sh` script removes ALL TurnKey defaults and enables only your application

### GitHub authentication Application Status

```bash
systemctl status web-page-performance-test
```

### View Application Logs

```bash
journalctl -u web-page-performance-test -f
```

### View Auto-Sync Logs

```bash
tail -f /var/log/web-page-performance-test-autosync.log
```

### Manually Restart Application

```bash
systemctl restart web-page-performance-test
```

### Force Manual Sync

```bash
cd /var/www/web-page-performance-test
./auto-sync.sh
```

### Check Nginx Status

```bash
systemctl status nginx
nginx -t  # Test configuration
```

---

## 🔧 Troubleshooting

### Application won't start

```bash
journalctl -u web-page-performance-test -n 50
```

### Auto-sync not working

```bash
# Check if cron job exists
crontab -l | grep auto-sync

# Manually run sync to see errors
cd /var/www/web-page-performance-test
./auto-sync.sh
```

### Nginx errors

```bash
nginx -t
systemctl status nginx
```

### Git authentication issues

The server uses HTTPS with token authentication. If you see authentication errors:

```bash
cd /var/www/web-page-performance-test
git remote -v  # Should show https://github.com/...
```

---

## 📦 Project Structure

```
Web-Page-Performance-Test/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── server.js               # Node.js Express server
├── package.json            # Dependencies
├── .gitignore              # Excludes credentials
├── deploy-config.TEMPLATE.json  # Template for credentials
├── deploy-local.ps1        # Local deployment script (Windows)
├── deploy-server.sh        # Server setup script (Linux)
└── auto-sync.sh            # Auto-sync script (runs every 5 min)
```

---

## 🎯 Deployment Architecture

```
┌─────────────────┐
│  Your Computer  │
│  (Windows)      │
└────────┬────────┘
         │ deploy-local.ps1
         │ (SSH + SCP)
         ▼
┌─────────────────────────────┐
│  Proxmox Server             │
│  ┌───────────────────────┐  │
│  │ Nginx (Port 80)       │  │
│  │  ↓ Reverse Proxy      │  │
│  │ Node.js (Port 3000)   │  │
│  │  ↓ Express Server     │  │
│  │ Static Files          │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Systemd Service       │  │
│  │ (Auto-restart)        │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Cron Job (*/5 min)    │  │
│  │  → auto-sync.sh       │  │
│  │  → Check GitHub       │  │
│  │  → Pull if changed    │  │
│  │  → Restart service    │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
         ▲
         │ git pull
         │ (every 5 minutes)
┌────────┴────────┐
│     GitHub      │
│   (Your Repo)   │
└─────────────────┘
```

---

## ✅ Advantages of This Setup

1. **Systemd > PM2**: Native, reliable, and integrated with Linux
2. **Auto-sync**: Push to GitHub, wait 5 minutes, it's live!
3. **Efficient**: Only restarts when changes are detected
4. **Secure**: Credentials never exposed to Git
5. **Simple**: One PowerShell command to deploy
6. **Logging**: Full logs for debugging
7. **Nginx**: Serves static files efficiently

---

## 🎉 You're All Set!

Your application is now:

- ✅ Running on Proxmox
- ✅ Accessible via HTTP
- ✅ Auto-syncing with GitHub every 5 minutes
- ✅ Restarting automatically on changes
- ✅ Secured (credentials not in Git)

**Just code, commit, push - and your server updates automatically!** 🚀

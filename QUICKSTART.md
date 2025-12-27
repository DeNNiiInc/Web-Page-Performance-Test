# 🎯 Quick Start - Fill This Out First!

## Step 1: Gather Your Information

### 🖥️ Server Details (from Proxmox)
- [ ] **Server IP Address**: `_____________________`
- [ ] **Root Password**: `_____________________`
- [ ] **SSH Port**: `22` (default)

### 🔑 GitHub Details
- [ ] **GitHub Username**: `_____________________`
- [ ] **Personal Access Token**: `_____________________ ` ([Create here](https://github.com/settings/tokens))
  - ✅ Needs `repo` scope permissions
- [ ] **Repository**: `DeNNiiInc/Web-Page-Performance-Test` (already set)

---

## Step 2: Create deploy-config.json

1. **Copy the template:**
   ```powershell
   Copy-Item deploy-config.TEMPLATE.json deploy-config.json
   ```

2. **Edit deploy-config.json** with your information from Step 1:
   ```json
   {
     "host": "YOUR_SERVER_IP_HERE",
     "port": 22,
     "username": "root",
     "password": "YOUR_ROOT_PASSWORD_HERE",
     "remotePath": "/var/www/web-page-performance-test",
     "appName": "web-page-performance-test",
     "github": {
       "username": "YOUR_GITHUB_USERNAME_HERE",
       "token": "YOUR_GITHUB_TOKEN_HERE",
       "repo": "DeNNiiInc/Web-Page-Performance-Test"
     }
   }
   ```

---

## Step 3: Deploy! (ONE COMMAND)

```powershell
.\deploy-local.ps1
```

That's it! ✅

---

## ✅ What This Does Automatically

1. ✅ Connects to your Proxmox server via SSH
2. ✅ Clones your GitHub repository
3. ✅ Installs Node.js dependencies
4. ✅ Creates a systemd service (auto-start on boot)
5. ✅ Configures Nginx reverse proxy (serves on port 80)
6. ✅ Sets up auto-sync (checks GitHub every 5 minutes)
7. ✅ Removes credentials from the server after setup

---

## 🔄 After Deployment (How to Update)

### Option 1: Automatic (Recommended)
Just push to GitHub, wait 5 minutes, it updates automatically! No manual intervention needed.

### Option 2: Force Update (Immediate)
```bash
ssh root@YOUR_SERVER_IP
cd /var/www/web-page-performance-test
./auto-sync.sh
```

---

## 📊 Useful Commands (SSH into server first)

### Check if app is running
```bash
systemctl status web-page-performance-test
```

### View app logs
```bash
journalctl -u web-page-performance-test -f
```

### View auto-sync logs
```bash
tail -f /var/log/web-page-performance-test-autosync.log
```

### Restart app manually
```bash
systemctl restart web-page-performance-test
```

---

## 🆘 Troubleshooting

### "Connection refused" error
- Check if server IP is correct
- Check if SSH is running: `systemctl status ssh`
- Try: `ping YOUR_SERVER_IP`

### "Authentication failed" error
- Double-check root password in `deploy-config.json`
- Try manually: `ssh root@YOUR_SERVER_IP`

### App deployed but not accessible
```bash
# Check if service is running
systemctl status web-page-performance-test

# Check if Nginx is running
systemctl status nginx

# Test locally on server
curl http://localhost
```

---

## 🎉 Success Checklist

After running `.\deploy-local.ps1`, you should see:
- ✅ "SSH connection successful!"
- ✅ "Deployment Complete!"
- ✅ Visit `http://YOUR_SERVER_IP` in browser - your site loads!
- ✅ Wait 5 minutes, make a change, push to GitHub, site updates automatically!

---

## 📁 Files You'll Edit

- `deploy-config.json` - Your credentials (ONE TIME, never commit to Git)
- `index.html` - Your HTML content (commit to Git)
- `styles.css` - Your styles (commit to Git)
- `script.js` - Your JavaScript (commit to Git)

---

## 🔐 Security Notes

- ✅ `deploy-config.json` is in `.gitignore` - will NEVER be pushed to GitHub
- ✅ GitHub token is removed from server after initial clone
- ✅ Server uses systemd (not PM2) for better security and reliability
- ✅ Nginx serves static files (Node.js only handles API)

---

## 📖 Need More Details?

Read the full guide: `DEPLOYMENT.md`

---

**Ready? Let's go! 🚀**

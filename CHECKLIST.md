# ✅ Deployment Checklist - Fill This Out

## 📋 Information Needed

### 🖥️ Proxmox Server Details
- [ ] **Server IP Address**: ___________________
- [ ] **SSH Port**: `22` (default)
- [ ] **Root Password**: ___________________

### 🔑 GitHub Credentials
- [ ] **GitHub Username**: ___________________
- [ ] **Personal Access Token**: ___________________
  - 📝 Create at: https://github.com/settings/tokens
  - ✅ Required scope: `repo` (full control of private repositories)
  - ⏰ Recommended expiration: 90 days or No expiration

### 📦 Repository Details (Already Set)
- [x] **Repository**: `DeNNiiInc/Web-Page-Performance-Test`
- [x] **Branch**: `main`

---

## 🎯 When You're Ready

### Step 1: Create Configuration File
```powershell
# Copy the template
Copy-Item deploy-config.TEMPLATE.json deploy-config.json

# Edit deploy-config.json with notepad or VS Code
notepad deploy-config.json
```

### Step 2: Fill in deploy-config.json
```json
{
  "host": "PUT_YOUR_SERVER_IP_HERE",
  "port": 22,
  "username": "root",
  "password": "PUT_YOUR_ROOT_PASSWORD_HERE",
  "remotePath": "/var/www/web-page-performance-test",
  "appName": "web-page-performance-test",
  "github": {
    "username": "PUT_YOUR_GITHUB_USERNAME_HERE",
    "token": "PUT_YOUR_GITHUB_TOKEN_HERE",
    "repo": "DeNNiiInc/Web-Page-Performance-Test"
  }
}
```

### Step 3: Deploy!
```powershell
.\deploy-local.ps1
```

---

## ⚠️ Pre-Deployment Checklist

- [ ] Proxmox container is running
- [ ] You can ping the server IP: `ping YOUR_SERVER_IP`
- [ ] You can SSH to the server: `ssh root@YOUR_SERVER_IP`
- [ ] You have created a GitHub Personal Access Token
- [ ] You have copied deploy-config.TEMPLATE.json to deploy-config.json
- [ ] You have filled in ALL fields in deploy-config.json
- [ ] You have verified deploy-config.json is listed in .gitignore
- [ ] You have committed and pushed any local changes to GitHub

---

## 📝 Example deploy-config.json

Here's an example (with fake credentials):

```json
{
  "host": "192.168.1.100",
  "port": 22,
  "username": "root",
  "password": "MySecurePassword123!",
  "remotePath": "/var/www/web-page-performance-test",
  "appName": "web-page-performance-test",
  "github": {
    "username": "DeNNiiInc",
    "token": "ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8",
    "repo": "DeNNiiInc/Web-Page-Performance-Test"
  }
}
```

---

## 🚀 Post-Deployment Verification

After running `.\deploy-local.ps1`, verify:

- [ ] Script shows "✅ Deployment Complete!"
- [ ] You can access the site: `http://YOUR_SERVER_IP`
- [ ] Git version badge appears in the footer
- [ ] SSH into server and check: `systemctl status web-page-performance-test`
- [ ] Logs are working: `journalctl -u web-page-performance-test -n 20`
- [ ] Auto-sync is scheduled: `crontab -l | grep auto-sync`

---

## 🧪 Test Auto-Sync

1. Make a small change to `index.html` (e.g., change the subtitle)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test auto-sync"
   git push
   ```
3. Wait 5 minutes (or run manually on server: `./auto-sync.sh`)
4. Refresh your browser and see the change!

---

## 🆘 If Something Goes Wrong

### SSH Connection Failed
```powershell
# Test connection manually
ssh root@YOUR_SERVER_IP

# If prompted for password, type it in
# If successful, you'll see the server prompt
```

### PuTTY Tools Not Found
The script needs `plink.exe` and `pscp.exe` (part of PuTTY):
- Download from: https://www.putty.org/
- Add to PATH or copy to project directory

### GitHub Token Invalid
- Token must have `repo` scope
- Check if token is expired
- Regenerate at: https://github.com/settings/tokens

### Application Not Accessible
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

---

## 📞 Ready to Deploy?

Once you have all the information above filled in:

1. ✅ Create `deploy-config.json`
2. ✅ Fill in all credentials
3. ✅ Run `.\deploy-local.ps1`
4. ✅ Wait for "Deployment Complete!"
5. ✅ Visit `http://YOUR_SERVER_IP`
6. ✅ Celebrate! 🎉

---

**Need Help?**
- Quick Start: [QUICKSTART.md](QUICKSTART.md)
- Detailed Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- Full README: [README.md](README.md)

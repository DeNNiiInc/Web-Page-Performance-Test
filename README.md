# 🚀 Web Page Performance Test

A modern, sleek web application template by **Beyond Cloud Technology** with automated Proxmox deployment capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![Auto-Deploy](https://img.shields.io/badge/Auto--Deploy-Proxmox-orange.svg)](DEPLOYMENT.md)

---

## ✨ Features

- 🎨 **Modern Design**: Beautiful glassmorphism UI with gradient accents
- 🌙 **Dark Theme**: Eye-friendly dark color scheme
- 📱 **Responsive**: Optimized for all device sizes
- ⚡ **Fast**: Nginx + Node.js Express for optimal performance
- 🔄 **Auto-Sync**: Automatically syncs with GitHub every 5 minutes
- 🔐 **Secure**: Credentials never committed to Git
- 📊 **Git Badge**: Live display of deployed version
- 🚀 **One-Click Deploy**: Automated Proxmox deployment

---

## 📦 What's Included

- **Frontend**: Modern HTML5 + CSS3 with premium design system
- **Backend**: Express.js server with Git info API
- **Deployment**: Fully automated Proxmox deployment scripts
- **Auto-Sync**: Cron-based GitHub synchronization
- **Service Management**: Systemd (more reliable than PM2)
- **Reverse Proxy**: Nginx configuration included

---

## 🚀 Quick Start (Proxmox Deployment)

### Prerequisites
- Proxmox TurnKey Linux Node.js container
- SSH access (root password)
- GitHub Personal Access Token

### Deploy in 3 Steps

1. **Create your credentials file:**
   ```powershell
   Copy-Item deploy-config.TEMPLATE.json deploy-config.json
   # Edit deploy-config.json with your server IP, password, and GitHub token
   ```

2. **Run deployment:**
   ```powershell
   .\deploy-local.ps1
   ```

3. **Done!** 🎉
   - Access your app at `http://YOUR_SERVER_IP`
   - Push to GitHub, wait 5 minutes, updates deploy automatically!

📖 **Need help?** See [QUICKSTART.md](QUICKSTART.md) or [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🛠️ Local Development

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

The application will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
Web-Page-Performance-Test/
├── 📄 index.html              # Main HTML file
├── 🎨 styles.css              # Design system & styling
├── ⚙️ script.js               # Frontend JavaScript
├── 🖥️ server.js               # Express server
├── 📦 package.json            # Dependencies
├── 🔒 .gitignore              # Git exclusions
│
├── 📚 Documentation
│   ├── README.md              # This file
│   ├── QUICKSTART.md          # Quick deployment guide
│   ├── DEPLOYMENT.md          # Detailed deployment docs
│   └── PROXMOX_DEPLOY_TEMPLATE.md  # Reference template
│
└── 🚀 Deployment Scripts
    ├── deploy-config.TEMPLATE.json  # Credentials template
    ├── deploy-local.ps1             # Local automation (Windows)
    ├── deploy-server.sh             # Server setup script (Linux)
    └── auto-sync.sh                 # Auto-sync cron job
```

---

## 🔄 Auto-Sync System

After deployment, your server automatically:
- ✅ Checks GitHub every 5 minutes
- ✅ Pulls latest changes if available
- ✅ Installs new dependencies if needed
- ✅ Restarts the application
- ✅ Does nothing if no changes (efficient!)

### View Sync Logs
```bash
ssh root@YOUR_SERVER_IP
tail -f /var/log/web-page-performance-test-autosync.log
```

---

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (`#6366f1`)
- **Secondary**: Purple (`#8b5cf6`)
- **Success**: Green (`#10b981`)
- **Backgrounds**: Dark theme (`#0a0e1a`, `#131829`, `#1a2035`)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono

### Features
- Glassmorphism effects with backdrop blur
- Smooth transitions and animations
- Responsive design (mobile-first)
- Modern gradients and shadows

---

## 🖥️ Server Architecture

```
┌─────────────────────────────────────┐
│         Nginx (Port 80)             │
│    Reverse Proxy + Static Files     │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│     Node.js Express (Port 3000)     │
│      API Endpoints + Routing        │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│     Systemd Service Management      │
│   Auto-restart + Boot Persistence   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Cron Job (Every 5 Minutes)        │
│   Auto-sync with GitHub Repo        │
└─────────────────────────────────────┘
```

---

## 📊 API Endpoints

### GET `/api/git-info`
Returns current Git commit information

**Response:**
```json
{
  "commitId": "abc1234",
  "commitAge": "2 hours ago",
  "error": false
}
```

---

## 🔐 Security

- ✅ **Credentials Protected**: `deploy-config.json` is gitignored
- ✅ **Token Removal**: GitHub token removed from server after clone
- ✅ **Systemd Service**: Runs with proper permissions
- ✅ **Nginx Proxy**: Shields backend from direct access
- ✅ **Memory-Only Storage**: Credentials stored in memory during deployment only

---

## 🛡️ Systemd vs PM2

This project uses **Systemd** instead of PM2 for:
- ✅ Native Linux integration
- ✅ Better logging with `journalctl`
- ✅ More reliable auto-restart
- ✅ Boot persistence without extra configuration
- ✅ Lower memory footprint
- ✅ System-wide process management

---

## 📊 Monitoring & Logs

### Application Logs
```bash
journalctl -u web-page-performance-test -f
```

### Auto-Sync Logs
```bash
tail -f /var/log/web-page-performance-test-autosync.log
```

### Nginx Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Service Status
```bash
systemctl status web-page-performance-test
systemctl status nginx
```

---

## 🔧 Troubleshooting

### Application won't start
```bash
journalctl -u web-page-performance-test -n 50
systemctl restart web-page-performance-test
```

### Auto-sync not working
```bash
# Check cron job
crontab -l | grep auto-sync

# Run manually
cd /var/www/web-page-performance-test
./auto-sync.sh
```

### Nginx issues
```bash
nginx -t                    # Test configuration
systemctl restart nginx
```

### Git authentication errors
```bash
cd /var/www/web-page-performance-test
git remote -v              # Should show HTTPS URL
git pull origin main       # Test manually
```

---

## 🤝 Contributing

This is a template project for Beyond Cloud Technology projects. Feel free to:
- Fork and modify for your needs
- Submit issues for bugs
- Suggest improvements

---

## 📺 YouTube

Watch tutorials and project walkthroughs on our channel:
**[@beyondcloudtechnology](https://www.youtube.com/@beyondcloudtechnology)**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **TurnKey Linux** for excellent Proxmox templates
- **Proxmox VE** for virtualization platform
- **Node.js** and **Express** for the backend
- **Nginx** for reverse proxy capabilities

---

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment info
2. Check [QUICKSTART.md](QUICKSTART.md) for quick reference
3. Review the troubleshooting section above
4. Open an issue on GitHub

---

<div align="center">

**Made with ❤️ by Beyond Cloud Technology**

[YouTube](https://www.youtube.com/@beyondcloudtechnology) • [GitHub](https://github.com/DeNNiiInc)

</div>

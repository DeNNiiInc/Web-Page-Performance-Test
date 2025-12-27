# 🔧 IMPORTANT: TurnKey Control Panel Fix

## ❗ Problem: Seeing TurnKey Control Panel Instead of Your App

If you see this page when accessing your server:

![TurnKey Control Panel](C:/Users/DM/.gemini/antigravity/brain/b032648a-0921-4de6-9336-fa49fdde7396/uploaded_image_1766831119523.png)

**This means Nginx is still serving the TurnKey default page instead of your application.**

---

## ✅ SOLUTION

### Option 1: Run the Quick Fix Script (Recommended)

SSH into your server and run:

```bash
cd /var/www/web-page-performance-test
chmod +x fix-nginx.sh
./fix-nginx.sh
```

This script will:
- ✅ Remove ALL TurnKey default Nginx sites
- ✅ Enable your application's Nginx configuration
- ✅ Reload Nginx
- ✅ Show you verification steps

### Option 2: Manual Fix

If the script doesn't exist yet, manually fix Nginx:

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Remove TurnKey default sites
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/nodejs
rm -f /etc/nginx/sites-enabled/node*
rm -f /etc/nginx/sites-enabled/tkl-webcp

# Create the proper Nginx configuration for your app
cat > /etc/nginx/sites-available/web-page-performance-test << 'EOF'
server {
    listen 80 default_server;
    server_name _;

    # Serve static files directly from application directory
    root /var/www/web-page-performance-test;
    index index.html;

    # Serve static files directly
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

# Enable your site
ln -sf /etc/nginx/sites-available/web-page-performance-test /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t && systemctl reload nginx
```

---

## 🔍 Verify the Fix

After running either fix option:

1. **Refresh your browser** (hard refresh: Ctrl+F5 or Cmd+Shift+R)
2. You should now see YOUR application instead of the TurnKey page
3. Check that your static files are being served:
   ```bash
   ls -la /var/www/web-page-performance-test
   ```
   You should see: `index.html`, `styles.css`, `Logo.png`, etc.

4. **Check Git version badge** in the footer - it should show commit info

---

## 🎯 Why This Happens

**TurnKey Linux templates** come with pre-configured Nginx sites that display their control panel (Webmin). When you deploy your application, the deployment script should:

1. Remove these TurnKey default sites
2. Create YOUR application's Nginx configuration  
3. Enable only YOUR site
4. Reload Nginx

If you accessed the server **before running the full deployment**, or if the **deployment had issues**, the TurnKey defaults remain active.

---

## 📋 Prevention: Proper Deployment Order

To avoid this issue, always:

1. **Create `deploy-config.json`** with your credentials
2. **Run `.\deploy-local.ps1`** from your local Windows machine
3. **Wait for "Deployment Complete!"** message
4. **Then** access `http://YOUR_SERVER_IP` in browser

The deployment script (`deploy-local.ps1` → `deploy-server.sh`) automatically handles the Nginx configuration.

---

## 🚀 Updated Deployment Scripts

I've updated the deployment scripts to:

- ✅ More aggressively remove TurnKey default sites
- ✅ Set your app as `default_server` in Nginx
- ✅ Include `fix-nginx.sh` for quick repairs
- ✅ Serve static files directly (faster!)
- ✅ Only proxy `/api` requests to Node.js

---

## 📊 How It Should Look

### ❌ WRONG (TurnKey Page)
- Title: "TurnKey Node.js"
- Shows "Webmin" link
- Shows "Resources" section
- Shows TurnKey logo

### ✅ CORRECT (Your App)
- Your custom page title
- Beyond Cloud Technology branding
- Your project content
- Git version badge in footer
- Modern dark theme design

---

## 🆘 Still Having Issues?

If after the fix you still see the TurnKey page:

1. **Check if files exist:**
   ```bash
   ls -la /var/www/web-page-performance-test
   ```
   If empty, the repository wasn't cloned. Run full deployment.

2. **Check which Nginx sites are enabled:**
   ```bash
   ls -la /etc/nginx/sites-enabled/
   ```
   Should ONLY show: `web-page-performance-test`

3. **Check Nginx configuration:**
   ```bash
   nginx -t
   cat /etc/nginx/sites-enabled/web-page-performance-test
   ```

4. **Check Nginx error logs:**
   ```bash
   tail -50 /var/log/nginx/error.log
   ```

5. **Check if Node.js is running:**
   ```bash
   systemctl status web-page-performance-test
   ```

6. **Full redeploy:**
   If all else fails, run the deployment script again:
   ```powershell
   .\deploy-local.ps1
   ```

---

## ✅ Quick Checklist

- [ ] SSH into server: `ssh root@YOUR_SERVER_IP`
- [ ] Run fix script: `cd /var/www/web-page-performance-test && ./fix-nginx.sh`
- [ ] Wait for "✅ Nginx Fixed!" message
- [ ] Refresh browser (hard refresh)
- [ ] See YOUR application!

---

**The fix is simple - just remove the TurnKey defaults and enable your app!** 🚀

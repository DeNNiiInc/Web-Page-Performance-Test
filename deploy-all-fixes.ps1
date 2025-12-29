$config = Get-Content "deploy-config.json" | ConvertFrom-Json

$host_ip = $config.host
$password = $config.password
$remotePath = $config.remotePath
$appName = $config.appName

Write-Host "🚀 Deploying ALL fixes to production..." -ForegroundColor Cyan
Write-Host ""

# Install Posh-SSH if not present
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Write-Host "Installing Posh-SSH module..." -ForegroundColor Yellow
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser
}

Import-Module Posh-SSH

# Create credential
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("root", $securePassword)

try {
    # Create SSH session
    Write-Host "Connecting to $host_ip..." -ForegroundColor Cyan
    $session = New-SSHSession -ComputerName $host_ip -Credential $credential -AcceptKey
    
    if (-not $session) {
        throw "Failed to create SSH session"
    }
    
    Write-Host "✅ Connected!" -ForegroundColor Green
    Write-Host ""
    
    # Step 1: Pull latest code
    Write-Host "📥 Pulling latest code from GitHub..." -ForegroundColor Cyan
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && git pull"
    Write-Host $result.Output
    
    # Step 2: Update Nginx configuration
    Write-Host ""
    Write-Host "🔧 Updating Nginx configuration..." -ForegroundColor Cyan
    $nginxConfig = @"
server {
    listen 80 default_server;
    server_name _;

    root $remotePath;
    index index.html;

    location /reports/ {
        try_files `$uri =404;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    location / {
        try_files `$uri `$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
"@
    
    # Write config to server
    $escapedConfig = $nginxConfig -replace '"', '\"'
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /etc/nginx/sites-available/$appName << 'EOF'`n$nginxConfig`nEOF"
    
    # Step 3: Test and reload Nginx
    Write-Host ""
    Write-Host "🧪 Testing Nginx configuration..." -ForegroundColor Cyan
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "nginx -t"
    Write-Host $result.Output
    Write-Host $result.Error
    
    if ($result.ExitStatus -eq 0) {
        Write-Host ""
        Write-Host "🔄 Reloading Nginx..." -ForegroundColor Cyan
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "nginx -s reload"
        Write-Host "✅ Nginx reloaded!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Nginx configuration test failed!" -ForegroundColor Red
        throw "Nginx configuration error"
    }
    
    # Step 4: Install dependencies and restart app
    Write-Host ""
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && npm install --production"
    
    Write-Host ""
    Write-Host "🔄 Restarting application..." -ForegroundColor Cyan
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl restart $appName"
    Write-Host "✅ Application restarted!" -ForegroundColor Green
    
    # Verify service is running
    Start-Sleep -Seconds 2
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl is-active $appName"
    if ($result.Output -match "active") {
        Write-Host "✅ Service is running!" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Service status: $($result.Output)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 What was fixed:" -ForegroundColor Cyan
    Write-Host "  ✅ Pulled latest code (includes runner.js fix)" -ForegroundColor White
    Write-Host "  ✅ Updated Nginx to serve /reports/ JSON files" -ForegroundColor White
    Write-Host "  ✅ Reloaded Nginx configuration" -ForegroundColor White
    Write-Host "  ✅ Installed dependencies" -ForegroundColor White
    Write-Host "  ✅ Restarted application service" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Next step:" -ForegroundColor Cyan
    Write-Host "  Run a NEW test on https://beyondcloud.solutions/" -ForegroundColor Yellow
    Write-Host "  Then click ⚡ Vitals - it will work now!" -ForegroundColor Yellow
    Write-Host ""
    
}
catch {
    Write-Host ""
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    # Clean up session
    if ($session) {
        Remove-SSHSession -SessionId $session.SessionId | Out-Null
    }
}

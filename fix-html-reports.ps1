$config = Get-Content "deploy-config.json" | ConvertFrom-Json
Import-Module Posh-SSH

$securePassword = ConvertTo-SecureString $config.password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("root", $securePassword)

Write-Host "🔧 Fixing Nginx Content-Type issue..." -ForegroundColor Cyan

$session = New-SSHSession -ComputerName $config.host -Credential $credential -AcceptKey

$nginxConfig = @"
server {
    listen 80 default_server;
    server_name _;

    root $($config.remotePath);
    index index.html;

    # Serve JSON reports with correct MIME type
    location ~ ^/reports/.*\.json$ {
        try_files `$uri =404;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    # Serve HTML reports normally
    location ~ ^/reports/.*\.html$ {
        try_files `$uri =404;
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

Write-Host "Updating Nginx configuration..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat > /etc/nginx/sites-available/$($config.appName) << 'EOF'`n$nginxConfig`nEOF"

Write-Host "Testing Nginx..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "nginx -t"
Write-Host $result.Output
Write-Host $result.Error

if ($result.ExitStatus -eq 0) {
    Write-Host "Reloading Nginx..." -ForegroundColor Yellow
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "nginx -s reload"
    Write-Host ""
    Write-Host "✅ FIXED! HTML reports will work now!" -ForegroundColor Green
}
else {
    Write-Host "❌ Nginx test failed!" -ForegroundColor Red
}

Remove-SSHSession -SessionId $session.SessionId | Out-Null

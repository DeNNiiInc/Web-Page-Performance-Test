# ============================================================================
# PowerShell Deployment Script - Run from Local Machine
# ============================================================================
# This script:
# 1. Reads credentials from deploy-config.json
# 2. Uploads necessary files to the server via SCP
# 3. Connects via SSH and runs the deployment script
# ============================================================================

# Check if deploy-config.json exists
if (-not (Test-Path "deploy-config.json")) {
    Write-Host "❌ ERROR: deploy-config.json not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create deploy-config.json based on deploy-config.TEMPLATE.json" -ForegroundColor Yellow
    Write-Host "and fill in your credentials." -ForegroundColor Yellow
    exit 1
}

# Read configuration
$Config = Get-Content "deploy-config.json" | ConvertFrom-Json
$ServerHost = $Config.host
$Port = $Config.port
$User = $Config.username
$Pass = $Config.password
$RemotePath = $Config.remotePath
$AppName = $Config.appName

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Deployment Process" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📡 Server: $User@$ServerHost" -ForegroundColor White
Write-Host "📁 Remote Path: $RemotePath" -ForegroundColor White
Write-Host ""

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor Yellow
$TestCmd = "echo 'Connection successful'"
try {
    echo y | plink -ssh -P $Port -pw $Pass "$User@$ServerHost" $TestCmd 2>&1 | Out-Null
    Write-Host "✅ SSH connection successful!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to connect to server!" -ForegroundColor Red
    exit 1
}

# Create remote directory
Write-Host ""
Write-Host "📁 Creating remote directory..." -ForegroundColor Yellow
$CreateDirCmd = "mkdir -p $RemotePath; apt-get update && apt-get install -y jq git"
echo y | plink -ssh -P $Port -pw $Pass "$User@$ServerHost" $CreateDirCmd

# Upload deploy-config.json (temporarily, will be used then removed)
Write-Host ""
Write-Host "📤 Uploading configuration..." -ForegroundColor Yellow
echo y | pscp -P $Port -pw $Pass "deploy-config.json" "$User@${ServerHost}:${RemotePath}/deploy-config.json"

# Upload deployment script
Write-Host "📤 Uploading deployment script..." -ForegroundColor Yellow
echo y | pscp -P $Port -pw $Pass "deploy-server.sh" "$User@${ServerHost}:${RemotePath}/deploy-server.sh"

# Upload auto-sync script
Write-Host "📤 Uploading auto-sync script..." -ForegroundColor Yellow
echo y | pscp -P $Port -pw $Pass "auto-sync.sh" "$User@${ServerHost}:${RemotePath}/auto-sync.sh"

# Make scripts executable and run deployment
Write-Host ""
Write-Host "🚀 Running deployment on server..." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

$DeployCmd = @"
cd $RemotePath
chmod +x deploy-server.sh auto-sync.sh
./deploy-server.sh
rm -f deploy-config.json
"@

echo y | plink -ssh -P $Port -t -pw $Pass "$User@$ServerHost" $DeployCmd

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Test the application: http://$ServerHost" -ForegroundColor White
Write-Host "  2. Check service status: systemctl status $AppName" -ForegroundColor White
Write-Host "  3. View auto-sync logs: tail -f /var/log/${AppName}-autosync.log" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Auto-sync is now active (every 5 minutes)" -ForegroundColor Green
Write-Host "   Just push to GitHub and wait - the server will auto-update!" -ForegroundColor Green
Write-Host ""

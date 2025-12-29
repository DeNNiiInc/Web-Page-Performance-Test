$config = Get-Content "deploy-config.json" | ConvertFrom-Json
Import-Module Posh-SSH

$securePassword = ConvertTo-SecureString $config.password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("root", $securePassword)

Write-Host "🔍 DEBUGGING: Why is runner.js not updating?" -ForegroundColor Red
Write-Host ""

$session = New-SSHSession -ComputerName $config.host -Credential $credential -AcceptKey

# Check current running process
Write-Host "Current running process:" -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "ps aux | grep 'node.*server.js' | grep -v grep"
Write-Host $result.Output

# Check service file
Write-Host ""
Write-Host "Service file ExecStart:" -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat /etc/systemd/system/web-page-performance-test.service | grep ExecStart"
Write-Host $result.Output

# Check for node_modules cache
Write-Host ""
Write-Host "Checking node_modules..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "ls -la $($config.remotePath)/node_modules/ | head -n 5"
Write-Host $result.Output

# Kill ALL node processes
Write-Host ""
Write-Host "🛑 Killing ALL node processes..." -ForegroundColor Red
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "pkill -9 node"
Write-Host "Killed!"

# Wait a moment
Start-Sleep -Seconds 2

# Start service fresh
Write-Host ""
Write-Host "🚀 Starting service fresh..." -ForegroundColor Green
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl start web-page-performance-test"
Write-Host "Started!"

# Wait for it to come up
Start-Sleep -Seconds 3

# Check status
Write-Host ""
Write-Host "Service status:" -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl status web-page-performance-test --no-pager | head -n 15"
Write-Host $result.Output

# Check logs for module loading
Write-Host ""
Write-Host "Recent logs:" -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "journalctl -u web-page-performance-test --since '1 minute ago' --no-pager | tail -n 20"
Write-Host $result.Output

Remove-SSHSession -SessionId $session.SessionId | Out-Null

Write-Host ""
Write-Host "✅ Done! Run a NEW test now!" -ForegroundColor Green

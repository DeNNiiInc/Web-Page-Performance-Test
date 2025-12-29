$config = Get-Content "deploy-config.json" | ConvertFrom-Json
$remotePath = $config.remotePath

Import-Module Posh-SSH

$securePassword = ConvertTo-SecureString $config.password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ("root", $securePassword)

Write-Host "🔍 Investigating runner.js on server..." -ForegroundColor Cyan
Write-Host ""

$session = New-SSHSession -ComputerName $config.host -Credential $credential -AcceptKey

# Check if details property exists in runner.js
Write-Host "Checking for 'details:' in runner.js..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && grep -n 'details:' lib/runner.js | head -n 5"
Write-Host $result.Output

Write-Host ""
Write-Host "Checking git status..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && git status"
Write-Host $result.Output

Write-Host ""
Write-Host "Checking git log..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && git log --oneline -n 3"
Write-Host $result.Output

Write-Host ""
Write-Host "Forcing git pull..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && git fetch origin && git reset --hard origin/main"
Write-Host $result.Output

Write-Host ""
Write-Host "Verifying details exists now..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cd $remotePath && grep -A 2 'details:' lib/runner.js | head -n 5"
Write-Host $result.Output

Write-Host ""
Write-Host "Restarting service..." -ForegroundColor Yellow
$result = Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl restart web-page-performance-test"
Write-Host "✅ Service restarted!" -ForegroundColor Green

Remove-SSHSession -SessionId $session.SessionId | Out-Null

Write-Host ""
Write-Host "✅ DONE! Run a NEW test now." -ForegroundColor Green

$Server = "172.16.69.219"
$User = "root"
$Pass = "Q4dv!Z`$nCe#`$OT&h"
$RemotePath = "/var/www/web-page-performance-test"

function Send-File-B64 {
    param($LocalFile, $RemotePath)
    echo "📄 Sending $LocalFile (Base64)..."
    
    # Read file bytes and convert to Base64 string (single line)
    $ContentBytes = [System.IO.File]::ReadAllBytes($LocalFile)
    $B64 = [Convert]::ToBase64String($ContentBytes)
    
    # Send command: echo "B64" | base64 -d > path
    $Command = "echo '$B64' | base64 -d > $RemotePath"
    
    # Execute via plink (non-interactive)
    plink -batch -pw "$Pass" "$User@$Server" $Command
    
    if ($LASTEXITCODE -ne 0) { throw "Failed to send $LocalFile" }
}

try {
    # Send files using Base64 method
    Send-File-B64 ".\auto-sync-robust.sh" "$RemotePath/auto-sync.sh"
    Send-File-B64 ".\web-page-performance-test-sync.service" "/etc/systemd/system/web-page-performance-test-sync.service"
    Send-File-B64 ".\web-page-performance-test-sync.timer" "/etc/systemd/system/web-page-performance-test-sync.timer"

    # Configure server
    echo "⚙️ Configuring Systemd Timer on server..."
    $Commands = @(
        "chmod +x $RemotePath/auto-sync.sh",
        "crontab -l | grep -v 'auto-sync.sh' | crontab -", # Remove old cron job
        "systemctl daemon-reload",
        "systemctl enable web-page-performance-test-sync.timer",
        "systemctl start web-page-performance-test-sync.timer",
        "systemctl status web-page-performance-test-sync.timer --no-pager",
        "echo '✅ Systemd Timer Upgrade Complete!'"
    )
    $CommandStr = $Commands -join " && "

    plink -batch -pw "$Pass" "$User@$Server" $CommandStr

}
catch {
    echo "❌ Error: $_"
    exit 1
}

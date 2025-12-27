$Server = "172.16.69.219"
$User = "root"
$Pass = "Q4dv!Z`$nCe#`$OT&h"
$RemotePath = "/var/www/web-page-performance-test"

function Send-File {
    param($LocalFile, $RemotePath)
    echo "📄 Sending $LocalFile..."
    Get-Content -Raw $LocalFile | plink -batch -pw "$Pass" "$User@$Server" "cat > $RemotePath"
    if ($LASTEXITCODE -ne 0) { throw "Failed to send $LocalFile" }
}

try {
    # Copy files via plink pipe (more reliable than pscp here)
    Send-File ".\auto-sync-robust.sh" "$RemotePath/auto-sync.sh"
    Send-File ".\web-page-performance-test-sync.service" "/etc/systemd/system/web-page-performance-test-sync.service"
    Send-File ".\web-page-performance-test-sync.timer" "/etc/systemd/system/web-page-performance-test-sync.timer"

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

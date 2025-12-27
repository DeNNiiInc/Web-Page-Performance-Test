$Server = "172.16.69.219"
$User = "root"
$Pass = "Q4dv!Z`$nCe#`$OT&h"
$RemotePath = "/var/www/web-page-performance-test"

# Commands to run on server
# 1. Pull latest files
# 2. Copy Systemd units to /etc/systemd/system/
# 3. Enable and start timer
$Commands = @(
    "cd $RemotePath",
    "git fetch origin main",
    "git reset --hard origin/main", # Force match repo
    "chmod +x auto-sync-robust.sh",
    "chmod +x fix-ssh-limits.sh",
    "./fix-ssh-limits.sh", # Apply SSH limits fix first
    "cp auto-sync-robust.sh auto-sync.sh",
    "cp web-page-performance-test-sync.service /etc/systemd/system/",
    "cp web-page-performance-test-sync.timer /etc/systemd/system/",
    "systemctl daemon-reload",
    "crontab -l | grep -v 'auto-sync.sh' | crontab -",
    "systemctl enable web-page-performance-test-sync.timer",
    "systemctl restart web-page-performance-test-sync.timer",
    "systemctl list-timers --all | grep web-page",
    "echo '✅ Systemd Timer (60s) Deployed & SSH Limits Fixed!'"
)
$CommandStr = $Commands -join " && "

echo "🚀 Triggering remote deployment (Pull & Apply)..."
plink -batch -pw "$Pass" "$User@$Server" $CommandStr

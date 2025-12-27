$Server = "172.16.69.219"
$User = "root"
$Pass = "Q4dv!Z`$nCe#`$OT&h"

function Remote-Exec {
    param($Cmd)
    echo "Running: $Cmd"
    plink -batch -pw "$Pass" "$User@$Server" $Cmd
}

echo "--- 1. Checking Disk Space ---"
Remote-Exec "df -h"

echo "--- 2. Checking Node Version ---"
Remote-Exec "node -v && npm -v"

echo "--- 3. Re-installing Dependencies (Verbose) ---"
Remote-Exec "cd /var/www/web-page-performance-test && npm install --verbose"

echo "--- 4. Manual Server Start (Crash Test) ---"
# Run for 5 seconds then kill, or catch crash output
Remote-Exec "cd /var/www/web-page-performance-test && timeout 5s node server.js || echo 'Crash Detected'"

echo "--- 5. Service Status ---"
Remote-Exec "systemctl status web-page-performance-test --no-pager"

#!/bin/bash
echo "--- 🛠️ STARTING REPAIR CHECK ---"

# 1. Ensure SSH persistence (Append only if not present)
if ! grep -q "MaxStartups 100:30:200" /etc/ssh/sshd_config; then
    echo "Fixing SSH limits..."
    echo 'MaxStartups 100:30:200' >> /etc/ssh/sshd_config
    echo 'MaxSessions 100' >> /etc/ssh/sshd_config
    systemctl restart ssh
fi

cd /var/www/web-page-performance-test || { echo "❌ App directory missing"; exit 1; }

# 2. Check & Install Dependencies
echo "📦 Checking Dependencies..."
if [ ! -d "node_modules/puppeteer" ]; then
    echo "⚠️ Puppeteer missing. Installing..."
    npm install puppeteer lighthouse chrome-launcher express cors uuid socket.io --save --unsafe-perm --verbose
else
    echo "✅ Puppeteer folder exists."
    # Run a quick verify
    npm install --production --unsafe-perm
fi

# 3. Verify Chrome Dependencies (Debian Bookworm)
echo "🐧 Checking System Libs..."
MISSING_LIBS=$(dpkg -l | grep -E "libxrandr2|libgbm1|libasound2|libxss1" | wc -l)
if [ "$MISSING_LIBS" -lt 4 ]; then
    echo "⚠️ Installing missing linux deps..."
    apt-get update && apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libxss1
fi

# 4. Restart Service
echo "🔄 Restarting Service..."
systemctl restart web-page-performance-test
sleep 5

STATUS=$(systemctl is-active web-page-performance-test)
echo "Service Status: $STATUS"

if [ "$STATUS" != "active" ]; then
    echo "❌ Service failed to start. Logs:"
    journalctl -u web-page-performance-test -n 20 --no-pager
    exit 1
fi

# 5. Run Test
echo "🚀 Triggering Test..."
TEST_OUTPUT=$(curl -s -X POST -H "Content-Type: application/json" -d '{"url":"https://example.com/","isMobile":true}' http://localhost:3000/api/run-test)

echo "Response: $TEST_OUTPUT"

if echo "$TEST_OUTPUT" | grep -q "id"; then
    echo "✅ SUCCESS: Test triggered successfully!"
else
    echo "❌ FAILURE: Test API returned error."
fi

echo "--- DONE ---"

import * as chromeLauncher from 'chrome-launcher';

(async () => {
    console.log('Attempting to launch Chrome directly (ESM)...');
    const chromePath = '/usr/bin/chromium';
    console.log(`Using path: ${chromePath}`);

    try {
        const chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            chromePath: chromePath
        });
        console.log('SUCCESS: Chrome launched!');
        console.log('Port:', chrome.port);
        console.log('PID:', chrome.pid);
        
        setTimeout(async () => {
            await chrome.kill();
            console.log('Chrome killed. Exiting.');
        }, 2000);
    } catch (e) {
        console.error('FAILURE: Chrome failed to launch.');
        console.error(e);
    }
})();

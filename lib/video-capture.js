const puppeteer = require('puppeteer-core');

/**
 * Captures a high-resolution filmstrip of the page load
 * @param {string} url - The URL to capture
 * @param {number} port - Debugging port of the Chrome instance
 * @returns {Promise<Array<{data: string, timing: number}>>} - Array of frames with base64 data and timing
 */
async function captureVideo(url, port) {
    let browser;
    let page;
    const frames = [];
    
    try {
        // Connect to the existing Chrome instance launched by chrome-launcher
        // We need to fetch the WebSocket debugger URL first
        const versionUrl = `http://127.0.0.1:${port}/json/version`;
        const resp = await fetch(versionUrl);
        const versionData = await resp.json();
        const browserWSEndpoint = versionData.webSocketDebuggerUrl;

        browser = await puppeteer.connect({
            browserWSEndpoint,
            defaultViewport: { width: 1920, height: 1080 }
        });

        // Create a new page (tab) for tracking
        page = await browser.newPage();
        
        // Optimize for screenshots
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        
        // Start capturing loop
        let isCapturing = true;
        const startTime = Date.now();
        
        // Capture loop
        const captureLoop = async () => {
            while (isCapturing) {
                try {
                    if (page.isClosed()) break;
                    
                    const screenshot = await page.screenshot({ 
                        encoding: 'base64',
                        type: 'jpeg',
                        quality: 60, // Good balance for video, reduces size (1080p is large)
                        optimizeForSpeed: true
                    });
                    
                    frames.push({
                        data: 'data:image/jpeg;base64,' + screenshot,
                        timing: Date.now() - startTime
                    });
                    
                    // Cap at 100 frames (~10 seconds at 10fps) to prevent DB explosion
                    if (frames.length >= 100) break;
                    
                    // Aim for 10 FPS (100ms)
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) {
                    console.error('Frame capture error:', e);
                    break;
                }
            }
        };

        // Start capture loop NOT awaited (runs in parallel)
        const capturePromise = captureLoop();

        // Navigate
        console.log(`[Video] Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Wait a bit more for visual stability
        await new Promise(r => setTimeout(r, 1000));
        
        // Stop capturing
        isCapturing = false;
        await capturePromise;
        
        console.log(`[Video] Captured ${frames.length} frames.`);
        
        await page.close();
        browser.disconnect(); // Don't close the browser, just disconnect!
        
        return frames;

    } catch (error) {
        console.error('Video capture failed:', error);
        if (page) await page.close().catch(() => {});
        if (browser) browser.disconnect();
        return []; // Return empty on failure so test doesn't fail
    }
}

module.exports = { captureVideo };

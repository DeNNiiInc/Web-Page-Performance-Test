const runner = require('../lib/runner');
const fs = require('fs');
const path = require('path');

async function debug() {
    console.log("Starting debug test...");
    const url = "https://web-page-performance-test.beyondcloud.technology/";
    
    try {
        // Run test
        const result = await runner.runTest(url, { isMobile: false, captureFilmstrip: true });
        
        console.log("Test finished.");
        console.log("Extracted Details:", JSON.stringify(result.metrics.details, null, 2));
        
        // Also let's look at the raw LHR to see where the data actually is
        // The runner saves the report to reports/<id>.json but that's the summary.
        // It also saves <id>.html.
        // We need to inspect the raw LHR object inside runner.js, but since I can't easily modify runner.js logging without potentially breaking things or noisy output,
        // I will rely on checking the result object first.
        
        if (!result.metrics.details || !result.metrics.details.lcpElement) {
            console.error("❌ LCP Element is missing!");
        } else {
            console.log("✅ LCP Element found.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

debug();

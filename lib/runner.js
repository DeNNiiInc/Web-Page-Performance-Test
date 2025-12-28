// lighthouse, chrome-launcher, uuid are ESM only/compatible, imported dynamically
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Simple Queue Implementation to prevent concurrency crashes
class TestQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running || this.queue.length === 0) return;
    
    this.running = true;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running = false;
      this.process(); // Process next item
    }
  }
}

const runnerQueue = new TestQueue();

/**
 * Run a performance test using Lighthouse (Serialized)
 * @param {string} url - The URL to test
 * @param {object} options - Configuration options (mobile vs desktop, etc.)
 * @returns {Promise<object>} - Test results
 */
async function runTest(url, options = {}) {
  // Wrap the actual test logic in a queue task
  return runnerQueue.add(async () => {
    return _executeTest(url, options);
  });
}

/**
 * Internal function to execute the test (NOT exported directly)
 */
async function _executeTest(url, options) {
  // Dynamically import dependencies (ESM)
  const { default: lighthouse } = await import('lighthouse');
  const chromeLauncher = await import('chrome-launcher');
  const { v4: uuidv4 } = await import('uuid');

  const isMobile = options.isMobile ?? false; // Default to desktop (matches frontend)
  const captureFilmstrip = options.captureFilmstrip ?? false;
  const reportDir = path.join(__dirname, '..', 'reports');

  // Ensure reports directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

    // Launch Chrome
    console.log('Launching Chrome...');
    const chromePath = process.platform === 'linux' ? '/usr/bin/chromium' : undefined;
    
    // Use a unique user data dir to prevent profile locking issues
    const userDataDir = path.join(os.tmpdir(), `lh-profile-${uuidv4()}`);
    
    // Ensure tmp dir exists if likely to crash
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    const chrome = await chromeLauncher.launch({
        chromeFlags: [
            '--headless', 
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            `--user-data-dir=${userDataDir}` // Unique profile for this run
        ],
        chromePath: chromePath,
        port: 0 // Force random port
    });
  
  // Lighthouse Config
  const port = chrome.port;
  const config = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: isMobile ? 'mobile' : 'desktop',
      screenEmulation: isMobile 
        ? undefined // Uses default mobile emulation
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      throttling: {
        rttMs: 0,
        throughputKbps: 0,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      throttlingMethod: 'provided'
    },
    passes: [{
      passName: 'defaultPass',
      recordTrace: true, // Required for filmstrip
      useThrottling: true,
      pauseAfterFcpMs: 0,
      pauseAfterLoadMs: 0,
      networkQuietThresholdMs: 0,
      cpuQuietThresholdMs: 0,
      gatherers: []
    }]
  };
  
  if (!captureFilmstrip) {
     config.settings.skipAudits = ['screenshot-thumbnails', 'final-screenshot'];
  }

  const runnerOptions = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: port,
  };

  const testId = uuidv4();
  
  try {
    const runnerResult = await lighthouse(url, runnerOptions, config);

    // Save HTML Report
    const reportHtml = runnerResult.report;
    const reportPath = path.join(reportDir, `${testId}.html`);
    fs.writeFileSync(reportPath, reportHtml);

    // Prepare JSON Summary
    const lhr = runnerResult.lhr;
    if (!lhr) {
        throw new Error('Lighthouse failed to generate a report (no LHR).');
    }
    


    // Safe property access
    const getScore = (cat) => (lhr.categories[cat] && lhr.categories[cat].score) ? lhr.categories[cat].score * 100 : 0;
    const getMetric = (aud) => (lhr.audits[aud] && lhr.audits[aud].numericValue) ? lhr.audits[aud].numericValue : 0;

    const summary = {
      id: testId,
      url: lhr.finalUrl,
      timestamp: lhr.fetchTime,
      scores: {
        performance: getScore('performance'),
        accessibility: getScore('accessibility'),
        bestPractices: getScore('best-practices'),
        seo: getScore('seo'),
      },
      metrics: {
        lcp: getMetric('largest-contentful-paint'),
        cls: getMetric('cumulative-layout-shift'),
        tbt: getMetric('total-blocking-time'),
      },
      userAgent: lhr.userAgent,
      isMobile: isMobile,
      filmstrip: captureFilmstrip ? (lhr.audits['screenshot-thumbnails']?.details?.items || []) : []
    };

    // Save JSON Summary
    const jsonPath = path.join(reportDir, `${testId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
    
    // Parse and save HAR data for waterfall
    const harParser = require('./har-parser');
    const harData = harParser.parseHAR(lhr);
    const harPath = path.join(reportDir, `${testId}.har.json`);
    fs.writeFileSync(harPath, JSON.stringify(harData, null, 2));
    
    // Run optimization checks
    const optimizationChecker = require('./optimization-checker');
    const optimizations = optimizationChecker.analyzeOptimizations(lhr);
    const optPath = path.join(reportDir, `${testId}.optimizations.json`);
    fs.writeFileSync(optPath, JSON.stringify(optimizations, null, 2));

    // Capture High-Res Video (Run separate pass if needed or extraction)
    // We already have chrome running. Let's try to capture detailed video.
    // Note: Lighthouse has finished. We can use the browser instance for a quick video pass.
    // But ideally we want the video of the FIRST load. 
    // Since we can't easily hook into Lighthouse's run, we accept that we record a "Second Load" 
    // OR we rely on this separate pass for visual record.
    // Alternatively, if this was the only run, we use it.
    // For now, let's run a dedicated video capture pass to guarantee quality.
    let highResFrames = [];
    try {
        console.log('Starting High-Res Video Capture pass...');
        const videoCapture = require('./video-capture');
        // We reuse the running chrome instance
        highResFrames = await videoCapture.captureVideo(url, chrome.port);
    } catch (vidErr) {
        console.error('High-res video capture failed, falling back to thumbnails:', vidErr);
    }

    await chrome.kill();
    
    // Cleanup User Data Dir
    try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
        console.error('Failed to cleanup temp profile:', e);
    }

    // Use High-Res frames if available, otherwise fallback to Lighthouse thumbnails
    const filmstripData = (highResFrames && highResFrames.length > 5) ? highResFrames : (lhr.audits['screenshot-thumbnails']?.details?.items || []);

    const summary = {
      id: testId,
      url: lhr.finalUrl,
      timestamp: lhr.fetchTime,
      scores: {
        performance: getScore('performance'),
        accessibility: getScore('accessibility'),
        bestPractices: getScore('best-practices'),
        seo: getScore('seo'),
      },
      metrics: {
        lcp: getMetric('largest-contentful-paint'),
        cls: getMetric('cumulative-layout-shift'),
        tbt: getMetric('total-blocking-time'),
      },
      userAgent: lhr.userAgent,
      isMobile: isMobile,
      filmstrip: filmstripData
    };
    
    // Update summary file with new filmstrip
    const jsonPath = path.join(reportDir, `${testId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

    // Prepare Database Insert
    const insertQuery = `
      INSERT INTO test_results (
        id, url, user_uuid, user_ip, is_mobile, 
        scores, metrics, filmstrip, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id
    `;
    
    const values = [
      testId, 
      lhr.finalUrl, 
      options.userUuid || null,
      options.userIp || null,
      isMobile,
      summary.scores,
      summary.metrics,
      filmstripData
    ];

    try {
      console.log('📝 Attempting DB Insert for Test:', testId);
      console.log('👤 User UUID:', options.userUuid);
      const db = require('../lib/db');
      await db.pool.query(insertQuery, values);
      console.log('✅ DB Insert Success!');
    } catch (dbErr) {
      console.error('❌ Failed to save result to DB:', dbErr);
      // Don't fail the whole test if DB save fails, just log it
    }

    return summary;

  } catch (error) {
    if (chrome) await chrome.kill();
    // Try cleanup again in error case
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}
    throw error;
  }
}

/**
 * Get list of all test results (Scoped to User)
 * @param {string} userUuid - User's UUID from client
 * @param {string} userIp - User's IP address
 */
async function getHistory(userUuid, userIp) {
  const db = require('../lib/db');
  
  // If no identifiers provided, return empty
  if (!userUuid && !userIp) return [];

  try {
    let query;
    let params;

    // Prioritize UUID if available and valid
    if (userUuid && userUuid !== 'anonymous') {
        query = `
          SELECT * FROM test_results 
          WHERE user_uuid = $1 
          ORDER BY timestamp DESC 
          LIMIT 50
        `;
        params = [userUuid];
    } else {
        // Fallback to IP if strictly anonymous
        query = `
          SELECT * FROM test_results 
          WHERE user_ip = $1 
          ORDER BY timestamp DESC 
          LIMIT 50
        `;
        params = [userIp];
    }

    const res = await db.pool.query(query, params);
    
    // Convert DB rows back to simplified history objects
    return res.rows.map(row => ({
      id: row.id,
      url: row.url,
      timestamp: row.timestamp, // JS Date
      isMobile: row.is_mobile,
      scores: row.scores,
      metrics: row.metrics,
      filmstrip: row.filmstrip || [] // Return filmstrip if available
    }));
  } catch (err) {
    console.error('Error fetching history from DB:', err);
    return [];
  }
}

// Helper to generate distinct test IDs
function generateTestId() {
  return crypto.randomUUID();
}

// Need os for tmpdir
const os = require('os');

module.exports = {
  runTest,
  getHistory,
  generateTestId
};

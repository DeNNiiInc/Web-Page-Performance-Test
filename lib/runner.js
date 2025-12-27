// lighthouse, chrome-launcher, uuid are ESM only/compatible, imported dynamically
const fs = require('fs');
const path = require('path');

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
  };

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
    const summary = {
      id: testId,
      url: lhr.finalUrl,
      timestamp: lhr.fetchTime,
      scores: {
        performance: lhr.categories.performance.score * 100,
        accessibility: lhr.categories.accessibility.score * 100,
        bestPractices: lhr.categories['best-practices'].score * 100,
        seo: lhr.categories.seo.score * 100,
      },
      metrics: {
        lcp: lhr.audits['largest-contentful-paint'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue,
        tbt: lhr.audits['total-blocking-time'].numericValue,
      },
      userAgent: lhr.userAgent,
      isMobile: isMobile
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

    await chrome.kill();
    
    // Cleanup User Data Dir
    try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (e) {
        console.error('Failed to cleanup temp profile:', e);
    }

    // Insert into Database
    // We expect user_uuid and user_ip to be passed in options, or handle gracefully if not
    const userUuid = options.userUuid || 'anonymous';
    const userIp = options.userIp || '0.0.0.0';

    const insertQuery = `
      INSERT INTO test_results (id, url, timestamp, is_mobile, scores, metrics, user_uuid, user_ip)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const values = [
      testId,
      summary.url,
      summary.timestamp,
      isMobile,
      summary.scores,
      summary.metrics,
      userUuid,
      userIp
    ];

    try {
      const db = require('../lib/db');
      await db.pool.query(insertQuery, values);
    } catch (dbErr) {
      console.error('Failed to save result to DB:', dbErr);
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
      metrics: row.metrics
    }));
  } catch (err) {
    console.error('Error fetching history from DB:', err);
    return [];
  }
}

// Need os for tmpdir
const os = require('os');

module.exports = {
  runTest,
  getHistory
};

// lighthouse, chrome-launcher, uuid are ESM only/compatible, imported dynamically
const fs = require('fs');
const path = require('path');

/**
 * Run a performance test using Lighthouse
 * @param {string} url - The URL to test
 * @param {object} options - Configuration options (mobile vs desktop, etc.)
 * @returns {Promise<object>} - Test results
 */
async function runTest(url, options = {}) {
  // Dynamically import dependencies (ESM)
  const { default: lighthouse } = await import('lighthouse');
  const { default: chromeLauncher } = await import('chrome-launcher');
  const { v4: uuidv4 } = await import('uuid');

  const isMobile = options.isMobile ?? true; // Default to mobile
  const reportDir = path.join(__dirname, '..', 'reports');

  // Ensure reports directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

    // Launch Chrome
    console.log('Launching Chrome...');
    const chromePath = process.platform === 'linux' ? '/usr/bin/chromium' : undefined;
    const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        chromePath: chromePath
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

    await chrome.kill();

    return summary;

  } catch (error) {
    if (chrome) await chrome.kill();
    throw error;
  }
}

/**
 * Get list of all test results
 */
function getHistory() {
  const reportDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportDir)) return [];

  const files = fs.readdirSync(reportDir).filter(f => f.endsWith('.json'));
  const history = files.map(file => {
    try {
      return JSON.parse(fs.readFileSync(path.join(reportDir, file), 'utf8'));
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  // Sort by newest first
  return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  runTest,
  getHistory
};

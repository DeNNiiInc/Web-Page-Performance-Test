const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const runner = require("./lib/runner");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// API Endpoint: Git Info
app.get("/api/git-info", (req, res) => {
  exec('/usr/bin/git log -1 --format="%H|%cr"', (error, stdout, stderr) => {
    if (error) {
      console.error("Error getting git info:", error);
      console.error("Stderr:", stderr);
      return res.json({
        commitId: "unknown",
        commitAge: "dev mode",
        error: true,
        details: error.message
      });
    }

    const [commitId, commitAge] = stdout.trim().split("|");
    res.json({
      commitId: commitId.substring(0, 7),
      commitAge: commitAge,
      error: false,
    });
  });
});

// API Endpoint: Run Test (supports multi-run)
app.post("/api/run-test", async (req, res) => {
  const { url, isMobile, runs = 1, captureFilmstrip = false } = req.body;
  const userUuid = req.headers['x-user-uuid'];
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!url) return res.status(400).json({ error: "URL is required" });
  
  // Validate run count
  if (runs < 1 || runs > 10) {
    return res.status(400).json({ error: "Runs must be between 1 and 10" });
  }

  try {
    // Single run (original behavior)
    if (runs === 1) {
      const result = await runner.runTest(url, { isMobile, userUuid, userIp, captureFilmstrip });
      return res.json(result);
    }
    
    // Multi-run
    const multiRun = require('./lib/multi-run');
    const suiteId = runner.generateTestId();
    
    // Create suite record
    await multiRun.createSuite(suiteId, userUuid, url, isMobile ? 'mobile' : 'desktop', runs, captureFilmstrip);
    
    // Return suite ID immediately
    res.json({ suiteId, runs, status: 'running' });
    
    // Execute runs asynchronously
    multiRun.executeMultipleRuns(suiteId, url, isMobile, runs, userUuid, userIp, captureFilmstrip)
      .catch(error => console.error('Multi-run execution failed:', error));
      
  } catch (error) {
    console.error("Test failed:", error);
    res.status(500).json({ error: "Test failed", details: error.message });
  }
});

// API Endpoint: Suite Status (for multi-run progress tracking)
app.get("/api/suite-status/:suiteId", async (req, res) => {
  try {
    const multiRun = require('./lib/multi-run');
    const suite = await multiRun.getSuiteStatus(req.params.suiteId);
    
    if (!suite) {
      return res.status(404).json({ error: "Suite not found" });
    }
    
    res.json(suite);
  } catch (error) {
    console.error("Suite status error:", error);
    res.status(500).json({ error: "Failed to get suite status" });
  }
});

// API Endpoint: History
app.get("/api/history", async (req, res) => {
  const userUuid = req.headers['x-user-uuid'];
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  const history = await runner.getHistory(userUuid, userIp);
  res.json(history);
});

// API Endpoint: Export HAR
app.get("/api/export/:testId/har", (req, res) => {
  const { testId } = req.params;
  const harPath = path.join(__dirname, 'reports', `${testId}.har.json`);
  
  if (!fs.existsSync(harPath)) {
    return res.status(404).json({ error: "HAR file not found" });
  }
  
  res.download(harPath, `test-${testId}.har`, (err) => {
    if (err) console.error("Download error:", err);
  });
});

// API Endpoint: Export CSV
app.get("/api/export/:testId/csv", (req, res) => {
  const { testId } = req.params;
  const jsonPath = path.join(__dirname, 'reports', `${testId}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Test results not found" });
  }
  
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const csv = `URL,Timestamp,Device,Performance,Accessibility,Best Practices,SEO,LCP,CLS,TBT
${data.url},${data.timestamp},${data.isMobile ? 'Mobile' : 'Desktop'},${data.scores.performance},${data.scores.accessibility},${data.scores.bestPractices},${data.scores.seo},${data.metrics.lcp},${data.metrics.cls},${data.metrics.tbt}`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="test-${testId}.csv"`);
  res.send(csv);
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

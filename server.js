const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const runner = require("./lib/runner");
const { traceAndLocate } = require("./lib/diagnostics/traceroute");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// API Endpoint: Git Info
app.get("/api/git-info", (req, res) => {
  exec('git log -1 --format="%H|%cr"', (error, stdout, stderr) => {
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

// API Endpoint: Run Test
app.post("/api/run-test", async (req, res) => {
  const { url, isMobile, captureFilmstrip = false } = req.body;
  const userUuid = req.headers['x-user-uuid'];
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const result = await runner.runTest(url, { isMobile, userUuid, userIp, captureFilmstrip });
    return res.json(result);
  } catch (error) {
    console.error("Test failed:", error);
    res.status(500).json({ error: "Test failed", details: error.message });
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

// API Endpoint: Traceroute
// API Endpoint: Traceroute
app.post("/api/traceroute", async (req, res) => {
  const { host } = req.body;
  if (!host) return res.status(400).json({ error: "Host required" });

  try {
    const { raw, hops } = await traceAndLocate(host);
    res.json({ output: raw, hops });
  } catch (error) {
    console.error("Traceroute error:", error);
    res.status(500).json({ error: "Traceroute failed", details: error.message });
  }
});

// API Endpoint: Compare Videos
app.get("/api/compare", async (req, res) => {
    const { test1, test2 } = req.query;
    if (!test1 || !test2) return res.status(400).send("Missing test IDs");

    const reportDir = path.join(__dirname, 'reports');
    
    // Helper to get frames
    const getFrames = (id) => {
        const p = path.join(reportDir, `${id}.json`);
        if (!fs.existsSync(p)) return null;
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        return data.filmstrip;
    };

    try {
        const frames1 = getFrames(test1);
        const frames2 = getFrames(test2);

        if (!frames1 || !frames2) return res.status(404).send("Test results not found or missing filmstrip");

        // Dynamically import generator and stitcher
        const { createVideoFromFrames } = require('./lib/comparison/video-generator');
        const { stitchVideos } = require('./lib/comparison/stitcher');

        // Generate individual videos
        // We assume 10 FPS as per capture logic
        const [video1, video2] = await Promise.all([
            createVideoFromFrames(frames1, 10),
            createVideoFromFrames(frames2, 10)
        ]);

        // Stitch them
        const outputFilename = `comparison-${test1}-${test2}.mp4`;
        const outputPath = path.join(reportDir, outputFilename);
        
        await stitchVideos(video1, video2, outputPath);

        // Cleanup temp individual videos
        try { fs.unlinkSync(video1); fs.unlinkSync(video2); } catch(e) {}

        // Stream output
        res.setHeader('Content-Type', 'video/mp4');
        const stream = fs.createReadStream(outputPath);
        stream.pipe(res);

        // Optional: Cleanup comparison file after streaming? 
        // Or keep it cached. For now, keep it.
    } catch (err) {
        console.error("Comparison error:", err);
        res.status(500).send("Comparison failed");
    }
});

// API Endpoint: Bulk Test
app.post("/api/bulk-test", async (req, res) => {
    const { urls, isMobile, runCount = 1 } = req.body;
    if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: "URLs array required" });

    // Mock response - in real world would queue these
    // For now, we'll just acknowledge receipt. To implement fully requires a job queue.
    // Let's implement a simple "Sequence" runner on the backend? No, that might timeout.
    // Better to let frontend orchestrate or return a "Batch ID".
    
    // We will assume frontend orchestration for simplicity in this Node.js (non-queue) env
    res.json({ message: "Bulk test ready", count: urls.length });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

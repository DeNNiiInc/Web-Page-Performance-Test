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

// API Endpoint: Run Test
app.post("/api/run-test", async (req, res) => {
  const { url, isMobile } = req.body;
  const userUuid = req.headers['x-user-uuid'];
  // Use header for IP if behind proxy, fallback to socket address
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const result = await runner.runTest(url, { isMobile, userUuid, userIp });
    res.json(result);
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

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

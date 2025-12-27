const express = require("express");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get Git commit info
app.get("/api/git-info", (req, res) => {
  exec('git log -1 --format="%H|%cr"', (error, stdout, stderr) => {
    if (error) {
      console.error("Error getting git info:", error);
      return res.json({
        commitId: "unknown",
        commitAge: "unknown",
        error: true,
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

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});

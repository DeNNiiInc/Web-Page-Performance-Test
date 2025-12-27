# Web Page Performance Test

![Desktop Results](docs/images/desktop_results.png)

A modern, high-performance web analytics tool that allows users to run Google Lighthouse audits on any website. Built with Node.js, Express, and a custom-tuned Chrome instance for accurate, reproducible results.

**🚀 Live Demo**: [https://web-page-performance-test.beyondcloud.technology/](https://web-page-performance-test.beyondcloud.technology/)

---

## 📱 Mobile Friendly & Responsive

Designed with a mobile-first approach, ensuring a seamless experience across all devices.

<div align="center">
  <img src="docs/images/mobile_dashboard.png" width="375" alt="Mobile Dashboard View">
</div>

---

## ✨ Essential Features

*   **⚡ Core Web Vitals Analysis**: Comprehensive breakdown of LCP, CLS, and TBT metrics.
*   **📱 Multi-Device Emulation**: Toggle between Desktop (1920x1080) and Mobile (Moto G4) emulation modes.
*   **🔒 User Isolation & Privacy**:
    *   Test history is strictly isolated per user via client-side UUIDs.
    *   No shared history between different users.
*   **🚀 Concurrency Queue System**:
    *   Intelligent backend queue prevents server overload.
    *   Supports simultaneous users without crashing (FIFO processing).
*   **💾 Persistent History**: Automatically saves your recent test runs using a PostgreSQL database.
*   **📊 Detailed Reports**: Generates full HTML Lighthouse reports and JSON summaries.
*   **📸 Visual Filmstrip**: Captures frame-by-frame screenshots of the page load experience.

## 🛠️ Tech Stack

*   **Frontend**: Vanilla HTML/CSS/JS (No framework overhead).
*   **Backend**: Node.js, Express.
*   **Engine**: Google Lighthouse, Chrome Launcher, Puppeteer.
*   **Database**: PostgreSQL.
*   **Deployment**: Automated GitHub Actions-style deployment via SSH.

## 🚀 Getting Started

### Prerequisites
*   Node.js v20+
*   Chromium / Google Chrome installed
*   PostgreSQL

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/DeNNiiInc/Web-Page-Performance-Test.git
    cd Web-Page-Performance-Test
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the server:
    ```bash
    npm start
    ```
    The application will run on `http://localhost:3000`.

---
*Developed and maintained by Beyond Cloud Technology.*

const { exec } = require('child_process');
const dns = require('dns');

/**
 * Executes a traceroute to the specified host.
 * @param {string} host - The hostname or IP to trace.
 * @returns {Promise<string>} - The raw stdout output of the traceroute command.
 */
function runTraceroute(host) {
  return new Promise((resolve, reject) => {
    // Basic validation to prevent command injection
    if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
        return reject(new Error('Invalid hostname format.'));
    }

    // Resolve domain to ensure it exists before running system command (optional safety)
    dns.lookup(host, (err) => {
        if (err) return reject(new Error(`Could not resolve host: ${host}`));

        // Detect platform
        const isWin = process.platform === 'win32';
        const command = isWin ? `tracert -d -h 20 ${host}` : `traceroute -n -m 20 ${host}`;

        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
                // Traceroute might return error code if it doesn't reach dest, but stdout is valuable
                if (stdout) resolve(stdout);
                else reject(error || stderr);
            } else {
                resolve(stdout);
            }
        });
    });
  });
}

const geoip = require('geoip-lite');

/**
 * Parses traceroute output and adds geolocation data.
 * @param {string} output - Raw traceroute output.
 * @returns {Array} - Array of hop objects with IP, RTT, and Location.
 */
function parseAndLocate(output) {
    const lines = output.split('\n');
    const hops = [];
    
    // Regex to match lines like: " 1  192.168.1.1  2.5 ms"
    // Linux: 1  _gateway (10.0.2.2)  0.224 ms  0.180 ms  0.120 ms
    // Windows:  1    <1 ms    <1 ms    <1 ms  192.168.1.1
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;

    lines.forEach(line => {
        const match = line.match(ipRegex);
        if (match) {
            const ip = match[0];
            const geo = geoip.lookup(ip);
            
            hops.push({
                raw: line.trim(),
                ip: ip,
                lat: geo ? geo.ll[0] : null,
                lon: geo ? geo.ll[1] : null,
                city: geo ? geo.city : null,
                country: geo ? geo.country : null
            });
        }
    });
    return hops;
}

/**
 * Executes traceroute and returns structured data.
 */
async function traceAndLocate(host) {
    const rawOutput = await runTraceroute(host);
    const hops = parseAndLocate(rawOutput);
    return { raw: rawOutput, hops };
}

module.exports = { runTraceroute, traceAndLocate };

const https = require('https');

const URL = 'https://web-page-performance-test.beyondcloud.technology/api/run-test';
const TEST_TARGET = 'https://example.com';

function startTest(id) {
  return new Promise((resolve, reject) => {
    console.log(`[${id}] Starting test...`);
    const data = JSON.stringify({
      url: TEST_TARGET,
      isMobile: true
    });

    const req = https.request(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-user-uuid': `stress-test-${id}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`[${id}] Success! Status: ${res.statusCode}`);
          resolve(true);
        } else {
          console.error(`[${id}] Failed! Status: ${res.statusCode}`);
          // console.error(`[${id}] Body: ${body}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[${id}] Error: ${e.message}`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Sending 2 concurrent requests...');
  const results = await Promise.all([
    startTest('A'),
    startTest('B')
  ]);
  
  if (results.every(r => r)) {
    console.log('PASS: Both tests succeeded.');
  } else {
    console.log('FAIL: At least one test failed.');
  }
}

run();

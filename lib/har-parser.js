/**
 * HAR Parser - Extract network request data from Lighthouse results
 * Provides timing, size, and metadata for waterfall visualization
 */

/**
 * Parse Lighthouse result and generate HAR-compatible data
 * @param {object} lighthouseResult - Full Lighthouse result object
 * @returns {object} HAR data structure
 */
function parseHAR(lighthouseResult) {
  const audits = lighthouseResult.audits;
  const networkRequests = audits['network-requests']?.details?.items || [];
  
  const entries = networkRequests.map((request, index) => {
    const timing = calculateTiming(request);
    
    return {
      requestId: index + 1,
      url: request.url,
      method: request.requestMethod || 'GET',
      status: request.statusCode,
      mimeType: request.mimeType || request.resourceType,
      resourceType: request.resourceType,
      protocol: request.protocol,
      priority: request.priority,
      
      // Connection/Socket information for connection view
      socket: request.connectionId || request.socket || null,
      connectionReused: request.connectionReused || false,
      
      // Timing breakdown (in milliseconds)
      timing: {
        dns: timing.dns,
        connect: timing.connect,
        ssl: timing.ssl,
        send: timing.send,
        wait: timing.wait,
        receive: timing.receive,
        total: timing.total,
        startTime: request.startTime,
        endTime: request.endTime
      },
      
      // Size information (in bytes)
      size: {
        transferSize: request.transferSize || 0,
        resourceSize: request.resourceSize || 0,
        compressionRatio: request.resourceSize > 0 
          ? (request.transferSize / request.resourceSize).toFixed(2)
          : 1
      },
      
      // Additional metadata
      isSecure: request.url?.startsWith('https://'),
      domain: extractDomain(request.url),
      isThirdParty: checkIfThirdParty(request.url, lighthouseResult.finalUrl),
      renderBlocking: request.renderBlocking === 'blocking',
      
      // HTTP Headers
      requestHeaders: request.requestHeaders || {},
      responseHeaders: request.responseHeaders || {},
      
      // Extracted from response headers if available
      cacheControl: request.responseHeaders?.['cache-control'],
      contentEncoding: request.responseHeaders?.['content-encoding']
    };
  });
  
  return {
    entries,
    summary: calculateSummary(entries),
    pageMetrics: extractPageMetrics(lighthouseResult)
  };
}

/**
 * Calculate timing breakdown for a single request
 */
function calculateTiming(request) {
  const start = request.startTime || 0;
  const end = request.endTime || start;
  const total = (end - start) * 1000; // Convert to ms
  
  // Parse timing object if available
  const timing = request.timing || {};
  
  return {
    dns: timing.dnsEnd >= 0 ? (timing.dnsEnd - timing.dnsStart) : -1,
    connect: timing.connectEnd >= 0 ? (timing.connectEnd - timing.connectStart) : -1,
    ssl: timing.sslEnd >= 0 ? (timing.sslEnd - timing.sslStart) : -1,
    send: timing.sendEnd >= 0 ? (timing.sendEnd - timing.sendStart) : -1,
    wait: timing.receiveHeadersEnd >= 0 ? (timing.receiveHeadersEnd - timing.sendEnd) : -1,
    receive: -1, // Calculated from total - (dns + connect + ssl + send + wait)
    total: total > 0 ? total : (request.networkEndTime - request.networkRequestTime) * 1000 || 0,
    startTime: start,
    endTime: end
  };
}

/**
 * Calculate summary statistics
 */
function calculateSummary(entries) {
  const byType = {};
  let totalSize = 0;
  let totalTransfer = 0;
  
  entries.forEach(entry => {
    const type = entry.resourceType || 'Other';
    
    if (!byType[type]) {
      byType[type] = { count: 0, size: 0, transfer: 0 };
    }
    
    byType[type].count++;
    byType[type].size += entry.size.resourceSize;
    byType[type].transfer += entry.size.transferSize;
    
    totalSize += entry.size.resourceSize;
    totalTransfer += entry.size.transferSize;
  });
  
  return {
    totalRequests: entries.length,
    totalSize,
    totalTransfer,
    byType,
    compressionSavings: totalSize > 0 ? ((totalSize - totalTransfer) / totalSize * 100).toFixed(1) : 0
  };
}

/**
 * Extract key page metrics from Lighthouse
 */
function extractPageMetrics(lighthouseResult) {
  const audits = lighthouseResult.audits;
  
  return {
    firstContentfulPaint: audits['first-contentful-paint']?.numericValue,
    largestContentfulPaint: audits['largest-contentful-paint']?.numericValue,
    cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue,
    totalBlockingTime: audits['total-blocking-time']?.numericValue,
    speedIndex: audits['speed-index']?.numericValue,
    timeToInteractive: audits['interactive']?.numericValue,
    domContentLoaded: lighthouseResult.audits['metrics']?.details?.items?.[0]?.observedDomContentLoaded,
    loadEventEnd: lighthouseResult.audits['metrics']?.details?.items?.[0]?.observedLoad
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Check if request is third-party
 */
function checkIfThirdParty(requestUrl, pageUrl) {
  const requestDomain = extractDomain(requestUrl);
  const pageDomain = extractDomain(pageUrl);
  return requestDomain !== pageDomain;
}

/**
 * Group entries by domain
 */
function groupByDomain(entries) {
  const domains = {};
  
  entries.forEach(entry => {
    const domain = entry.domain;
    if (!domains[domain]) {
      domains[domain] = {
        count: 0,
        size: 0,
        transfer: 0,
        requests: []
      };
    }
    
    domains[domain].count++;
    domains[domain].size += entry.size.resourceSize;
    domains[domain].transfer += entry.size.transferSize;
    domains[domain].requests.push(entry.requestId);
  });
  
  // Sort by transfer size (descending)
  return Object.entries(domains)
    .sort((a, b) => b[1].transfer - a[1].transfer)
    .reduce((acc, [domain, data]) => {
      acc[domain] = data;
      return acc;
    }, {});
}

module.exports = {
  parseHAR,
  calculateTiming,
  calculateSummary,
  groupByDomain
};

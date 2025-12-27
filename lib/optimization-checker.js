/**
 * Optimization Checker
 * Analyzes Lighthouse results and provides actionable recommendations
 */

function analyzeOptimizations(lighthouseResult) {
    const audits = lighthouseResult.audits;
    const checks = [];
    
    // 1. Image Optimization
    const unoptimizedImages = audits['uses-optimized-images'];
    if (unoptimizedImages && unoptimizedImages.score < 1) {
        checks.push({
            category: 'Images',
            status: 'warning',
            title: 'Unoptimized Images Detected',
            description: `${unoptimizedImages.details?.items?.length || 0} images could be optimized`,
            savings: unoptimizedImages.numericValue || 0,
            impact: 'high'
        });
    }
    
    // 2. Text Compression
    const textCompression = audits['uses-text-compression'];
    if (textCompression && textCompression.score < 1) {
        checks.push({
            category: 'Compression',
            status: 'warning',
            title: 'Enable Text Compression',
            description: 'Text resources not served with compression (gzip/brotli)',
            savings: textCompression.numericValue || 0,
            impact: 'medium'
        });
    }
    
    // 3. Cache Policy
    const cachePolicy = audits['uses-long-cache-ttl'];
    if (cachePolicy && cachePolicy.score < 0.9) {
        checks.push({
            category: 'Caching',
            status: 'info',
            title: 'Serve Static Assets with Efficient Cache Policy',
            description: `${cachePolicy.details?.items?.length || 0} resources have low cache TTL`,
            savings: cachePolicy.numericValue || 0,
            impact: 'medium'
        });
    }
    
    // 4. Render-Blocking Resources
    const renderBlocking = audits['render-blocking-resources'];
    if (renderBlocking && renderBlocking.score < 1) {
        checks.push({
            category: 'Performance',
            status: 'error',
            title: 'Eliminate Render-Blocking Resources',
            description: `${renderBlocking.details?.items?.length || 0} render-blocking  resources found`,
            savings: renderBlocking.numericValue || 0,
            impact: 'high'
        });
    }
    
    // 5. Unused JavaScript
    const unusedJS = audits['unused-javascript'];
    if (unusedJS && unusedJS.score < 0.9) {
        checks.push({
            category: 'JavaScript',
            status: 'warning',
            title: 'Reduce Unused JavaScript',
            description: 'Defer or remove unused JS code',
            savings: unusedJS.numericValue || 0,
            impact: 'high'
        });
    }
    
    // 6. Unused CSS
    const unusedCSS = audits['unused-css-rules'];
    if (unusedCSS && unusedCSS.score < 0.9) {
        checks.push({
            category: 'CSS',
            status: 'warning',
            title: 'Remove Unused CSS',
            description: 'Defer or remove unused CSS rules',
            savings: unusedCSS.numericValue || 0,
            impact: 'medium'
        });
    }
    
    // 7. HTTP/2
    const http2 = audits['uses-http2'];
    if (http2 && http2.score < 1) {
        checks.push({
            category: 'Protocol',
            status: 'info',
            title: 'Use HTTP/2',
            description: 'Serve resources over HTTP/2 for better performance',
            impact: 'medium'
        });
    }
    
    // 8. Minification
    const minifyCSS = audits['unminified-css'];
    const minifyJS = audits['unminified-javascript'];
    if ((minifyCSS && minifyCSS.score < 1) || (minifyJS && minifyJS.score < 1)) {
        checks.push({
            category: 'Minification',
            status: 'warning',
            title: 'Minify CSS and JavaScript',
            description: 'Minify code to reduce file sizes',
            savings: (minifyCSS?.numericValue || 0) + (minifyJS?.numericValue || 0),
            impact: 'medium'
        });
    }
    
    // Calculate overall optimization score
    const totalChecks = 8;
    const passed = checks.filter(c => c.status === 'success').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    const errors = checks.filter(c => c.status === 'error').length;
    
    return {
        checks,
        summary: {
            totalChecks,
            passed: totalChecks - checks.length,
            warnings,
            errors,
            score: Math.round(((totalChecks - checks.length) / totalChecks) * 100)
        }
    };
}

module.exports = {
    analyzeOptimizations
};

/**
 * Images Gallery - Display all loaded images with optimization analysis
 */

async function init() {
    const params = new URLSearchParams(window.location.search);
    const testId = params.get('id');
    
    if (!testId) {
        document.getElementById('imagesGrid').innerHTML = 
            '<p style="color: red;">Error: No test ID provided</p>';
        return;
    }
    
    try {
        const response = await fetch(`/reports/${testId}.har.json`);
        if (!response.ok) throw new Error('HAR data not found');
        
        const harData = await response.json();
        renderImageGallery(harData);
    } catch (error) {
        document.getElementById('imagesGrid').innerHTML = 
            `<p style="color: red;">Error loading images: ${error.message}</p>`;
    }
}

function renderImageGallery(harData) {
    // Filter for image requests
    const images = harData.entries.filter(entry => 
        entry.resourceType === 'Image' || 
        entry.mimeType?.startsWith('image/') ||
        entry.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)($|\?)/i)
    );
    
    if (images.length === 0) {
        document.getElementById('imagesGrid').innerHTML = 
            '<p>No images found in this page load.</p>';
        return;
    }
    
    // Calculate summary stats
    const totalSize = images.reduce((sum, img) => sum + img.size.transferSize, 0);
    const unoptimized = images.filter(img => analyzeOptimization(img).level === 'error').length;
    const avgSize = totalSize / images.length;
    
    // Render summary
    document.getElementById('summaryStats').innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${images.length}</div>
            <div class="stat-label">Total Images</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${formatBytes(totalSize)}</div>
            <div class="stat-label">Total Size</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${formatBytes(avgSize)}</div>
            <div class="stat-label">Average Size</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${unoptimized}</div>
            <div class="stat-label">Needs Optimization</div>
        </div>
    `;
    
    // Render image cards
    let html = '';
    images.forEach(image => {
        const optimization = analyzeOptimization(image);
        const filename = extractFilename(image.url);
        const format = getImageFormat(image);
        
        html += `
            <div class="image-card">
                <div class="image-preview">
                    <img src="${image.url}" alt="${filename}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="image-icon" style="display: none;">🖼️</div>
                </div>
                <div class="image-info">
                    <div class="image-url" title="${image.url}">${filename}</div>
                    <div class="image-details">
                        <div class="detail-item">
                            <span class="detail-label">Format</span>
                            <span class="detail-value">${format}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Size</span>
                            <span class="detail-value">${formatBytes(image.size.transferSize)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Compression</span>
                            <span class="detail-value">${(image.size.compressionRatio * 100).toFixed(0)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Load Time</span>
                            <span class="detail-value">${image.timing.total.toFixed(0)}ms</span>
                        </div>
                    </div>
                    <div class="optimization-badge badge-${optimization.level}">
                        ${optimization.message}
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('imagesGrid').innerHTML = html;
}

function analyzeOptimization(image) {
    const size = image.size.transferSize;
    const format = getImageFormat(image);
    
    // Check if modern format (WebP, AVIF)
    if (format === 'WebP' || format === 'AVIF') {
        return { level: 'good', message: '✓ Modern format' };
    }
    
    // Check size thresholds
    if (size > 500 * 1024) { // > 500KB
        return { level: 'error', message: '⚠️ Very large - optimize!' };
    }
    
    if (size > 200 * 1024) { // > 200KB
        return { level: 'warning', message: '⚠️ Could be smaller' };
    }
    
    // Check if SVG (good for icons/logos)
    if (format === 'SVG') {
        return { level: 'good', message: '✓ Vector (scalable)' };
    }
    
    return { level: 'good', message: '✓ Optimized' };
}

function getImageFormat(image) {
    const url = image.url.toLowerCase();
    const mime = image.mimeType?.toLowerCase();
    
    if (mime?.includes('webp') || url.includes('.webp')) return 'WebP';
    if (mime?.includes('avif') || url.includes('.avif')) return 'AVIF';
    if (mime?.includes('svg') || url.includes('.svg')) return 'SVG';
    if (mime?.includes('png') || url.includes('.png')) return 'PNG';
    if (mime?.includes('gif') || url.includes('.gif')) return 'GIF';
    if (mime?.includes('jpeg') || mime?.includes('jpg') || url.match(/\.jpe?g/)) return 'JPEG';
    if (url.includes('.ico')) return 'ICO';
    if (url.includes('.bmp')) return 'BMP';
    
    return 'Unknown';
}

function extractFilename(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || pathname;
        return filename.length > 40 ? filename.substring(0, 37) + '...' : filename;
    } catch {
        return url.substring(0, 40) + '...';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

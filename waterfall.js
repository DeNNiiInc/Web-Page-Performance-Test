/**
 * Waterfall Chart Renderer
 * Visualizes network requests timeline with interactive details
 */

let currentHarData = null;
let currentFilter = 'all';
let currentSort = 'time-desc'; // Default: slowest to fastest

// Load HAR data from URL parameter
async function init() {
    const params = new URLSearchParams(window.location.search);
    const testId = params.get('id');
    
    if (!testId) {
        document.getElementById('waterfallCanvas').innerHTML = 
            '<p style="color: red;">Error: No test ID provided</p>';
        return;
    }
    
    try {
        const response = await fetch(`/reports/${testId}.har.json`);
        if (!response.ok) throw new Error('HAR data not found');
        
        currentHarData = await response.json();
        renderWaterfall();
        setupEventListeners();
    } catch (error) {
        document.getElementById('waterfallCanvas').innerHTML = 
            `<p style="color: red;">Error loading waterfall data: ${error.message}</p>`;
    }
}

function renderWaterfall() {
    const canvas = document.getElementById('waterfallCanvas');
    const entries = currentHarData.entries;
    
    if (!entries || entries.length === 0) {
        canvas.innerHTML = '<p>No requests found</p>';
        return;
    }
    
    // Calculate timeline scale
    const maxTime = Math.max(...entries.map(e => e.timing.endTime));
    const scale = 1000 / maxTime; // pixels per second
    
    // Filter entries based on active filter
    const filteredEntries = currentFilter === 'all' 
        ? entries 
        : entries.filter(e => e.resourceType === currentFilter);
    
    // Sort entries based on current sort
    sortEntries(filteredEntries);
    
    let html = '';
    
    // Add time scale header with grid lines
    html += '<div class="waterfall-timescale">';
    for (let sec = 0; sec <= Math.ceil(maxTime); sec++) {
        const pos = sec * scale;
        html += `<div class="time-marker" style="left: ${300 + pos}px">${sec}s</div>`;
        html += `<div class="grid-line" style="left: ${300 + pos}px"></div>`;
    }
    html += '</div>';
    
    filteredEntries.forEach((entry, index) => {
        const label = truncateUrl(entry.url, 30);
        const timingBars = renderTimingBars(entry.timing, scale);
        const statusColor = getStatusColor(entry.status);
        const typeBadge = getResourceTypeBadge(entry.resourceType);
        const sizeKB = (entry.size.transferSize / 1024).toFixed(1);
        const timeMS = entry.timing.total.toFixed(0);
        
        html += `
            <div class="waterfall-row" data-request-id="${entry.requestId}">
                <div class="request-number">${entry.requestId}</div>
                <div class="status-badge" style="background: ${statusColor}">${entry.status}</div>
                <div class="type-badge">${typeBadge}</div>
                <div class="request-label" title="${entry.url}">${label}</div>
                <div class="timeline">${timingBars}</div>
                <div class="request-size">${sizeKB} KB</div>
                <div class="request-time">${timeMS} ms</div>
            </div>
        `;
    });
    
    canvas.innerHTML = html;
    
    // Attach click handlers
    document.querySelectorAll('.waterfall-row').forEach(row => {
        row.addEventListener('click', () => {
            const requestId = parseInt(row.dataset.requestId);
            showRequestDetails(requestId);
        });
    });
    
    // Render details table
    renderDetailsTable(filteredEntries);
}

function renderDetailsTable(entries) {
    const container = document.getElementById('requestDetailsTable');
    
    let html = `
        <table class="details-table">
            <thead>
                <tr>
                    <th data-sort="id"># <span class="sort-icon">▼</span></th>
                    <th data-sort="url">URL <span class="sort-icon">▼</span></th>
                    <th data-sort="status">Status <span class="sort-icon">▼</span></th>
                    <th data-sort="type">Type <span class="sort-icon">▼</span></th>
                    <th data-sort="method">Method <span class="sort-icon">▼</span></th>
                    <th data-sort="size">Size <span class="sort-icon">▼</span></th>
                    <th data-sort="time">Time <span class="sort-icon">▼</span></th>
                    <th data-sort="protocol">Protocol <span class="sort-icon">▼</span></th>
                    <th data-sort="priority">Priority <span class="sort-icon">▼</span></th>
                </tr>
            </thead>
            <tbody>
    `;
    
    entries.forEach(entry => {
        const statusColor = getStatusColor(entry.status);
        const sizeKB = (entry.size.transferSize / 1024).toFixed(1);
        const timeMS = entry.timing.total.toFixed(0);
        
        html += `
            <tr data-request-id="${entry.requestId}">
                <td>${entry.requestId}</td>
                <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.url}">${truncateUrl(entry.url, 60)}</td>
                <td><span style="background: ${statusColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem;">${entry.status}</span></td>
                <td>${getResourceTypeBadgeText(entry.resourceType)}</td>
                <td>${entry.method}</td>
                <td style="text-align: right;">${sizeKB} KB</td>
                <td style="text-align: right;">${timeMS} ms</td>
                <td>${entry.protocol || 'N/A'}</td>
                <td>${entry.priority || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Add click handlers to table rows
    container.querySelectorAll('tbody tr').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            const requestId = parseInt(row.dataset.requestId);
            showRequestDetails(requestId);
        });
    });
    
    // Add sort handlers to headers
    setupTableSort();
}

function getResourceTypeBadgeText(type) {
    const badges = {
        'Document': 'HTML',
        'Stylesheet': 'CSS',
        'Script': 'JavaScript',
        'Image': 'Image',
        'Font': 'Font',
        'XHR': 'XHR',
        'Fetch': 'Fetch'
    };
    return badges[type] || type;
}

function setupTableSort() {
    let currentTableSort = { column: null, ascending: true };
    
    document.querySelectorAll('.details-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            
            // Toggle sort direction if same column
            if (currentTableSort.column === column) {
                currentTableSort.ascending = !currentTableSort.ascending;
            } else {
                currentTableSort.column = column;
                currentTableSort.ascending = true;
            }
            
            // Update header styles
            document.querySelectorAll('.details-table th').forEach(h => {
                h.classList.remove('sorted');
                h.querySelector('.sort-icon').textContent = '▼';
            });
            header.classList.add('sorted');
            header.querySelector('.sort-icon').textContent = currentTableSort.ascending ? '▲' : '▼';
            
            // Sort and re-render
            sortTableBy(column, currentTableSort.ascending);
        });
    });
}

function sortTableBy(column, ascending) {
    const entries = [...currentHarData.entries];
    const filteredEntries = currentFilter === 'all' 
        ? entries 
        : entries.filter(e => e.resourceType === currentFilter);
    
    filteredEntries.sort((a, b) => {
        let valA, valB;
        
        switch(column) {
            case 'id':
                valA = a.requestId;
                valB = b.requestId;
                break;
            case 'url':
                valA = a.url.toLowerCase();
                valB = b.url.toLowerCase();
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'status':
                valA = a.status;
                valB = b.status;
                break;
            case 'type':
                valA = a.resourceType;
                valB = b.resourceType;
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'method':
                valA = a.method;
                valB = b.method;
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'size':
                valA = a.size.transferSize;
                valB = b.size.transferSize;
                break;
            case 'time':
                valA = a.timing.total;
                valB = b.timing.total;
                break;
            case 'protocol':
                valA = a.protocol || '';
                valB = b.protocol || '';
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'priority':
                valA = a.priority || '';
                valB = b.priority || '';
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            default:
                return 0;
        }
        
        return ascending ? valA - valB : valB - valA;
    });
    
    renderDetailsTable(filteredEntries);
}

function getStatusColor(status) {
    if (status >= 200 && status < 300) return '#4CAF50'; // Green
    if (status >= 300 && status < 400) return '#FF9800'; // Orange
    if (status >= 400 && status < 500) return '#F44336'; // Red
    if (status >= 500) return '#B71C1C'; // Dark Red
    return '#9E9E9E'; // Grey for others
}

function getResourceTypeBadge(type) {
    const badges = {
        'Document': 'HTML',
        'Stylesheet': 'CSS',
        'Script': 'JS',
        'Image': 'IMG',
        'Font': 'FONT',
        'XHR': 'XHR',
        'Fetch': 'API'
    };
    return badges[type] || 'OTHER';
}

function sortEntries(entries) {
    switch(currentSort) {
        case 'time-desc': // Slowest to fastest
            entries.sort((a, b) => b.timing.total - a.timing.total);
            break;
        case 'time-asc': // Fastest to slowest
            entries.sort((a, b) => a.timing.total - b.timing.total);
            break;
        case 'size-desc': // Largest to smallest
            entries.sort((a, b) => b.size.transferSize - a.size.transferSize);
            break;
        case 'size-asc': // Smallest to largest
            entries.sort((a, b) => a.size.transferSize - b.size.transferSize);
            break;
        case 'name-asc': // A to Z
            entries.sort((a, b) => a.url.localeCompare(b.url));
            break;
        case 'name-desc': // Z to A
            entries.sort((a, b) => b.url.localeCompare(a.url));
            break;
        case 'sequence': // Original sequence
            entries.sort((a, b) => a.requestId - b.requestId);
            break;
    }
}

function renderTimingBars(timing, scale) {
    let html = '';
    let currentOffset = timing.startTime * scale;
    
    // DNS
    if (timing.dns > 0) {
        const width = timing.dns * scale / 1000;
        html += `<div class="timing-bar bar-dns" style="left: ${currentOffset}px; width: ${width}px" title="DNS: ${timing.dns.toFixed(0)}ms"></div>`;
        currentOffset += width;
    }
    
    // Connect
    if (timing.connect > 0) {
        const width = timing.connect * scale / 1000;
        html += `<div class="timing-bar bar-connect" style="left: ${currentOffset}px; width: ${width}px" title="Connect: ${timing.connect.toFixed(0)}ms"></div>`;
        currentOffset += width;
    }
    
    // SSL
    if (timing.ssl > 0) {
        const width = timing.ssl * scale / 1000;
        html += `<div class="timing-bar bar-ssl" style="left: ${currentOffset}px; width: ${width}px" title="SSL: ${timing.ssl.toFixed(0)}ms"></div>`;
        currentOffset += width;
    }
    
    // Wait (TTFB)
    if (timing.wait > 0) {
        const width = timing.wait * scale / 1000;
        html += `<div class="timing-bar bar-wait" style="left: ${currentOffset}px; width: ${width}px" title="Wait: ${timing.wait.toFixed(0)}ms"></div>`;
        currentOffset += width;
    }
    
    // Receive
    const totalWidth = (timing.endTime - timing.startTime) * scale;
    const receiveWidth = Math.max(totalWidth - (currentOffset - timing.startTime * scale), 0);
    if (receiveWidth > 0) {
        html += `<div class="timing-bar bar-receive" style="left: ${currentOffset}px; width: ${receiveWidth}px" title="Download: ${(receiveWidth / scale * 1000).toFixed(0)}ms"></div>`;
    }
    
    return html;
}

function showRequestDetails(requestId) {
    const entry = currentHarData.entries.find(e => e.requestId === requestId);
    if (!entry) return;
    
    document.getElementById('dialogTitle').textContent = `Request #${requestId}`;
    
    const content = `
        <div class="detail-section">
            <h3>General</h3>
            <div class="detail-row">
                <span class="detail-label">URL:</span>
                <span class="detail-value">${entry.url}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Domain:</span>
                <span class="detail-value">${entry.domain}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Method:</span>
                <span class="detail-value">${entry.method}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">${entry.status}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${entry.resourceType}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Protocol:</span>
                <span class="detail-value">${entry.protocol || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">${entry.priority || 'N/A'}</span>
            </div>
            ${entry.isThirdParty ? '<div class="detail-row"><span class="detail-value" style="color: orange;">⚠️ Third-Party Resource</span></div>' : ''}
            ${entry.renderBlocking ? '<div class="detail-row"><span class="detail-value" style="color: red;">🚫 Render Blocking</span></div>' : ''}
        </div>
        
        <div class="detail-section">
            <h3>Timing</h3>
            ${entry.timing.dns > 0 ? `<div class="detail-row"><span class="detail-label">DNS Lookup:</span><span class="detail-value">${entry.timing.dns.toFixed(2)} ms</span></div>` : ''}
            ${entry.timing.connect > 0 ? `<div class="detail-row"><span class="detail-label">Connection:</span><span class="detail-value">${entry.timing.connect.toFixed(2)} ms</span></div>` : ''}
            ${entry.timing.ssl > 0 ? `<div class="detail-row"><span class="detail-label">SSL:</span><span class="detail-value">${entry.timing.ssl.toFixed(2)} ms</span></div>` : ''}
            ${entry.timing.wait > 0 ? `<div class="detail-row"><span class="detail-label">Time to First Byte:</span><span class="detail-value">${entry.timing.wait.toFixed(2)} ms</span></div>` : ''}
            <div class="detail-row">
                <span class="detail-label">Total Time:</span>
                <span class="detail-value">${entry.timing.total.toFixed(2)} ms</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Size</h3>
            <div class="detail-row">
                <span class="detail-label">Transfer Size:</span>
                <span class="detail-value">${formatBytes(entry.size.transferSize)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Resource Size:</span>
                <span class="detail-value">${formatBytes(entry.size.resourceSize)}</span>
            </div>
            ${entry.size.compressionRatio < 1 ? `
            <div class="detail-row">
                <span class="detail-label">Compression:</span>
                <span class="detail-value">${(entry.size.compressionRatio * 100).toFixed(1)}% (${formatBytes(entry.size.resourceSize - entry.size.transferSize)} saved)</span>
            </div>` : ''}
        </div>
    `;
    
    document.getElementById('dialogContent').innerHTML = content;
    document.getElementById('requestDialog').style.display = 'block';
    document.getElementById('dialogOverlay').style.display = 'block';
}

function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            renderWaterfall();
        });
    });
    
    // Sort dropdown
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderWaterfall();
    });
    
    // Close dialog
    document.getElementById('closeDialog').addEventListener('click', closeDialog);
    document.getElementById('dialogOverlay').addEventListener('click', closeDialog);
}

function closeDialog() {
    document.getElementById('requestDialog').style.display = 'none';
    document.getElementById('dialogOverlay').style.display = 'none';
}

function truncateUrl(url, maxLength) {
    if (url.length <= maxLength) return url;
    const parts = url.split('/');
    return parts[parts.length - 1].substring(0, maxLength) + '...';
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

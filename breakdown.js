/**
 * Simple Pie Chart Renderer
 * Lightweight canvas-based pie chart for content breakdown
 */

function drawPieChart(canvasId, data, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Color palette
    const colors = [
        '#7209B7', // Purple (HTML)
        '#F72585', // Pink (JS)
        '#4361EE', // Blue (CSS)
        '#4CC9F0', // Cyan (Images)
        '#FFB703', // Orange (Fonts)
        '#06D6A0'  // Green (Other)
    ];
    
    let currentAngle = -Math.PI / 2; // Start at top
    
    data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // Draw label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + (radius * 0.7) * Math.cos(labelAngle);
        const labelY = centerY + (radius * 0.7) * Math.sin(labelAngle);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const percentage = ((item.value / total) * 100).toFixed(1);
        ctx.fillText(`${percentage}%`, labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // Draw legend
    const legendX = canvas.width - 120;
    let legendY = 20;
    
    data.forEach((item, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY, 15, 15);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`${item.label}`, legendX + 20, legendY + 11);
        
        legendY += 25;
    });
}

/**
 * Render content breakdown from HAR data
 */
async function renderContentBreakdown(testId) {
    try {
        const response = await fetch(`/reports/${testId}.har.json`);
        if (!response.ok) throw new Error('HAR data not found');
        
        const harData = await response.json();
        const summary = harData.summary;
        
        // Prepare pie chart data
        const chartData = [];
        for (const [type, stats] of Object.entries(summary.byType)) {
            chartData.push({
                label: type,
                value: stats.transfer
            });
        }
        
        // Draw pie chart
        drawPieChart('breakdown-chart', chartData);
        
        // Render statistics table
        const statsContainer = document.getElementById('breakdown-stats');
        let tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="background: var(--color-bg-secondary);">
                        <th style="padding: 0.75rem; text-align: left;">Type</th>
                        <th style="padding: 0.75rem; text-align: right;">Requests</th>
                        <th style="padding: 0.75rem; text-align: right;">Size</th>
                        <th style="padding: 0.75rem; text-align: right;">Transfer</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const [type, stats] of Object.entries(summary.byType)) {
            tableHtml += `
                <tr style="border-bottom: 1px solid var(--color-border);">
                    <td style="padding: 0.5rem;">${type}</td>
                    <td style="padding: 0.5rem; text-align: right;">${stats.count}</td>
                    <td style="padding: 0.5rem; text-align: right;">${formatBytes(stats.size)}</td>
                    <td style="padding: 0.5rem; text-align: right;">${formatBytes(stats.transfer)}</td>
                </tr>
            `;
        }
        
        tableHtml += `
                <tr style="font-weight: bold; background: var(--color-bg-tertiary);">
                    <td style="padding: 0.75rem;">Total</td>
                    <td style="padding: 0.75rem; text-align: right;">${summary.totalRequests}</td>
                    <td style="padding: 0.75rem; text-align: right;">${formatBytes(summary.totalSize)}</td>
                    <td style="padding: 0.75rem; text-align: right;">${formatBytes(summary.totalTransfer)}</td>
                </tr>
            </tbody>
        </table>
        <p style="margin-top: 0.5rem; color: var(--color-text-secondary); font-size: 0.9rem;">
            Compression savings: ${summary.compressionSavings}%
        </p>
        `;
        
        statsContainer.innerHTML = tableHtml;
        
        // Show the breakdown section
        document.getElementById('content-breakdown').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load content breakdown:', error);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

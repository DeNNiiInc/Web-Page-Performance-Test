// ============================================================================
// State & Config
// ============================================================================
let currentDevice = 'desktop';

// ============================================================================
// UI Functions
// ============================================================================

function setDevice(device) {
    currentDevice = device;
    document.querySelectorAll('.toggle-option').forEach(el => {
        el.classList.toggle('active', el.dataset.value === device);
    });
}

function setLoading(isLoading) {
    const btn = document.getElementById('run-btn');
    const spinner = document.getElementById('loading-spinner');
    const btnText = btn.querySelector('span');
    
    if (isLoading) {
        btn.disabled = true;
        spinner.style.display = 'block';
        btnText.textContent = 'Running Test...';
    } else {
        btn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Run Test';
    }
}

// ============================================================================
// API Handlers
// ============================================================================

async function runTest() {
    console.log('Run Test triggered');
    const urlInput = document.getElementById('test-url');
    const url = urlInput.value.trim();
    const errorMsg = document.getElementById('error-msg');
    const resultsArea = document.getElementById('results-area');

    if (!url) {
        showError('Please enter a valid URL');
        return;
    }

    try {
        new URL(url);
    } catch {
        showError('Invalid URL format (include http:// or https://)');
        return;
    }

    // Reset UI
    errorMsg.style.display = 'none';
    resultsArea.classList.remove('visible');
    setLoading(true);

    try {
        const response = await fetch('/api/run-test', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-user-uuid': getUserUuid()
            },
            body: JSON.stringify({ 
                url: url,
                isMobile: currentDevice === 'mobile'
            })
        });

        if (!response.ok) throw new Error('Test failed to start');

        const data = await response.json();
        displayResults(data);
        loadHistory(); // Refresh history

    } catch (error) {
        console.error(error);
        showError('Test execution failed. Check console for details.');
    } finally {
        setLoading(false);
    }
}

function displayResults(data) {
    const resultsArea = document.getElementById('results-area');
    
    // Update Metrics
    updateMetric('score-perf', Math.round(data.scores.performance), true);
    updateMetric('metric-lcp', Math.round(data.metrics.lcp));
    updateMetric('metric-cls', data.metrics.cls.toFixed(3));
    updateMetric('metric-tbt', Math.round(data.metrics.tbt));

    // Remove existing actions if any
    const existingActions = resultsArea.querySelector('.report-actions');
    if (existingActions) existingActions.remove();

    // Add Report Button
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'report-actions';
    actionsDiv.innerHTML = `
        <a href="/reports/${data.id}.html" target="_blank" class="btn-secondary">
            📄 View Full Report
        </a>
    `;
    resultsArea.appendChild(actionsDiv);
    
    // Show waterfall link
    const waterfallContainer = document.getElementById('waterfall-link-container');
    if (waterfallContainer) {
        waterfallContainer.style.display = 'block';
        document.getElementById('view-waterfall').onclick = (e) => {
            e.preventDefault();
            window.open(`/waterfall.html?id=${data.id}`, '_blank');
        };
    }
    
    // Load content breakdown
    if (typeof renderContentBreakdown === 'function') {
        renderContentBreakdown(data.id);
    }
    
    // Load and display optimizations
    loadOptimizations(data.id);
    
    // Wire export buttons
    document.getElementById('export-buttons').style.display = 'block';
    document.getElementById('export-har').href = `/api/export/${data.id}/har`;
    document.getElementById('export-csv').href = `/api/export/${data.id}/csv`;

    resultsArea.classList.add('visible');
    
    // Scroll to results
    resultsArea.scrollIntoView({ behavior: 'smooth' });
}

function updateMetric(id, value, isScore = false) {
    const el = document.getElementById(id);
    el.textContent = value;
    
    if (isScore) {
        el.className = 'metric-value'; // Reset
        if (value >= 90) el.classList.add('score-good');
        else if (value >= 50) el.classList.add('score-average');
        else el.classList.add('score-poor');
    }
}

function showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.style.display = 'block';
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history', {
            headers: {
                'x-user-uuid': getUserUuid()
            }
        });
        const history = await response.json();
        
        const container = document.getElementById('history-list');
        container.innerHTML = '<h3>Recent Tests</h3>';
        
        // Add comparison controls
        container.innerHTML += `
            <div id="comparison-controls" style="display: none; background: var(--color-bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <span id="comparison-status" style="margin-right: 1rem; font-weight: 600;"></span>
                <button id="compare-btn" class="btn-primary" style="padding: 0.5rem 1.5rem;" disabled>
                    Compare Selected Tests
                </button>
                <button id="clear-selection-btn" class="btn-secondary" style="padding: 0.5rem 1rem; margin-left: 0.5rem;">
                    Clear
                </button>
            </div>
        `;
        
        if (history.length === 0) {
            container.innerHTML += '<p style="color: var(--color-text-tertiary)">No tests run yet.</p>';
            return;
        }

        history.slice(0, 10).forEach(test => {
            const date = new Date(test.timestamp).toLocaleString();
            const perfScore = Math.round(test.scores.performance);
            const colorClass = perfScore >= 90 ? 'score-good' : (perfScore >= 50 ? 'score-average' : 'score-poor');
            
            const html = `
                <div class="history-item">
                    <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                        <input type="checkbox" class="compare-checkbox" data-test-id="${test.id}" style="width: 20px; height: 20px; cursor: pointer;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 0.9rem">${test.url}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-muted)">
                                ${date} • ${test.isMobile ? '📱 Mobile' : '💻 Desktop'}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <a href="/waterfall.html?id=${test.id}" target="_blank" class="btn-secondary" style="margin:0; padding: 0.25rem 0.75rem; font-size: 0.75rem;" title="View Waterfall">
                            📊 Waterfall
                        </a>
                        <a href="/reports/${test.id}.html" target="_blank" class="btn-secondary" style="margin:0; padding: 0.25rem 0.75rem; font-size: 0.75rem;">
                            View Report
                        </a>
                        <div class="${colorClass}" style="font-weight: 700; font-size: 1.25rem">
                            ${perfScore}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
        
        // Setup comparison functionality
        setupComparisonControls();

    } catch (error) {
        console.error('Failed to load history', error);
    }
}

function setupComparisonControls() {
    const checkboxes = document.querySelectorAll('.compare-checkbox');
    const controls = document.getElementById('comparison-controls');
    const status = document.getElementById('comparison-status');
    const compareBtn = document.getElementById('compare-btn');
    const clearBtn = document.getElementById('clear-selection-btn');
    
    function updateComparisonStatus() {
        const selected = Array.from(checkboxes).filter(cb => cb.checked);
        
        if (selected.length === 0) {
            controls.style.display = 'none';
        } else {
            controls.style.display = 'block';
            status.textContent = `${selected.length} test${selected.length > 1 ? 's' : ''} selected`;
            compareBtn.disabled = selected.length !== 2;
            
            if (selected.length > 2) {
                // Uncheck oldest selections
                selected[0].checked = false;
                updateComparisonStatus();
            }
        }
    }
    
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateComparisonStatus);
    });
    
    compareBtn.addEventListener('click', () => {
        const selected = Array.from(checkboxes).filter(cb => cb.checked);
        if (selected.length === 2) {
            const test1 = selected[0].dataset.testId;
            const test2 = selected[1].dataset.testId;
            window.open(`/compare.html?test1=${test1}&test2=${test2}`, '_blank');
        }
    });
    
    clearBtn.addEventListener('click', () => {
        checkboxes.forEach(cb => cb.checked = false);
        updateComparisonStatus();
    });
}

// ============================================================================
// Git Version Badge
// ============================================================================

async function updateVersionBadge() {
    try {
        const response = await fetch('/api/git-info');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        const commitIdEl = document.getElementById('commit-id');
        const commitAgeEl = document.getElementById('commit-age');
        
        if (data.error || !data.commitId) {
            commitIdEl.textContent = 'local';
            commitAgeEl.textContent = 'dev mode';
            commitIdEl.style.color = 'var(--color-text-muted)';
        } else {
            commitIdEl.textContent = data.commitId;
            commitAgeEl.textContent = data.commitAge;
            commitIdEl.style.color = 'var(--color-accent-success)';
        }
    } catch (error) {
        console.error('Failed to fetch git info:', error);
        const commitIdEl = document.getElementById('commit-id');
        const commitAgeEl = document.getElementById('commit-age');
        commitIdEl.textContent = 'local';
        commitAgeEl.textContent = 'dev mode';
        commitIdEl.style.color = 'var(--color-text-tertiary)';
    }
}

// ============================================================================
// Identity Management
// ============================================================================
function getUserUuid() {
    let uuid = localStorage.getItem('user_uuid');
    if (!uuid) {
        uuid = crypto.randomUUID();
        localStorage.setItem('user_uuid', uuid);
    }
    return uuid;
}

async function loadOptimizations(testId) {
    try {
        const response = await fetch(`/reports/${testId}.optimizations.json`);
        if (!response.ok) throw new Error('Optimizations not found');
        
        const data = await response.json();
        const container = document.getElementById('optimization-checklist');
        const scoreEl = document.getElementById('optimization-score');
        const itemsEl = document.getElementById('optimization-items');
        
        // Display score
        const score = data.summary.score;
        scoreEl.textContent = `${score}%`;
        scoreEl.style.color = score >= 80 ? '#4CAF50' : score >= 50 ? '#FFC107' : '#F44336';
        
        // Display checks
        let html = '';
        data.checks.forEach(check => {
            const icon = check.status === 'error' ? '❌' : check.status === 'warning' ? '⚠️' : 'ℹ️';
            const color = check.status === 'error' ? '#F44336' : check.status === 'warning' ? '#FFC107' : '#2196F3';
            
            html += `
                <div style="border-left: 4px solid ${color}; padding: 1rem; margin: 0.5rem 0; background: var(--color-bg-tertiary); border-radius: 4px;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">
                        ${icon} ${check.title}
                    </div>
                    <div style="color: var(--color-text-secondary); font-size: 0.9rem;">
                        ${check.description}
                    </div>
                    ${check.savings ? `<div style="color: var(--color-accent); font-size: 0.85rem; margin-top: 0.5rem;">Potential savings: ${(check.savings / 1000).toFixed(1)}s</div>` : ''}
                </div>
            `;
        });
        
        if (data.checks.length === 0) {
            html = '<p style="text-align: center; color: var(--color-text-secondary);">✅ All optimization checks passed!</p>';
        }
        
        itemsEl.innerHTML = html;
        container.style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load optimizations:', error);
    }
}


// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Ensure we have an identity
    const userUuid = getUserUuid();
    console.log('User Identity:', userUuid);

    updateVersionBadge();
    loadHistory();
    
    // Attach event listener programmatically
    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
        runBtn.addEventListener('click', runTest);
        console.log('Run Test button listener attached');
    } else {
        console.error('Run Test button not found');
    }
    
    // Auto-refresh Git badge
    setInterval(updateVersionBadge, 5 * 60 * 1000);
});

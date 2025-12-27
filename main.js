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
                    <div>
                        <div style="font-weight: 600; font-size: 0.9rem">${test.url}</div>
                        <div style="font-size: 0.75rem; color: var(--color-text-muted)">
                            ${date} • ${test.isMobile ? '📱 Mobile' : '💻 Desktop'}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
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

    } catch (error) {
        console.error('Failed to load history', error);
    }
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

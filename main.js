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
    const captureFilmstrip = document.getElementById('capture-filmstrip')?.checked || false;
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
                isMobile: currentDevice === 'mobile',
                runs: 1,
                captureFilmstrip: captureFilmstrip
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
    
    // Calculate grades using grades.js if available, otherwise simplified logic
    let overallGrade = 'F';
    let structureScore = 50;
    
    if (typeof calculateAllGrades === 'function') {
        // Assume grades.js available
        const grades = calculateAllGrades(data.metrics);
        // Map average score to grade? Simplified:
        // Use Performance Score as primary grade driver
    }
    
    const perfScore = Math.round(data.scores.performance);
    overallGrade = perfScore >= 90 ? 'A' : perfScore >= 80 ? 'B' : perfScore >= 70 ? 'C' : perfScore >= 60 ? 'D' : 'F';
    
    // Structure Score (Average of non-perf categories)
    structureScore = Math.round((
        (data.scores.seo || 0) + 
        (data.scores.bestPractices || data.scores['best-practices'] || 0) + 
        (data.scores.accessibility || 0)
    ) / 3);

    // Update Dashboard UI
    const gradeCircle = document.getElementById('overall-grade');
    const gradeLetter = gradeCircle.querySelector('.grade-letter');
    
    // Animate Grade
    gradeLetter.textContent = overallGrade;
    gradeCircle.className = 'grade-circle grade-' + overallGrade.toLowerCase();
    
    document.getElementById('performance-score').textContent = perfScore + '%';
    document.getElementById('structure-score').textContent = structureScore + '%';
    
    // Web Vitals
    const lcpVal = data.metrics.lcp < 1000 ? (data.metrics.lcp/1000).toFixed(2) + 's' : Math.round(data.metrics.lcp) + 'ms';
    const tbtVal = Math.round(data.metrics.tbt) + 'ms';
    const clsVal = data.metrics.cls.toFixed(2);
    
    document.getElementById('vital-lcp').textContent = lcpVal;
    document.getElementById('vital-tbt').textContent = tbtVal;
    document.getElementById('vital-cls').textContent = clsVal;

    // Display Filmstrip
    if (data.filmstrip && data.filmstrip.length > 0) {
        displayFilmstrip(data.filmstrip);
    } else {
        document.getElementById('filmstrip-section').style.display = 'none';
    }

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
        document.getElementById('view-video').onclick = (e) => {
            e.preventDefault();
            if (data.filmstrip && data.filmstrip.length > 0) {
                openVideoModal(data.filmstrip);
            } else {
                alert('No video data available for this test.');
            }
        };
        document.getElementById('view-images').onclick = (e) => {
            e.preventDefault();
            // Data might exist on server even if filmstrip array is empty in this object
            console.log("Opening images page for test:", data.id);
            window.open(`/images.html?id=${data.id}`, '_blank');
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

function displayFilmstrip(items) {
    const section = document.getElementById('filmstrip-section');
    const container = document.getElementById('filmstrip-container');
    section.style.display = 'block';
    
    // Filter/Sample items if too many
    const frames = items; 
    
    container.innerHTML = frames.map(frame => `
        <div class="filmstrip-frame">
            <img src="${frame.data}" alt="Timestamp: ${frame.timing}ms">
            <div class="frame-time">${(frame.timing / 1000).toFixed(1)}s</div>
        </div>
    `).join('');
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
                            <div style="font-weight: 600; font-size: 0.9rem">
                                <a href="#" class="history-url-link" data-test-id="${test.id}" style="color: var(--color-accent); text-decoration: none; cursor: pointer;" title="Click to reload test results">
                                    ${test.url}
                                </a>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--color-text-muted)">
                                ${date} • ${test.isMobile ? '📱 Mobile' : '💻 Desktop'}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button class="btn-secondary rerun-btn" data-url="${test.url}" style="margin:0; padding: 0.25rem 0.75rem; font-size: 0.75rem;" title="Rerun this test">
                            🔄 Rerun
                        </button>
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
        
        // Setup click handlers for history URLs
        document.querySelectorAll('.history-url-link').forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const testId = e.target.dataset.testId;
                await loadTestById(testId);
            });
        });

        // Setup click handlers for Rerun buttons
        document.querySelectorAll('.rerun-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = e.target.dataset.url;
                
                // Populate URL field
                document.getElementById('test-url').value = url;
                
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
                // Trigger run (this ensures it uses the current "Number of Runs" setting)
                document.getElementById('run-btn').click();
            });
        });

    } catch (error) {
        console.error('Failed to load history', error);
    }
}

// Load and display a test by ID
async function loadTestById(testId) {
    try {
        const response = await fetch(`/reports/${testId}.json`);
        if (!response.ok) throw new Error('Test not found');
        
        const data = await response.json();
        displayResults(data);
        
        // Scroll to results
        document.getElementById('results-area').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Failed to load test:', error);
        alert('Could not load test results. The test may have been deleted.');
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
    let uuid = localStorage.getItem('user-uuid');
    if (!uuid) {
        uuid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('user-uuid', uuid);
    }
    return uuid;
}

// Multi-run progress polling
async function pollSuiteStatus(suiteId, totalRuns) {
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/suite-status/${suiteId}`);
            const suite = await response.json();
            
            // Update progress
            const progress = (suite.completed_runs / suite.run_count) * 100;
            document.getElementById('progress-fill').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = 
                `Run ${suite.completed_runs} of ${suite.run_count} completed...`;
            
            // Check if complete
            if (suite.status === 'completed') {
                clearInterval(pollInterval);
                document.getElementById('progress-text').textContent = 'Calculating statistics...';
                
                // Display multi-run results
                displayMultiRunResults(suite);
                document.getElementById('multi-run-progress').style.display = 'none';
            } else if (suite.status === 'failed') {
                clearInterval(pollInterval);
                throw new Error('Some test runs failed');
            }
        } catch (error) {
            clearInterval(pollInterval);
            console.error('Polling error:', error);
            document.getElementById('error-msg').textContent = 'Error tracking progress: ' + error.message;
            document.getElementById('error-msg').style.display = 'block';
            document.getElementById('multi-run-progress').style.display = 'none';
        }
    }, 2000); // Poll every 2 seconds
}

function displayMultiRunResults(suite) {
    // Show statistics summary
    const statsHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0;">
            <div style="background: var(--color-bg-secondary); padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent);">${suite.median_performance_score?.toFixed(0) || 'N/A'}</div>
                <div style="color: var(--color-text-secondary); margin-top: 0.5rem;">Median Performance</div>
            </div>
            <div style="background: var(--color-bg-secondary); padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent);">${suite.avg_performance_score?.toFixed(0) || 'N/A'}</div>
                <div style="color: var(--color-text-secondary); margin-top: 0.5rem;">Average Performance</div>
            </div>
            <div style="background: var(--color-bg-secondary); padding: 1.5rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: var(--color-accent);">±${suite.stddev_performance_score?.toFixed(1) || 'N/A'}</div>
                <div style="color: var(--color-text-secondary); margin-top: 0.5rem;">Std Deviation</div>
            </div>
        </div>
        
        <h3 style="margin-top: 2rem;">Individual Runs</h3>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: var(--color-bg-secondary); border-radius: 8px;">
                <thead>
                    <tr style="background: var(--color-bg-tertiary);">
                        <th style="padding: 1rem; text-align: left;">Run</th>
                        <th style="padding: 1rem; text-align: center;">Performance</th>
                        <th style="padding: 1rem; text-align: center;">LCP (ms)</th>
                        <th style="padding: 1rem; text-align: center;">CLS</th>
                        <th style="padding: 1rem; text-align: center;">TBT (ms)</th>
                        <th style="padding: 1rem; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${suite.runs?.map(run => `
                        <tr style="border-top: 1px solid var(--color-border); ${run.is_median ? 'background: rgba(114, 9, 183, 0.1);' : ''}">
                            <td style="padding: 1rem;">#${run.run_number} ${run.is_median ? '⭐ Median' : ''}</td>
                            <td style="padding: 1rem; text-align: center;">-</td>
                            <td style="padding: 1rem; text-align: center;">-</td>
                            <td style="padding: 1rem; text-align: center;">-</td>
                            <td style="padding: 1rem; text-align: center;">-</td>
                            <td style="padding: 1rem; text-align: center;">
                                <a href="/waterfall.html?id=${run.test_id}" target="_blank" style="color: var(--color-accent);">View Details</a>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="6" style="padding: 1rem; text-align: center;">No run data available</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('results-area').innerHTML = statsHtml;
    document.getElementById('results-area').style.display = 'block';
}

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

// Video Player State
let videoFrames = [];
let isPlaying = false;
let currentFrameIndex = 0;
let videoInterval = null;

function openVideoModal(frames) {
    if (!frames || frames.length === 0) return;
    
    videoFrames = frames;
    currentFrameIndex = 0;
    isPlaying = false;
    
    document.getElementById('video-modal').style.display = 'block';
    updateVideoFrame();
}

function closeVideoModal() {
    stopVideo();
    document.getElementById('video-modal').style.display = 'none';
}

function toggleVideoPlay() {
    if (isPlaying) {
        stopVideo();
    } else {
        playVideo();
    }
}

function playVideo() {
    if (isPlaying) return;
    isPlaying = true;
    document.getElementById('video-play-btn').textContent = '⏸ Pause';
    
    if (currentFrameIndex >= videoFrames.length - 1) {
        currentFrameIndex = 0;
    }
    
    videoInterval = setInterval(() => {
        currentFrameIndex++;
        if (currentFrameIndex >= videoFrames.length) {
            stopVideo();
            return;
        }
        updateVideoFrame();
    }, 100); // 10fps
}

function stopVideo() {
    isPlaying = false;
    document.getElementById('video-play-btn').textContent = '▶ Play';
    if (videoInterval) clearInterval(videoInterval);
}

function updateVideoFrame() {
    const frame = videoFrames[currentFrameIndex];
    document.getElementById('video-img').src = frame.data;
    document.getElementById('video-time').textContent = (frame.timing / 1000).toFixed(1) + 's';
    
    const progress = ((currentFrameIndex + 1) / videoFrames.length) * 100;
    document.getElementById('video-progress-fill').style.width = `${progress}%`;
}

async function downloadVideo() {
    if (!videoFrames || videoFrames.length === 0) {
        alert('No video data to download');
        return;
    }
    
    const downloadBtn = document.getElementById('video-download-btn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Compiling...';
    
    try {
        // Initialize Whammy video encoder with 30 FPS
        const fps = 30;
        const encoder = new Whammy(fps); 
        
        // Create canvas for high-quality rendering (1920x1080)
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        
        // Calculate total duration from the last frame's timing
        const totalDuration = videoFrames[videoFrames.length - 1].timing;
        console.log(`Compiling video: ${videoFrames.length} source frames, total ${totalDuration}ms`);
        
        // We will generate a frame for every 1/30th of a second
        const frameInterval = 1000 / fps; // ~33.33ms
        let totalOutputFrames = Math.ceil(totalDuration / frameInterval);
        
        // Ensure at least one frame if duration is 0 or very small
        if (totalOutputFrames <= 0) totalOutputFrames = 1;
        
        console.log(`Generating ${totalOutputFrames} output frames`);

        // Pre-load all images
        const loadedImages = await Promise.all(videoFrames.map(async frame => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            return new Promise((resolve, reject) => {
                img.onload = () => resolve({ img, timing: frame.timing });
                img.onerror = () => resolve(null); // Skip failed frames
                img.src = frame.data;
            });
        }));
        
        const validImages = loadedImages.filter(i => i !== null);
        
        if (validImages.length === 0) {
            throw new Error("Failed to load any source images");
        }
        
        // Generate video frames
        for (let i = 0; i < totalOutputFrames; i++) {
            const currentTime = i * frameInterval;
            
            // Find the image that should be displayed at this time
            // It's the latest image whose timing is <= currentTime
            let currentImage = validImages[0];
            for (let j = 0; j < validImages.length; j++) {
                if (validImages[j].timing <= currentTime) {
                    currentImage = validImages[j];
                } else {
                    break;
                }
            }
            
            // Draw frame
            // Clear and draw black background
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Center and scale image (Contain)
            if (currentImage && currentImage.img) {
                const scale = Math.min(canvas.width / currentImage.img.width, canvas.height / currentImage.img.height);
                const x = (canvas.width - currentImage.img.width * scale) / 2;
                const y = (canvas.height - currentImage.img.height * scale) / 2;
                
                // Use high quality image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(currentImage.img, x, y, currentImage.img.width * scale, currentImage.img.height * scale);
            }
            
            // Add timestamp overlay (crisp text)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(20, canvas.height - 70, 220, 50);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px Arial'; 
            ctx.fillText(`${(currentTime / 1000).toFixed(1)}s`, 40, canvas.height - 35);
            
            // Add frame to encoder
            // Note: add() might parse the webp immediately, so this must happen
            encoder.add(canvas);
            
            // Yield to UI thread occasionally to prevent freezing
            if (i % 15 === 0) await new Promise(r => setTimeout(r, 0));
        }
        
        // Compile and download
        const outputBlob = encoder.compile();
        const url = URL.createObjectURL(outputBlob);
        
        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `page-load-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Video download error:', error);
        alert(`Failed to create video: ${error.message}\n\nYour browser may not support this feature. Try using Chrome or Edge.`);
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇ Download';
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

// ============================================================================
// Extra Features (Diagnostics & Bulk)
// ============================================================================

function toggleSection(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function runTraceroute() {
    const host = document.getElementById('trace-host').value;
    const out = document.getElementById('trace-output');
    
    if (!host) return;
    
    out.style.display = 'block';
    out.textContent = 'Running traceroute...';
    
    try {
        const res = await fetch(`/api/traceroute?host=${host}`);
        const data = await res.json();
        out.textContent = data.output;
    } catch (e) {
        out.textContent = 'Error: ' + e.message;
    }
}

async function runBulkTest() {
    const text = document.getElementById('bulk-urls').value;
    const urls = text.split('\n').map(u => u.trim()).filter(u => u);
    
    if (urls.length === 0) {
        alert('No URLs provided');
        return;
    }
    
    const progress = document.getElementById('bulk-progress');
    progress.innerHTML = `Starting batch of ${urls.length} tests...`;
    
    // Simple Frontend orchestration
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        progress.innerHTML += `<div style="margin-top: 0.5rem">Testing ${url} (${i+1}/${urls.length})...</div>`;
        
        try {
            // Re-use existing runTest API
            // Note: We need a way to reuse the run logic without clicking buttons
            // Manually calling fetch here duplicating runTest logic for simplicity
            const response = await fetch('/api/run-test', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-uuid': getUserUuid()
                },
                body: JSON.stringify({ 
                    url: url,
                    isMobile: currentDevice === 'mobile',
                    captureFilmstrip: false // Disable filmstrip for bulk to save speed? Or keep it?
                })
            });
            
            if (response.ok) {
                 progress.innerHTML += `<div style="color: #4CAF50">✅ Complete</div>`;
            } else {
                 progress.innerHTML += `<div style="color: #F44336">❌ Failed</div>`;
            }
        } catch (e) {
             progress.innerHTML += `<div style="color: #F44336">❌ Error: ${e.message}</div>`;
        }
    }
    
    progress.innerHTML += '<br><strong>Batch Completed!</strong>';
    loadHistory(); // Refresh list
}

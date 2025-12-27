/**
 * Advanced Test Settings Component
 * Provides throttling, multiple runs, and advanced configuration options
 */

// Throttling presets
const THROTTLING_PRESETS = {
    '4g': { label: '4G LTE', downloadThroughput: 10 * 1024, uploadThroughput: 5 * 1024, latency: 50 },
    '3g-fast': { label: '3G Fast', downloadThroughput: 1.6 * 1024, uploadThroughput: 768, latency: 150 },
    '3g': { label: '3G', downloadThroughput: 750, uploadThroughput: 250, latency: 300 },
    '2g': { label: '2G', downloadThroughput: 280, uploadThroughput: 256, latency: 800 },
    'cable': { label: 'Cable', downloadThroughput: 5 * 1024, uploadThroughput: 1 * 1024, latency: 28 },
    'custom': { label: 'Custom', downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
};

function initializeAdvancedSettings() {
    const advancedPanel = document.getElementById('advanced-settings');
    if (!advancedPanel) {
        console.warn('Advanced settings panel not found');
        return;
    }
    
    // Populate throttling presets
    const throttlingSelect = document.getElementById('throttling-preset');
    if (throttlingSelect) {
        for (const [key, preset] of Object.entries(THROTTLING_PRESETS)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.label;
            throttlingSelect.appendChild(option);
        }
        
        throttlingSelect.addEventListener('change', (e) => {
            handleThrottlingChange(e.target.value);
        });
    }
    
    // Toggle advanced panel
    const toggleBtn = document.getElementById('toggle-advanced');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = advancedPanel.style.display !== 'none';
            advancedPanel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '⚙️ Show Advanced Settings' : '⚙️ Hide Advanced Settings';
        });
    }
}

function handleThrottlingChange(presetKey) {
    const preset = THROTTLING_PRESETS[presetKey];
    const customInputs = document.getElementById('custom-throttling');
    
    if (presetKey === 'custom') {
        customInputs.style.display = 'block';
    } else {
        customInputs.style.display = 'none';
        document.getElementById('throttling-download').value = preset.downloadThroughput;
        document.getElementById('throttling-upload').value = preset.uploadThroughput;
        document.getElementById('throttling-latency').value = preset.latency;
    }
}

function getAdvancedSettings() {
    const settings = {
        throttling: {
            enabled: document.getElementById('enable-throttling')?.checked || false,
            downloadThroughput: parseInt(document.getElementById('throttling-download')?.value) || 0,
            uploadThroughput: parseInt(document.getElementById('throttling-upload')?.value) || 0,
            latency: parseInt(document.getElementById('throttling-latency')?.value) || 0
        },
        runs: parseInt(document.getElementById('test-runs')?.value) || 1,
        blockThirdParty: document.getElementById('block-third-party')?.checked || false,
        disableJavaScript: document.getElementById('disable-js')?.checked || false,
        customHeaders: document.getElementById('custom-headers')?.value || '',
        userAgent: document.getElementById('custom-ua')?.value || ''
    };
    
    return settings;
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdvancedSettings);
} else {
    initializeAdvancedSettings();
}

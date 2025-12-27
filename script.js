// ============================================================================
// Git Version Badge - Auto-update from server
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
            // Fallback - try to get from git locally or show placeholder
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

// Update version badge on page load
document.addEventListener('DOMContentLoaded', updateVersionBadge);

// Optional: Auto-refresh every 5 minutes to show latest version
setInterval(updateVersionBadge, 5 * 60 * 1000);

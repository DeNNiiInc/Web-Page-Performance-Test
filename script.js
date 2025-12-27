// ============================================================================
// Git Version Badge - Auto-update from server
// ============================================================================

async function updateVersionBadge() {
    try {
        const response = await fetch('/api/git-info');
        const data = await response.json();
        
        const commitIdEl = document.getElementById('commit-id');
        const commitAgeEl = document.getElementById('commit-age');
        
        if (data.error) {
            commitIdEl.textContent = 'N/A';
            commitAgeEl.textContent = 'Local Dev';
            commitIdEl.style.color = 'var(--color-text-muted)';
        } else {
            commitIdEl.textContent = data.commitId;
            commitAgeEl.textContent = data.commitAge;
            commitIdEl.style.color = 'var(--color-accent-success)';
        }
    } catch (error) {
        console.error('Failed to fetch git info:', error);
        document.getElementById('commit-id').textContent = 'N/A';
        document.getElementById('commit-age').textContent = 'Error';
    }
}

// Update version badge on page load
document.addEventListener('DOMContentLoaded', updateVersionBadge);

// Optional: Auto-refresh every 5 minutes to show latest version
setInterval(updateVersionBadge, 5 * 60 * 1000);

async function init() {
    const params = new URLSearchParams(window.location.search);
    const idA = params.get('test1');
    const idB = params.get('test2');

    if (!idA || !idB) {
        document.getElementById('loading').textContent = 'Error: Missing test IDs.';
        return;
    }

    try {
        const [resA, resB] = await Promise.all([
            fetch(`/reports/${idA}.json`).then(r => r.json()),
            fetch(`/reports/${idB}.json`).then(r => r.json())
        ]);

        renderComparison(resA, resB);
    } catch (err) {
        console.error(err);
        document.getElementById('loading').textContent = 'Error loading test results.';
    }
}

function renderComparison(a, b) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('comparison-content').style.display = 'block';

    // Render Headers
    renderHeader('a', a);
    renderHeader('b', b);

    // Render Metrics Table
    const metrics = [
        { key: 'performance', label: 'Performance Score', path: 'scores.performance', isScore: true },
        { key: 'lcp', label: 'LCP (ms)', path: 'metrics.lcp' },
        { key: 'tbt', label: 'TBT (ms)', path: 'metrics.tbt' },
        { key: 'cls', label: 'CLS', path: 'metrics.cls', isDecimal: true },
        { key: 'accessibility', label: 'Accessibility', path: 'scores.accessibility', isScore: true },
        { key: 'seo', label: 'SEO', path: 'scores.seo', isScore: true }
    ];

    const tbody = document.getElementById('metrics-body');
    tbody.innerHTML = metrics.map(m => renderMetricRow(m, a, b)).join('');

    // Render Filmstrips
    renderFilmstrip('a', a.filmstrip);
    renderFilmstrip('b', b.filmstrip);
}

function getVal(obj, path) {
    return path.split('.').reduce((o, i) => o?.[i], obj);
}

function renderHeader(col, data) {
    document.getElementById(`title-${col}`).innerHTML = `
        <a href="${data.url}" target="_blank">${data.url}</a><br>
        <small>${new Date(data.timestamp).toLocaleString()}</small>
    `;
    
    // Grade
    const score = data.scores.performance;
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';
    const el = document.getElementById(`grade-${col}`);
    el.className = `grade-circle grade-${grade.toLowerCase()}`;
    el.querySelector('.grade-letter').textContent = grade;
}

function renderMetricRow(m, a, b) {
    const valA = getVal(a, m.path) || 0;
    const valB = getVal(b, m.path) || 0;
    
    const diff = valB - valA;
    let diffStr = '';
    let diffClass = 'diff-neutral';

    // Logic: Higher is better for Scores, Lower is better for Metrics (LCP, TBT, CLS)
    const higherIsBetter = m.isScore; 
    
    if (diff !== 0) {
        const isBetter = higherIsBetter ? diff > 0 : diff < 0;
        diffClass = isBetter ? 'diff-better' : 'diff-worse';
        const prefix = diff > 0 ? '+' : '';
        diffStr = `${prefix}${m.isDecimal ? diff.toFixed(2) : Math.round(diff)}`;
    }

    return `
        <tr>
            <td style="padding: 1rem; border-bottom: 1px solid #ccc;">${m.label}</td>
            <td style="padding: 1rem; border-bottom: 1px solid #ccc;">${m.isDecimal ? valA.toFixed(2) : Math.round(valA)}</td>
            <td style="padding: 1rem; border-bottom: 1px solid #ccc;">${m.isDecimal ? valB.toFixed(2) : Math.round(valB)}</td>
            <td style="padding: 1rem; border-bottom: 1px solid #ccc;" class="${diffClass}">${diffStr}</td>
        </tr>
    `;
}

function renderFilmstrip(col, frames) {
    const el = document.getElementById(`filmstrip-${col}`);
    if (!frames || frames.length === 0) {
        el.innerHTML = 'No filmstrip data';
        return;
    }
    el.innerHTML = frames.map(f => `<img src="${f.data}" class="filmstrip-img" title="${f.timing}ms">`).join('');
}

document.addEventListener('DOMContentLoaded', init);

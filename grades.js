/**
 * Performance Grading System
 * Calculate letter grades (A-F) for various performance metrics
 * Based on WebPageTest and Lighthouse scoring thresholds
 */

const GRADE_THRESHOLDS = {
    fcp: { A: 1800, B: 3000, C: 4500, D: 6000, F: Infinity },
    lcp: { A: 2500, B: 4000, C: 6000, D: 8000, F: Infinity },
    cls: { A: 0.1, B: 0.25, C: 0.5, D: 0.75, F: Infinity },
    tbt: { A: 200, B: 600, C: 1200, D: 2000, F: Infinity },
    si: { A: 3400, B: 5800, C: 8500, D: 11000, F: Infinity },
    tti: { A: 3800, B: 7300, C: 10000, D: 13000, F: Infinity },
    ttfb: { A: 800, B: 1800, C: 3000, D: 5000, F: Infinity }
};

const GRADE_COLORS = {
    'A': '#4CAF50',
    'B': '#8BC34A',
    'C': '#FFC107',
    'D': '#FF9800',
    'F': '#F44336'
};

function calculateGrade(value, metricKey) {
    const thresholds = GRADE_THRESHOLDS[metricKey];
    if (!thresholds || value === undefined || value === null) {
        return 'N/A';
    }
    
    if (value <= thresholds.A) return 'A';
    if (value <= thresholds.B) return 'B';
    if (value <= thresholds.C) return 'C';
    if (value <= thresholds.D) return 'D';
    return 'F';
}

function getGradeColor(grade) {
    return GRADE_COLORS[grade] || '#999';
}

function calculateAllGrades(metrics) {
    return {
        fcp: {
            grade: calculateGrade(metrics.fcp, 'fcp'),
            value: metrics.fcp,
            label: 'First Contentful Paint'
        },
        lcp: {
            grade: calculateGrade(metrics.lcp, 'lcp'),
            value: metrics.lcp,
            label: 'Largest Contentful Paint'
        },
        cls: {
            grade: calculateGrade(metrics.cls, 'cls'),
            value: metrics.cls,
            label: 'Cumulative Layout Shift'
        },
        tbt: {
            grade: calculateGrade(metrics.tbt, 'tbt'),
            value: metrics.tbt,
            label: 'Total Blocking Time'
        },
        si: {
            grade: calculateGrade(metrics.si, 'si'),
            value: metrics.si,
            label: 'Speed Index'
        },
        tti: {
            grade: calculateGrade(metrics.tti, 'tti'),
            value: metrics.tti,
            label: 'Time to Interactive'
        }
    };
}

function renderGradeBadge(grade, size = 'medium') {
    const color = getGradeColor(grade);
    const sizeClass = size === 'large' ? 'grade-large' : size === 'small' ? 'grade-small' : 'grade-medium';
    
    return `
        <div class="grade-badge ${sizeClass}" style="background: ${color}">
            ${grade}
        </div>
    `;
}

function renderGradesSection(grades) {
    let html = '<div class="grades-container">';
    
    Object.entries(grades).forEach(([key, data]) => {
        const valueFormatted = key === 'cls' 
            ? data.value?.toFixed(3) 
            : data.value ? `${Math.round(data.value)}ms` : 'N/A';
            
        html += `
            <div class="grade-item">
                ${renderGradeBadge(data.grade, 'large')}
                <div class="grade-info">
                    <div class="grade-label">${data.label}</div>
                    <div class="grade-value">${valueFormatted}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateGrade,
        calculateAllGrades,
        renderGradeBadge,
        renderGradesSection,
        getGradeColor
    };
}

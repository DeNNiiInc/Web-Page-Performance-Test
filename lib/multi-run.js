/**
 * Multi-Run Test Execution Module
 * Handles running multiple performance tests and calculating statistics
 */

const runner = require('./runner');
const { Pool } = require('pg');
const dbConfig = require('./db-config');

const pool = new Pool(dbConfig);

/**
 * Statistical helper functions
 */
function median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function average(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values) {
    if (values.length === 0) return 0;
    const avg = average(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(average(squareDiffs));
}

function findClosestToMedian(values, medianValue) {
    let closestIndex = 0;
    let minDiff = Math.abs(values[0] - medianValue);
    
    values.forEach((v, i) => {
        const diff = Math.abs(v - medianValue);
        if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
        }
    });
    
    return closestIndex;
}

/**
 * Execute multiple test runs and calculate statistics
 */
async function executeMultipleRuns(suiteId, url, isMobile, runCount, userUuid, userIp) {
    const results = [];
    const testIds = [];
    
    console.log(`[Multi-Run] Starting ${runCount} runs for suite ${suiteId}`);
    
    for (let i = 1; i <= runCount; i++) {
        try {
            console.log(`[Multi-Run] Running test ${i}/${runCount}...`);
            
            // Generate unique test ID for this run
            const testId = `${suiteId}-run${i}`;
            testIds.push(testId);
            
            // Run individual test
            const result = await runner.runTest(url, { 
                isMobile, 
                userUuid, 
                userIp,
                suiteId,
                runNumber: i,
                testId
            });
            
            results.push(result);
            
            // Update progress
            await updateSuiteProgress(suiteId, i);
            
            console.log(`[Multi-Run] Completed run ${i}/${runCount}`);
            
        } catch (error) {
            console.error(`[Multi-Run] Run ${i} failed:`, error);
            // Continue with other runs even if one fails
        }
    }
    
    if (results.length === 0) {
        await markSuiteFailed(suiteId);
        throw new Error('All test runs failed');
    }
    
    // Calculate statistics
    console.log(`[Multi-Run] Calculating statistics for ${results.length} runs`);
    await calculateStatistics(suiteId, results, testIds);
    
    // Mark suite as complete
    await completeSuite(suiteId);
    
    console.log(`[Multi-Run] Suite ${suiteId} completed`);
    
    return {
        suiteId,
        completedRuns: results.length,
        totalRuns: runCount
    };
}

/**
 * Calculate statistics for all runs and update suite
 */
async function calculateStatistics(suiteId, results, testIds) {
    const metrics = {
        performanceScore: [],
        lcp: [],
        cls: [],
        tbt: []
    };
    
    // Extract metrics from each result
    results.forEach(r => {
        const lr = r.lighthouseResult;
        metrics.performanceScore.push(lr.categories.performance.score * 100);
        metrics.lcp.push(lr.audits['largest-contentful-paint']?.numericValue || 0);
        metrics.cls.push(lr.audits['cumulative-layout-shift']?.numericValue || 0);
        metrics.tbt.push(lr.audits['total-blocking-time']?.numericValue || 0);
    });
    
    // Calculate statistics
    const stats = {
        median_performance_score: median(metrics.performanceScore),
        avg_performance_score: average(metrics.performanceScore),
        stddev_performance_score: stddev(metrics.performanceScore),
        median_lcp: median(metrics.lcp),
        avg_lcp: average(metrics.lcp),
        stddev_lcp: stddev(metrics.lcp),
        median_cls: median(metrics.cls),
        avg_cls: average(metrics.cls),
        stddev_cls: stddev(metrics.cls),
        median_tbt: median(metrics.tbt),
        avg_tbt: average(metrics.tbt),
        stddev_tbt: stddev(metrics.tbt)
    };
    
    // Find median run (closest to median performance score)
    const medianPerfScore = stats.median_performance_score;
    const closestRunIndex = findClosestToMedian(metrics.performanceScore, medianPerfScore);
    const medianTestId = testIds[closestRunIndex];
    
    console.log(`[Multi-Run] Median run is #${closestRunIndex + 1} (${medianTestId})`);
    
    // Mark median run
    await markMedianRun(medianTestId);
    
    // Update suite with statistics
    await updateSuiteStats(suiteId, stats);
}

/**
 * Database operations
 */
async function createSuite(suiteId, userUuid, url, deviceType, runCount) {
    const query = `
        INSERT INTO test_suites (suite_id, user_uuid, url, device_type, run_count, status)
        VALUES ($1, $2, $3, $4, $5, 'running')
    `;
    await pool.query(query, [suiteId, userUuid, url, deviceType, runCount]);
}

async function updateSuiteProgress(suiteId, completedRuns) {
    const query = `
        UPDATE test_suites 
        SET completed_runs = $1
        WHERE suite_id = $2
    `;
    await pool.query(query, [completedRuns, suiteId]);
}

async function updateSuiteStats(suiteId, stats) {
    const query = `
        UPDATE test_suites SET
            median_performance_score = $1,
            avg_performance_score = $2,
            stddev_performance_score = $3,
            median_lcp = $4,
            avg_lcp = $5,
            stddev_lcp = $6,
            median_cls = $7,
            avg_cls = $8,
            stddev_cls = $9,
            median_tbt = $10,
            avg_tbt = $11,
            stddev_tbt = $12
        WHERE suite_id = $13
    `;
    await pool.query(query, [
        stats.median_performance_score,
        stats.avg_performance_score,
        stats.stddev_performance_score,
        stats.median_lcp,
        stats.avg_lcp,
        stats.stddev_lcp,
        stats.median_cls,
        stats.avg_cls,
        stats.stddev_cls,
        stats.median_tbt,
        stats.avg_tbt,
        stats.stddev_tbt,
        suiteId
    ]);
}

async function completeSuite(suiteId) {
    const query = `
        UPDATE test_suites 
        SET status = 'completed', completed_at = NOW()
        WHERE suite_id = $1
    `;
    await pool.query(query, [suiteId]);
}

async function markSuiteFailed(suiteId) {
    const query = `
        UPDATE test_suites 
        SET status = 'failed'
        WHERE suite_id = $1
    `;
    await pool.query(query, [suiteId]);
}

async function markMedianRun(testId) {
    const query = `
        UPDATE test_results 
        SET is_median = TRUE
        WHERE test_id = $1
    `;
    await pool.query(query, [testId]);
}

async function getSuiteStatus(suiteId) {
    const query = `
        SELECT 
            s.*,
            json_agg(
                json_build_object(
                    'test_id', r.test_id,
                    'run_number', r.run_number,
                    'is_median', r.is_median,
                    'created_at', r.created_at
                ) ORDER BY r.run_number
            ) FILTER (WHERE r.test_id IS NOT NULL) as runs
        FROM test_suites s
        LEFT JOIN test_results r ON s.suite_id = r.suite_id
        WHERE s.suite_id = $1
        GROUP BY s.id
    `;
    const result = await pool.query(query, [suiteId]);
    return result.rows[0];
}

module.exports = {
    executeMultipleRuns,
    createSuite,
    getSuiteStatus
};

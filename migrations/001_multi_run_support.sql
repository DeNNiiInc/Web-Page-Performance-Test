-- Multi-Run Statistics Database Migration
-- Creates test_suites table and modifies test_results for multi-run support

-- Create test_suites table to group multiple test runs
CREATE TABLE IF NOT EXISTS test_suites (
    id SERIAL PRIMARY KEY,
    suite_id TEXT UNIQUE NOT NULL,
    user_uuid TEXT NOT NULL,
    url TEXT NOT NULL,
    device_type TEXT,
    run_count INTEGER DEFAULT 1,
    completed_runs INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running', -- running, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Statistical results (calculated after all runs complete)
    median_performance_score NUMERIC,
    avg_performance_score NUMERIC,
    stddev_performance_score NUMERIC,
    median_lcp NUMERIC,
    avg_lcp NUMERIC,
    stddev_lcp NUMERIC,
    median_cls NUMERIC,
    avg_cls NUMERIC,
    stddev_cls NUMERIC,
    median_tbt NUMERIC,
    avg_tbt NUMERIC,
    stddev_tbt NUMERIC
);

-- Add columns to test_results for multi-run support
ALTER TABLE test_results 
ADD COLUMN IF NOT EXISTS suite_id TEXT,
ADD COLUMN IF NOT EXISTS run_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_median BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suite_id ON test_results(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_user ON test_suites(user_uuid);
CREATE INDEX IF NOT EXISTS idx_test_suites_status ON test_suites(status);

-- Comment
COMMENT ON TABLE test_suites IS 'Groups multiple test runs for statistical analysis';
COMMENT ON COLUMN test_results.suite_id IS 'Links individual run to parent test suite';
COMMENT ON COLUMN test_results.run_number IS 'Run number within the suite (1-10)';
COMMENT ON COLUMN test_results.is_median IS 'TRUE if this run represents the median performance';

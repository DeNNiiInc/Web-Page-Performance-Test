-- Ensure all columns exist
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS user_ip TEXT;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS filmstrip JSONB;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS user_uuid TEXT;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS scores JSONB;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS metrics JSONB;

-- Ensure unused columns are nullable (or drop them if you prefer, but let's just ensure they don't block inserts)
ALTER TABLE test_results ALTER COLUMN suite_id DROP NOT NULL;
ALTER TABLE test_results ALTER COLUMN run_number DROP NOT NULL;
ALTER TABLE test_results ALTER COLUMN is_median DROP NOT NULL;

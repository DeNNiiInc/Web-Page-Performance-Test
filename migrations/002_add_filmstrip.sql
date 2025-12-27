-- Add filmstrip column to test_results table
ALTER TABLE test_results 
ADD COLUMN filmstrip JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN test_results.filmstrip IS 'Array of filmstrip screenshots/thumbnails from Lighthouse';

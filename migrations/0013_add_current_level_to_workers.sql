-- Add current_level column to workers table for performance optimization
-- This stores the calculated level for each worker to avoid expensive queries

-- Add column with default value 1
ALTER TABLE workers ADD COLUMN current_level INTEGER DEFAULT 1;

-- Create index for faster filtering
CREATE INDEX idx_workers_current_level ON workers(current_level);

-- Update existing workers to their calculated level based on assessments
-- This will be done via a separate update script after deployment

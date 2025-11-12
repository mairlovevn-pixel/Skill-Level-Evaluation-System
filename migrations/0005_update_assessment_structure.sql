-- Add is_satisfied and process_id columns to supervisor_assessments
-- Drop level column as it will be calculated from assessment results

-- Add new columns
ALTER TABLE supervisor_assessments ADD COLUMN is_satisfied INTEGER DEFAULT 1;
ALTER TABLE supervisor_assessments ADD COLUMN process_id INTEGER;

-- Drop level column (will be calculated dynamically)
-- Note: SQLite doesn't support DROP COLUMN directly, so we'll keep it for now
-- It can be ignored in queries

-- Add foreign key index for process_id
CREATE INDEX IF NOT EXISTS idx_supervisor_assessments_process ON supervisor_assessments(process_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assessments_worker_process ON supervisor_assessments(worker_id, process_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assessments_date ON supervisor_assessments(assessment_date);

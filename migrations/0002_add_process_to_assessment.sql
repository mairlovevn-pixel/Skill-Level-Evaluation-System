-- Add process_id to supervisor_assessment_items table
ALTER TABLE supervisor_assessment_items ADD COLUMN process_id INTEGER REFERENCES processes(id);

-- Create index for process_id
CREATE INDEX IF NOT EXISTS idx_assessment_items_process_id ON supervisor_assessment_items(process_id);

-- 0007: Rename all 'process' terminology to 'position' for consistency

-- Simply rename the table
ALTER TABLE processes RENAME TO positions;

-- Note: Foreign key column names (process_id) will remain as is in the existing tables
-- We'll handle the renaming in the application code for compatibility

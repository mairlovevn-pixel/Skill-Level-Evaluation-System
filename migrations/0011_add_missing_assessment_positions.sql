-- Add missing positions for complete Assessment coverage (58 positions total)
-- This migration adds positions that are not yet in the database

-- MATERIAL HANDLING (BLACK TOWER)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('MATERIAL HANDLING', 'Material handling operations', CURRENT_TIMESTAMP);

-- PRE ASSEMBLY (INTERNAL MOUNTING)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('PRE ASSEMBLY', 'Pre assembly operations', CURRENT_TIMESTAMP);

-- MATERIAL HANDLER-IM (INTERNAL MOUNTING)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('MATERIAL HANDLER-IM', 'Material handler for internal mounting', CURRENT_TIMESTAMP);

-- QC INSPECTOR-IM FINAL (QIF) (QM)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('QC INSPECTOR-IM FINAL (QIF)', 'QC Inspector for IM final inspection', CURRENT_TIMESTAMP);

-- TRANSPORTATION (TRANSPORTATION)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('TRANSPORTATION', 'Transportation operations', CURRENT_TIMESTAMP);

-- WAREHOUSE-KITSET (WAREHOUSE)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('WAREHOUSE-KITSET', 'Warehouse kitset operations', CURRENT_TIMESTAMP);

-- EHS (LEAN)
INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('EHS', 'Environment, Health and Safety', CURRENT_TIMESTAMP);

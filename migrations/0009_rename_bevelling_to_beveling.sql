-- Rename BEVELLING to BEVELING for consistency
-- This updates the position name to match the common spelling

UPDATE positions 
SET name = 'BEVELING' 
WHERE name = 'BEVELLING';

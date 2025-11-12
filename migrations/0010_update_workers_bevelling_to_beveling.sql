-- Update workers table: BEVELLING -> BEVELING
-- Fix spelling in all worker records

UPDATE workers 
SET position = 'BEVELING' 
WHERE position = 'BEVELLING';

-- Remove positions that are not in the standard 58 position list

-- Remove duplicate/wrong QC Inspector entry
DELETE FROM positions WHERE name = 'QC INSPECTOR - BT MT/PT(QBLACK TOWER)';

-- Remove TEQ (not in the final list)
DELETE FROM positions WHERE name = 'TEQ';

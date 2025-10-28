-- Generate comprehensive test assessment data for all workers
-- This script creates realistic assessment data for dashboard testing

-- First, let's see what we're working with
SELECT '=== Workers Summary ===' as info;
SELECT entity, COUNT(*) as count FROM workers GROUP BY entity;

SELECT '=== Assessment Items Summary ===' as info;
SELECT category, COUNT(*) as count FROM supervisor_assessment_items GROUP BY category;

-- Delete existing assessments (clean slate for testing)
DELETE FROM supervisor_assessments;

SELECT '=== Generating Test Assessments ===' as info;

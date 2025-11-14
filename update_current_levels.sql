-- Update current_level for all workers based on their assessment results
-- This is a one-time update after adding the current_level column

-- Update workers who have Level 4 (all Level2, Level3, Level4 items satisfied)
UPDATE workers SET current_level = 4
WHERE id IN (
  SELECT DISTINCT w.id
  FROM workers w
  WHERE (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2') AND sa.level >= 2
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  )
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3') AND sa.level >= 3
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3')
  )
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level4', 'Level 4')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level4', 'Level 4') AND sa.level >= 4
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level4', 'Level 4')
  )
);

-- Update workers who have Level 3 (all Level2, Level3 items satisfied)
UPDATE workers SET current_level = 3
WHERE current_level = 1
AND id IN (
  SELECT DISTINCT w.id
  FROM workers w
  WHERE (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2') AND sa.level >= 2
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  )
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3') AND sa.level >= 3
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level3', 'Level 3')
  )
);

-- Update workers who have Level 2 (all Level2 items satisfied)
UPDATE workers SET current_level = 2
WHERE current_level = 1
AND id IN (
  SELECT DISTINCT w.id
  FROM workers w
  WHERE (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  ) > 0
  AND (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2') AND sa.level >= 2
  ) = (
    SELECT COUNT(DISTINCT sai.id) FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = w.id AND sai.category IN ('Level2', 'Level 2')
  )
);

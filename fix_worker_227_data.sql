-- Worker 227 (Employee ID 1412 - Bùi Trọng Ngãi) 데이터 수정
-- Level 3의 FALSE 항목들 (4개)
UPDATE supervisor_assessments
SET is_satisfied = 0, level = 1
WHERE worker_id = 227
  AND item_id IN (
    SELECT sai.id 
    FROM supervisor_assessment_items sai
    WHERE sai.category IN ('Level3', 'Level 3')
      AND sai.item_name IN (
        'Follow the instructions regarding on-hold products and inform the Operator at the previous process step.',
        'Understand the work process of the previous step and exchange information during production.',
        'Report defects to the QC and Supervisor with the knowledge of where to report any defects (Tablet record).',
        'Notify a Supervisor if you see a defect in the work of a colleague.'
      )
  );

-- Level 4의 FALSE 항목들 (7개)
UPDATE supervisor_assessments
SET is_satisfied = 0, level = 1
WHERE worker_id = 227
  AND item_id IN (
    SELECT sai.id 
    FROM supervisor_assessment_items sai
    WHERE sai.category IN ('Level4', 'Level 4')
      AND sai.item_name IN (
        'Perform other similar work in the group with the same quality standard if requested.',
        'Operate the NG product separator (machine, conveyor).',
        'Make suggestions to improve the work process in the group (5S, Kaizen).',
        'Understand other processing methods of the same product (Different Modules).',
        'Guide colleagues at different processing steps.',
        'Understand basic quality inspection methods (Pass/fail).',
        'Check inventory and report to the supervisor (Follow up Order Book).'
      )
  );

-- 검증 쿼리: 수정 후 현황 확인
SELECT 
  sai.category,
  sai.item_name,
  sa.is_satisfied,
  sa.level,
  sa.assessment_date
FROM supervisor_assessments sa
JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
WHERE sa.worker_id = 227
ORDER BY 
  CASE sai.category 
    WHEN 'Level2' THEN 1 
    WHEN 'Level 2' THEN 1 
    WHEN 'Level3' THEN 2 
    WHEN 'Level 3' THEN 2 
    WHEN 'Level4' THEN 3 
    WHEN 'Level 4' THEN 3 
    ELSE 4 
  END,
  sai.item_name;

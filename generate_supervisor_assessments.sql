-- Supervisor Assessment 가상 평가 데이터 생성
-- Written Test 점수에 따라 Level 차등 부여
-- 레벨 기준:
--   85점 이상: Level 4 (최상위)
--   70-84점: Level 3 (상위)
--   60-69점: Level 2 (중위)

-- 먼저 기존 supervisor_assessments 데이터 삭제
DELETE FROM supervisor_assessments;

-- Level 4 (85점 이상) - 13명
-- 점수 순: 91.2, 88.6, 86.3, 85.5, 85.4, 85.3, 85.1, 84.9, 84.2, 83.4, 82.8, 82.1, 81.7
INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, comments) 
SELECT 
    wtr.worker_id,
    (SELECT id FROM supervisor_assessment_items WHERE category = 'Level4' ORDER BY id LIMIT 1),
    4,
    'Supervisor Kim',
    'Excellent performance with strong technical skills'
FROM written_test_results wtr
WHERE wtr.score >= 85 AND wtr.passed = 1;

-- Level 3 (70-84점) - 19명
INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, comments)
SELECT 
    wtr.worker_id,
    (SELECT id FROM supervisor_assessment_items WHERE category = 'Level3' ORDER BY id LIMIT 1),
    3,
    'Supervisor Lee',
    'Good performance with competent skills'
FROM written_test_results wtr
WHERE wtr.score >= 70 AND wtr.score < 85 AND wtr.passed = 1;

-- Level 2 (60-69점) - 16명
INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, comments)
SELECT 
    wtr.worker_id,
    (SELECT id FROM supervisor_assessment_items WHERE category = 'Level2' ORDER BY id LIMIT 1),
    2,
    'Supervisor Park',
    'Satisfactory performance, needs improvement'
FROM written_test_results wtr
WHERE wtr.score >= 60 AND wtr.score < 70 AND wtr.passed = 1;

-- 총 48명 평가 (모든 합격자)
-- Level 4: 13명 (27.1%)
-- Level 3: 19명 (39.6%)
-- Level 2: 16명 (33.3%)
